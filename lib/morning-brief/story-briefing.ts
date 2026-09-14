import "server-only";
import { requireApprovedUser } from "@/lib/auth/guard";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { fetchWithTimeout } from "./request-timeout";
import { LIVE_AI_TIMEOUT_MS } from "./sources/config";
import { MORNING_BRIEF_MODELS, assertMorningBriefGenerativeModel } from "./ai-models";
import { IMPORT_CLASSIFICATION_VERSION } from "./classification-contract";
import { LIVE_STORY_BRIEFING_VERSION, STORY_BRIEFING_RESPONSE_SCHEMA, STORY_BRIEFING_SYSTEM_PROMPT, assertSafeStoryBriefingInput, buildStoryBriefingInput, isCurrentStoryBriefingCache, parseLiveStoryBriefingOutput, storyBriefingFromPersistedRow, storyBriefingInputHash, type StoryBriefingCoverage, type StoryBriefingInput } from "./story-briefing-contract";
import type { StoryBriefing } from "./types";
import type { StoryCoverage } from "@/components/morning-brief/mock-data";

type Result = { briefing: StoryBriefing; coverage: StoryCoverage[]; cache: "hit" | "generated" | "fallback" };
const inFlight = new Map<string, Promise<Result>>();
const label = (value: string) => `${Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 3_600_000))}h`;
const coverageType = (relation: string): StoryCoverage["contentType"] => relation === "analysis" ? "analysis" : relation === "local_perspective" ? "local-perspective" : "news";

async function loadInput(userId: string, storyId: string): Promise<{ input: StoryBriefingInput; coverage: StoryCoverage[] }> {
  const db = createServiceSupabaseClient();
  const { data: cluster, error: clusterError } = await db.from("morning_brief_story_clusters").select("*").eq("id", storyId).maybeSingle();
  if (clusterError || !cluster) throw clusterError ?? new Error("Story cluster unavailable.");
  const { data: links, error: linksError } = await db.from("morning_brief_cluster_articles").select("article_id,relation_type,source_priority").eq("cluster_id", storyId).order("source_priority");
  if (linksError || !links?.length) throw linksError ?? new Error("Story coverage unavailable.");
  const articleIds = links.map((item) => item.article_id);
  const [{ data: articles }, { data: sources }, { data: classifications }, { data: assets }, { data: exposures }, { data: preferences }, { data: learned }] = await Promise.all([
    db.from("morning_brief_articles").select("*").in("id", articleIds),
    db.from("morning_brief_sources").select("id,name"),
    db.from("morning_brief_article_classifications").select("*").in("article_id", articleIds).eq("classification_version", IMPORT_CLASSIFICATION_VERSION),
    db.from("morning_brief_portfolio_assets").select("id,name,priority").eq("user_id", userId).eq("active", true),
    db.from("morning_brief_portfolio_exposures").select("portfolio_asset_id,exposure_type,exposure_key,relevance_strength").eq("user_id", userId),
    db.from("morning_brief_user_preferences").select("dimension_type,dimension_key,explicit_weight,pinned").eq("user_id", userId),
    db.from("morning_brief_learned_interests").select("dimension_type,dimension_key,affinity_score").eq("user_id", userId),
  ]);
  const sourceMap = new Map((sources ?? []).map((item) => [item.id, item.name])); const articleMap = new Map((articles ?? []).map((item) => [item.id, item])); const classMap = new Map((classifications ?? []).map((item) => [item.article_id, item]));
  const evidence: StoryBriefingCoverage[] = links.map((link) => { const article = articleMap.get(link.article_id); if (!article) throw new Error("Story article unavailable."); const classification = classMap.get(article.id); return { articleId: article.id, source: sourceMap.get(article.source_id) ?? "Public source", title: article.title, publishedAt: article.published_at, canonicalUrl: article.canonical_url, accessType: article.access_type, excerpt: article.excerpt, publicText: article.access_type === "public" ? article.body_text : null, contentHash: article.content_hash, relationType: link.relation_type, classification: classification ? { version: classification.classification_version, summary: classification.summary, whyItMatters: classification.why_it_matters, topics: classification.topics, categories: classification.categories, countries: classification.countries, sectors: classification.sectors } : null }; });
  const assetMap = new Map((assets ?? []).map((asset) => [asset.id, asset]));
  const portfolioLenses = [...assetMap.values()].map((asset) => ({ name: asset.name, priority: asset.priority, exposures: (exposures ?? []).filter((item) => item.portfolio_asset_id === asset.id).map((item) => ({ type: item.exposure_type, key: item.exposure_key, strength: item.relevance_strength })) }));
  const input = buildStoryBriefingInput({ cluster: { id: cluster.id, headline: cluster.canonical_headline ?? evidence[0]!.title, summary: cluster.canonical_summary, eventKey: cluster.event_key, clusterVersion: cluster.cluster_version, sourceCount: cluster.source_count }, coverage: evidence, personalization: { portfolioLenses, preferences: (preferences ?? []).map((item) => ({ type: item.dimension_type, key: item.dimension_key, weight: item.explicit_weight, pinned: item.pinned })), learnedInterests: (learned ?? []).map((item) => ({ type: item.dimension_type, key: item.dimension_key, affinity: item.affinity_score })) } });
  assertSafeStoryBriefingInput(input);
  return { input, coverage: evidence.map((item) => ({ source: item.source, title: item.title, contentType: coverageType(item.relationType), publishedLabel: label(item.publishedAt), url: item.canonicalUrl })) };
}

function fallback(input: StoryBriefingInput): StoryBriefing {
  const primary = input.coverage[0]!; const summary = primary.classification?.summary ?? primary.excerpt ?? input.cluster.summary ?? "Only limited public source metadata is available for this story.";
  const topics = primary.classification?.topics ?? ["Limited public evidence available"];
  const takeaways = [...topics, "The available source evidence remains limited.", "Follow-up reporting may materially change the interpretation."].slice(0, 3);
  return { paragraphs: [summary], whyItMatters: primary.classification?.whyItMatters ?? "This story is included because it matches the current Morning Brief selection.", keyTakeaways: takeaways, evidenceNote: input.evidenceLimited ? "Source detail is limited to public metadata; no additional conclusions are inferred." : "This is a deterministic fallback while the intelligence briefing is unavailable.", generatedFromArticleIds: input.coverage.map((item) => item.articleId), generationVersion: "safe-fallback-v1" };
}

async function synthesize(input: StoryBriefingInput): Promise<StoryBriefing> {
  const apiKey = process.env.OPENAI_API_KEY; if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  // Story synthesis is intentionally a dedicated, high-value Terra use case.
  // It does not inherit classification routing or an environment-selected alias.
  const model = assertMorningBriefGenerativeModel(MORNING_BRIEF_MODELS.advanced);
  const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: [{ role: "system", content: STORY_BRIEFING_SYSTEM_PROMPT }, { role: "user", content: JSON.stringify(input) }], response_format: { type: "json_schema", json_schema: STORY_BRIEFING_RESPONSE_SCHEMA } }) }, LIVE_AI_TIMEOUT_MS);
  if (!response.ok) throw new Error(`Story briefing unavailable (${response.status}).`);
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> }; const content = body.choices?.[0]?.message?.content; if (!content) throw new Error("Story briefing returned no structured content.");
  const parsed = parseLiveStoryBriefingOutput(JSON.parse(content), { evidenceLimited: input.evidenceLimited }); return { paragraphs: parsed.briefing, whyItMatters: parsed.whyThisMatters, keyTakeaways: parsed.keyTakeaways, evidenceNote: parsed.evidenceNote ?? undefined, generatedFromArticleIds: input.coverage.map((item) => item.articleId), generationVersion: LIVE_STORY_BRIEFING_VERSION, generatedAt: new Date().toISOString() };
}

async function resolveStoryBriefing(userId: string, storyId: string): Promise<Result> {
  const { input, coverage } = await loadInput(userId, storyId); const hash = storyBriefingInputHash(input); const db = createServiceSupabaseClient();
  const { data: cached } = await db.from("morning_brief_story_briefings").select("*").eq("story_cluster_id", storyId).eq("user_id", userId).eq("generation_version", LIVE_STORY_BRIEFING_VERSION).maybeSingle();
  if (isCurrentStoryBriefingCache(cached ? { userId: cached.user_id, inputHash: cached.input_hash, generationVersion: cached.generation_version } : null, userId, hash)) return { briefing: storyBriefingFromPersistedRow(cached!), coverage, cache: "hit" };
  try {
    const briefing = await synthesize(input);
    const { data: persisted, error } = await db.from("morning_brief_story_briefings").upsert({ story_cluster_id: storyId, user_id: userId, input_hash: hash, paragraphs_json: briefing.paragraphs, why_it_matters: briefing.whyItMatters, key_takeaways_json: briefing.keyTakeaways, evidence_note: briefing.evidenceNote ?? null, generated_from_article_ids: briefing.generatedFromArticleIds ?? [], generation_version: LIVE_STORY_BRIEFING_VERSION, generated_at: briefing.generatedAt }, { onConflict: "story_cluster_id,user_id,generation_version" }).select("*").single();
    if (error || !persisted) throw error ?? new Error("Story briefing persistence failed."); return { briefing: storyBriefingFromPersistedRow(persisted), coverage, cache: "generated" };
  } catch { return { briefing: fallback(input), coverage, cache: "fallback" }; }
}

/** On-demand only: no refresh/listing call imports this module. Per-process coalescing avoids duplicate Terra work. */
export async function getLiveStoryBriefingForCurrentUser(storyId: string): Promise<Result> {
  const { user } = await requireApprovedUser(); const key = `${user.id}:${storyId}`; const existing = inFlight.get(key); if (existing) return existing;
  const task = resolveStoryBriefing(user.id, storyId).finally(() => inFlight.delete(key)); inFlight.set(key, task); return task;
}
