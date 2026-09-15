import "server-only";
import { requireApprovedUser } from "@/lib/auth/guard";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { fetchWithTimeout } from "./request-timeout";
import { MORNING_BRIEF_MODELS, assertMorningBriefGenerativeModel } from "./ai-models";
import { getMarketPulse } from "./market-pulse";
import { IMPORT_CLASSIFICATION_VERSION } from "./classification-contract";
import { DAILY_INTELLIGENCE_RESPONSE_SCHEMA, DAILY_INTELLIGENCE_SYSTEM_PROMPT, DAILY_INTELLIGENCE_TIMEOUT_MS, DAILY_INTELLIGENCE_VERSION, assertSafeDailyIntelligenceInput, buildDailyIntelligenceInput, dailyIntelligencePromptInput, parseDailyIntelligenceOutput, type DailyIntelligence, type DailyIntelligenceInput } from "./daily-intelligence-contract";
import { resolveDailyIntelligenceFlow } from "./daily-intelligence-flow";

type DailyResult = { state: "ready" | "stale"; intelligence: DailyIntelligence | null };
const inFlight = new Map<string, Promise<DailyIntelligence>>();
const safeError = (error: unknown) => ({ name: error instanceof Error ? error.name : "UnknownError", message: error instanceof Error ? error.message.slice(0, 180) : "Unknown error", status: typeof error === "object" && error && "status" in error && typeof (error as { status?: unknown }).status === "number" ? (error as { status: number }).status : undefined });
const log = (event: string, details: Record<string, unknown> = {}) => console.info(`[daily-intelligence] ${event}`, details);

async function loadDailyInput(userId: string): Promise<DailyIntelligenceInput | null> {
  const db = createServiceSupabaseClient();
  const { data: brief, error: briefError } = await db.from("morning_briefs").select("*").eq("user_id", userId).eq("status", "ready").order("brief_date", { ascending: false }).order("brief_version", { ascending: false }).limit(1).maybeSingle();
  if (briefError) { log("brief lookup failed", safeError(briefError)); return null; }
  if (!brief) { log("brief unavailable"); return null; }
  log("brief loaded");
  const { data: items, error: itemsError } = await db.from("morning_brief_items").select("*").eq("brief_id", brief.id).order("section").order("rank");
  if (itemsError) { log("brief items lookup failed", safeError(itemsError)); return null; }
  if (!items?.length) { log("brief items unavailable"); return null; }
  const clusterIds = [...new Set(items.map((item) => item.story_cluster_id).filter((id): id is string => Boolean(id)))];
  const { data: clusters } = await db.from("morning_brief_story_clusters").select("*").in("id", clusterIds);
  const clusterMap = new Map((clusters ?? []).map((cluster) => [cluster.id, cluster]));
  const { data: links } = await db.from("morning_brief_cluster_articles").select("cluster_id,article_id").in("cluster_id", clusterIds);
  const articleIds = [...new Set((links ?? []).map((link) => link.article_id))];
  const [{ data: articles }, { data: sources }, { data: classifications }, { data: assets }, { data: exposures }, { data: preferences }, { data: learned }, { data: scores }, marketQuotes] = await Promise.all([
    db.from("morning_brief_articles").select("id,source_id,title,excerpt,body_text,content_hash").in("id", articleIds),
    db.from("morning_brief_sources").select("id,name"),
    db.from("morning_brief_article_classifications").select("article_id,classification_version,summary,why_it_matters,topics,categories,countries,sectors").in("article_id", articleIds).eq("classification_version", brief.classification_version ?? IMPORT_CLASSIFICATION_VERSION),
    db.from("morning_brief_portfolio_assets").select("id,name,priority").eq("user_id", userId).eq("active", true),
    db.from("morning_brief_portfolio_exposures").select("portfolio_asset_id,exposure_type,exposure_key,relevance_strength").eq("user_id", userId),
    db.from("morning_brief_user_preferences").select("dimension_type,dimension_key,explicit_weight,pinned").eq("user_id", userId),
    db.from("morning_brief_learned_interests").select("dimension_type,dimension_key,affinity_score").eq("user_id", userId),
    db.from("morning_brief_scores").select("story_cluster_id,portfolio_relevance,learned_preference,final_score,created_at").eq("user_id", userId).in("story_cluster_id", clusterIds).order("created_at", { ascending: false }),
    getMarketPulse(),
  ]);
  const articleMap = new Map((articles ?? []).map((article) => [article.id, article])); const sourceMap = new Map((sources ?? []).map((source) => [source.id, source.name]));
  const classificationsByArticle = new Map((classifications ?? []).map((classification) => [classification.article_id, classification]));
  const scoreByCluster = new Map<string, NonNullable<typeof scores>[number]>();
  for (const score of scores ?? []) {
    if (score.story_cluster_id && !scoreByCluster.has(score.story_cluster_id)) {
      scoreByCluster.set(score.story_cluster_id, score);
    }
  }
  const articleIdsByCluster = new Map<string, string[]>(); for (const link of links ?? []) articleIdsByCluster.set(link.cluster_id, [...(articleIdsByCluster.get(link.cluster_id) ?? []), link.article_id]);
  const assetMap = new Map((assets ?? []).map((asset) => [asset.id, asset]));
  const stories = items.flatMap((item) => {
    const cluster = item.story_cluster_id ? clusterMap.get(item.story_cluster_id) : null; if (!cluster) return [];
    const clusterArticleIds = articleIdsByCluster.get(cluster.id) ?? []; const covered = clusterArticleIds.map((id) => articleMap.get(id)).filter((article): article is NonNullable<typeof articles>[number] => Boolean(article));
    const primary = cluster.primary_article_id ? articleMap.get(cluster.primary_article_id) : covered[0]; if (!primary) return [];
    const classification = classificationsByArticle.get(primary.id);
    const score = scoreByCluster.get(cluster.id); return [{ clusterId: cluster.id, section: item.section, rank: item.rank, selectionPriority: (score?.portfolio_relevance ?? 0) * 2 + (score?.learned_preference ?? 0) + (score?.final_score ?? 0), headline: cluster.canonical_headline ?? primary.title, summary: cluster.canonical_summary ?? classification?.summary ?? primary.excerpt, sources: covered.map((article) => sourceMap.get(article.source_id) ?? "Public source"), contentHashes: covered.map((article) => article.content_hash ?? ""), classification: classification ? { version: classification.classification_version, summary: classification.summary, whyItMatters: classification.why_it_matters, topics: classification.topics, categories: classification.categories, countries: classification.countries, sectors: classification.sectors } : null }];
  });
  const market = marketQuotes.map((quote) => ({ symbol: quote.symbol, label: quote.label, value: quote.value, percentChange: quote.percentChange, direction: quote.percentChange > 0 ? "up" as const : quote.percentChange < 0 ? "down" as const : "flat" as const, asOf: quote.asOf, status: quote.status }));
  const input = buildDailyIntelligenceInput({
    brief: { id: brief.id, date: brief.brief_date, version: brief.brief_version, algorithmVersion: brief.algorithm_version, classificationVersion: brief.classification_version }, stories,
    personalization: { portfolioLenses: [...assetMap.values()].map((asset) => ({ name: asset.name, priority: asset.priority, exposures: (exposures ?? []).filter((exposure) => exposure.portfolio_asset_id === asset.id).map((exposure) => ({ type: exposure.exposure_type, key: exposure.exposure_key, strength: exposure.relevance_strength })) })), preferences: (preferences ?? []).map((preference) => ({ type: preference.dimension_type, key: preference.dimension_key, weight: preference.explicit_weight, pinned: preference.pinned })), learnedInterests: (learned ?? []).map((interest) => ({ type: interest.dimension_type, key: interest.dimension_key, affinity: interest.affinity_score })) }, market,
  });
  log("input built", { storyCount: input.stories.length, sourceCount: new Set(input.stories.flatMap((story) => story.sources)).size, marketCount: input.market.length, promptChars: JSON.stringify(dailyIntelligencePromptInput(input)).length });
  return input;
}

const fromRow = (row: { executive_summary_json: string[]; main_themes_json: Array<{ title: string; explanation: string }>; why_this_matters_json: string[]; watch_next_json: string[]; evidence_note: string | null; generated_at: string; generation_version: string }): DailyIntelligence => ({ executiveSummary: row.executive_summary_json, mainThemes: row.main_themes_json, whyThisMatters: row.why_this_matters_json, watchNext: row.watch_next_json, evidenceNote: row.evidence_note, generatedAt: row.generated_at, generationVersion: row.generation_version });

async function synthesize(input: DailyIntelligenceInput): Promise<DailyIntelligence> {
  const apiKey = process.env.OPENAI_API_KEY; if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const model = assertMorningBriefGenerativeModel(MORNING_BRIEF_MODELS.advanced);
  const startedAt = Date.now(); log("terra started", { storyCount: input.stories.length, timeoutMs: DAILY_INTELLIGENCE_TIMEOUT_MS });
  let response: Response;
  try { response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: [{ role: "system", content: DAILY_INTELLIGENCE_SYSTEM_PROMPT }, { role: "user", content: JSON.stringify(dailyIntelligencePromptInput(input)) }], response_format: { type: "json_schema", json_schema: DAILY_INTELLIGENCE_RESPONSE_SCHEMA } }) }, DAILY_INTELLIGENCE_TIMEOUT_MS); }
  catch (error) { console.warn("[daily-intelligence] terra request failed", { ...safeError(error), durationMs: Date.now() - startedAt }); throw error; }
  if (!response.ok) { console.warn("[daily-intelligence] terra response failed", { status: response.status, durationMs: Date.now() - startedAt }); throw new Error(`Daily Intelligence unavailable (${response.status}).`); }
  log("terra completed", { durationMs: Date.now() - startedAt });
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> }; const content = body.choices?.[0]?.message?.content;
  if (!content) { console.warn("[daily-intelligence] structured response missing content", { durationMs: Date.now() - startedAt }); throw new Error("Daily Intelligence returned no structured content."); }
  try { return { ...parseDailyIntelligenceOutput(JSON.parse(content)), generatedAt: new Date().toISOString(), generationVersion: DAILY_INTELLIGENCE_VERSION }; }
  catch (error) { console.warn("[daily-intelligence] validation failed", { ...safeError(error), durationMs: Date.now() - startedAt }); throw error; }
}

async function resolve(userId: string, generate: boolean): Promise<DailyResult> {
  return resolveDailyIntelligenceFlow(userId, generate, {
    loadInput: async (currentUserId) => { const input = await loadDailyInput(currentUserId); if (input) { assertSafeDailyIntelligenceInput(input); log("input safety check passed"); } return input; },
    readCache: async (currentUserId, input) => { const db = createServiceSupabaseClient(); const { data: cached, error } = await db.from("morning_brief_daily_intelligence").select("*").eq("user_id", currentUserId).eq("morning_brief_id", input.brief.id).eq("generation_version", DAILY_INTELLIGENCE_VERSION).maybeSingle(); if (error) log("cache lookup failed", safeError(error)); log(cached ? "cache candidate found" : "cache miss"); return cached ? { userId: cached.user_id, inputHash: cached.input_hash, generationVersion: cached.generation_version, intelligence: fromRow(cached) } : null; },
    synthesize,
    persist: async (record, input) => { const db = createServiceSupabaseClient(); const intelligence = record.intelligence; const { data: persisted, error } = await db.from("morning_brief_daily_intelligence").upsert({ user_id: record.userId, morning_brief_id: input.brief.id, input_hash: record.inputHash, generation_version: record.generationVersion, executive_summary_json: intelligence.executiveSummary, main_themes_json: intelligence.mainThemes, why_this_matters_json: intelligence.whyThisMatters, watch_next_json: intelligence.watchNext, evidence_note: intelligence.evidenceNote, generated_at: intelligence.generatedAt }, { onConflict: "user_id,morning_brief_id,generation_version" }).select("*").single(); if (error || !persisted) { console.warn("[daily-intelligence] persistence failed", safeError(error ?? new Error("Daily Intelligence persistence failed."))); throw error ?? new Error("Daily Intelligence persistence failed."); } log("persistence completed"); return { userId: persisted.user_id, inputHash: persisted.input_hash, generationVersion: persisted.generation_version, intelligence: fromRow(persisted) }; },
  });
}

/** Read-only dashboard lookup: it never calls Terra. */
export async function getDailyIntelligenceForCurrentUser() { const { user } = await requireApprovedUser(); return resolve(user.id, false); }
/** Explicit user action only. Per-process coalescing prevents duplicate paid calls. */
export async function generateDailyIntelligenceForCurrentUser() { const { user } = await requireApprovedUser(); const task = inFlight.get(user.id) ?? resolve(user.id, true).then((result) => { if (!result.intelligence) throw new Error("Morning Brief is not ready."); return result.intelligence; }).finally(() => inFlight.delete(user.id)); inFlight.set(user.id, task); return task; }
