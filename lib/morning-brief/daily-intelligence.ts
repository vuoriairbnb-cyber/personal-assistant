import "server-only";
import { requireApprovedUser } from "@/lib/auth/guard";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { fetchWithTimeout } from "./request-timeout";
import { LIVE_AI_TIMEOUT_MS } from "./sources/config";
import { MORNING_BRIEF_MODELS, assertMorningBriefGenerativeModel } from "./ai-models";
import { getMarketPulse } from "./market-pulse";
import { IMPORT_CLASSIFICATION_VERSION } from "./classification-contract";
import { DAILY_INTELLIGENCE_RESPONSE_SCHEMA, DAILY_INTELLIGENCE_SYSTEM_PROMPT, DAILY_INTELLIGENCE_VERSION, assertSafeDailyIntelligenceInput, buildDailyIntelligenceInput, dailyIntelligencePromptInput, parseDailyIntelligenceOutput, type DailyIntelligence, type DailyIntelligenceInput } from "./daily-intelligence-contract";
import { resolveDailyIntelligenceFlow } from "./daily-intelligence-flow";

type DailyResult = { state: "ready" | "stale"; intelligence: DailyIntelligence | null };
const inFlight = new Map<string, Promise<DailyIntelligence>>();

async function loadDailyInput(userId: string): Promise<DailyIntelligenceInput | null> {
  const db = createServiceSupabaseClient();
  const { data: brief, error: briefError } = await db.from("morning_briefs").select("*").eq("user_id", userId).eq("status", "ready").order("brief_date", { ascending: false }).order("brief_version", { ascending: false }).limit(1).maybeSingle();
  if (briefError || !brief) return null;
  const { data: items, error: itemsError } = await db.from("morning_brief_items").select("*").eq("brief_id", brief.id).order("section").order("rank");
  if (itemsError || !items?.length) return null;
  const clusterIds = [...new Set(items.map((item) => item.story_cluster_id).filter((id): id is string => Boolean(id)))];
  const { data: clusters } = await db.from("morning_brief_story_clusters").select("*").in("id", clusterIds);
  const clusterMap = new Map((clusters ?? []).map((cluster) => [cluster.id, cluster]));
  const { data: links } = await db.from("morning_brief_cluster_articles").select("cluster_id,article_id").in("cluster_id", clusterIds);
  const articleIds = [...new Set((links ?? []).map((link) => link.article_id))];
  const [{ data: articles }, { data: sources }, { data: classifications }, { data: assets }, { data: exposures }, { data: preferences }, { data: learned }, marketQuotes] = await Promise.all([
    db.from("morning_brief_articles").select("id,source_id,title,excerpt,body_text,content_hash").in("id", articleIds),
    db.from("morning_brief_sources").select("id,name"),
    db.from("morning_brief_article_classifications").select("article_id,classification_version,summary,why_it_matters,topics,categories,countries,sectors").in("article_id", articleIds).eq("classification_version", brief.classification_version ?? IMPORT_CLASSIFICATION_VERSION),
    db.from("morning_brief_portfolio_assets").select("id,name,priority").eq("user_id", userId).eq("active", true),
    db.from("morning_brief_portfolio_exposures").select("portfolio_asset_id,exposure_type,exposure_key,relevance_strength").eq("user_id", userId),
    db.from("morning_brief_user_preferences").select("dimension_type,dimension_key,explicit_weight,pinned").eq("user_id", userId),
    db.from("morning_brief_learned_interests").select("dimension_type,dimension_key,affinity_score").eq("user_id", userId),
    getMarketPulse(),
  ]);
  const articleMap = new Map((articles ?? []).map((article) => [article.id, article])); const sourceMap = new Map((sources ?? []).map((source) => [source.id, source.name]));
  const classificationsByArticle = new Map((classifications ?? []).map((classification) => [classification.article_id, classification]));
  const articleIdsByCluster = new Map<string, string[]>(); for (const link of links ?? []) articleIdsByCluster.set(link.cluster_id, [...(articleIdsByCluster.get(link.cluster_id) ?? []), link.article_id]);
  const assetMap = new Map((assets ?? []).map((asset) => [asset.id, asset]));
  const stories = items.flatMap((item) => {
    const cluster = item.story_cluster_id ? clusterMap.get(item.story_cluster_id) : null; if (!cluster) return [];
    const clusterArticleIds = articleIdsByCluster.get(cluster.id) ?? []; const covered = clusterArticleIds.map((id) => articleMap.get(id)).filter((article): article is NonNullable<typeof articles>[number] => Boolean(article));
    const primary = cluster.primary_article_id ? articleMap.get(cluster.primary_article_id) : covered[0]; if (!primary) return [];
    const classification = classificationsByArticle.get(primary.id);
    return [{ clusterId: cluster.id, section: item.section, rank: item.rank, headline: cluster.canonical_headline ?? primary.title, summary: cluster.canonical_summary ?? classification?.summary ?? primary.excerpt, sources: covered.map((article) => sourceMap.get(article.source_id) ?? "Public source"), contentHashes: covered.map((article) => article.content_hash ?? ""), classification: classification ? { version: classification.classification_version, summary: classification.summary, whyItMatters: classification.why_it_matters, topics: classification.topics, categories: classification.categories, countries: classification.countries, sectors: classification.sectors } : null }];
  });
  const market = marketQuotes.map((quote) => ({ symbol: quote.symbol, label: quote.label, value: quote.value, percentChange: quote.percentChange, direction: quote.percentChange > 0 ? "up" as const : quote.percentChange < 0 ? "down" as const : "flat" as const, asOf: quote.asOf, status: quote.status }));
  return buildDailyIntelligenceInput({
    brief: { id: brief.id, date: brief.brief_date, version: brief.brief_version, algorithmVersion: brief.algorithm_version, classificationVersion: brief.classification_version }, stories,
    personalization: { portfolioLenses: [...assetMap.values()].map((asset) => ({ name: asset.name, priority: asset.priority, exposures: (exposures ?? []).filter((exposure) => exposure.portfolio_asset_id === asset.id).map((exposure) => ({ type: exposure.exposure_type, key: exposure.exposure_key, strength: exposure.relevance_strength })) })), preferences: (preferences ?? []).map((preference) => ({ type: preference.dimension_type, key: preference.dimension_key, weight: preference.explicit_weight, pinned: preference.pinned })), learnedInterests: (learned ?? []).map((interest) => ({ type: interest.dimension_type, key: interest.dimension_key, affinity: interest.affinity_score })) }, market,
  });
}

const fromRow = (row: { executive_summary_json: string[]; main_themes_json: Array<{ title: string; explanation: string }>; why_this_matters_json: string[]; watch_next_json: string[]; evidence_note: string | null; generated_at: string; generation_version: string }): DailyIntelligence => ({ executiveSummary: row.executive_summary_json, mainThemes: row.main_themes_json, whyThisMatters: row.why_this_matters_json, watchNext: row.watch_next_json, evidenceNote: row.evidence_note, generatedAt: row.generated_at, generationVersion: row.generation_version });

async function synthesize(input: DailyIntelligenceInput): Promise<DailyIntelligence> {
  const apiKey = process.env.OPENAI_API_KEY; if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const model = assertMorningBriefGenerativeModel(MORNING_BRIEF_MODELS.advanced);
  const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: [{ role: "system", content: DAILY_INTELLIGENCE_SYSTEM_PROMPT }, { role: "user", content: JSON.stringify(dailyIntelligencePromptInput(input)) }], response_format: { type: "json_schema", json_schema: DAILY_INTELLIGENCE_RESPONSE_SCHEMA } }) }, LIVE_AI_TIMEOUT_MS);
  if (!response.ok) throw new Error(`Daily Intelligence unavailable (${response.status}).`);
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> }; const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("Daily Intelligence returned no structured content.");
  return { ...parseDailyIntelligenceOutput(JSON.parse(content)), generatedAt: new Date().toISOString(), generationVersion: DAILY_INTELLIGENCE_VERSION };
}

async function resolve(userId: string, generate: boolean): Promise<DailyResult> {
  return resolveDailyIntelligenceFlow(userId, generate, {
    loadInput: async (currentUserId) => { const input = await loadDailyInput(currentUserId); if (input) assertSafeDailyIntelligenceInput(input); return input; },
    readCache: async (currentUserId, input) => { const db = createServiceSupabaseClient(); const { data: cached } = await db.from("morning_brief_daily_intelligence").select("*").eq("user_id", currentUserId).eq("morning_brief_id", input.brief.id).eq("generation_version", DAILY_INTELLIGENCE_VERSION).maybeSingle(); return cached ? { userId: cached.user_id, inputHash: cached.input_hash, generationVersion: cached.generation_version, intelligence: fromRow(cached) } : null; },
    synthesize,
    persist: async (record, input) => { const db = createServiceSupabaseClient(); const intelligence = record.intelligence; const { data: persisted, error } = await db.from("morning_brief_daily_intelligence").upsert({ user_id: record.userId, morning_brief_id: input.brief.id, input_hash: record.inputHash, generation_version: record.generationVersion, executive_summary_json: intelligence.executiveSummary, main_themes_json: intelligence.mainThemes, why_this_matters_json: intelligence.whyThisMatters, watch_next_json: intelligence.watchNext, evidence_note: intelligence.evidenceNote, generated_at: intelligence.generatedAt }, { onConflict: "user_id,morning_brief_id,generation_version" }).select("*").single(); if (error || !persisted) throw error ?? new Error("Daily Intelligence persistence failed."); return { userId: persisted.user_id, inputHash: persisted.input_hash, generationVersion: persisted.generation_version, intelligence: fromRow(persisted) }; },
  });
}

/** Read-only dashboard lookup: it never calls Terra. */
export async function getDailyIntelligenceForCurrentUser() { const { user } = await requireApprovedUser(); return resolve(user.id, false); }
/** Explicit user action only. Per-process coalescing prevents duplicate paid calls. */
export async function generateDailyIntelligenceForCurrentUser() { const { user } = await requireApprovedUser(); const task = inFlight.get(user.id) ?? resolve(user.id, true).then((result) => { if (!result.intelligence) throw new Error("Morning Brief is not ready."); return result.intelligence; }).finally(() => inFlight.delete(user.id)); inFlight.set(user.id, task); return task; }
