import "server-only";
import { createHash } from "node:crypto";
import { INITIAL_PORTFOLIO_LENSES } from "./portfolio-lenses";
import { MOCK_CORPUS_NOW, MOCK_NEWS_CORPUS } from "./mock-corpus";
import { clusterArticles, type RankedStoryCluster } from "./clustering";
import { selectSectionFeed } from "./selection";
import { rankStoriesWithLearnedProfile, type LearnedInterest, type LearnableDimension } from "./learning";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { ensureArticleEmbeddings } from "./embeddings";
import { loadUserSemanticProfile } from "./semantic-profile";
import { likedSimilarityFromProfile } from "./semantic";
import { dailyBriefGenerationRecord, persistsDeterministicStoryBriefings, type MorningBriefGenerationMode } from "./generation-contract";
import { loadLiveMorningBriefCandidates } from "./live-candidates";

const mockUrl = (source: string, id: string) => `https://mock.local/${source.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/${id}`;
const stableUuid = (value: string) => { const hash = createHash("sha256").update(value).digest("hex"); return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`; };
const helsinkiDate = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const preferenceDefaults: Array<{ dimensionType: "country" | "topic"; key: string; weight: number }> = [
  { dimensionType: "country", key: "vietnam", weight: 100 }, { dimensionType: "topic", key: "pyn", weight: 100 }, { dimensionType: "topic", key: "emerging frontier", weight: 95 }, { dimensionType: "topic", key: "nordic credit", weight: 95 }, { dimensionType: "topic", key: "european high yield", weight: 95 }, { dimensionType: "topic", key: "secured loans", weight: 95 }, { dimensionType: "topic", key: "finland business", weight: 90 }, { dimensionType: "topic", key: "finland politics", weight: 90 }, { dimensionType: "topic", key: "venture capital", weight: 85 }, { dimensionType: "topic", key: "private equity", weight: 85 }, { dimensionType: "topic", key: "markets macro", weight: 85 }, { dimensionType: "topic", key: "geopolitics", weight: 75 }, { dimensionType: "topic", key: "world business", weight: 75 },
];
export type { MorningBriefGenerationMode } from "./generation-contract";
export type MorningBriefGenerationOptions = { mode: MorningBriefGenerationMode; now?: Date };

export async function ensureMorningBriefProfile(userId: string) {
  const db = createServiceSupabaseClient();
  for (const lens of INITIAL_PORTFOLIO_LENSES) {
    const { data, error } = await db.from("morning_brief_portfolio_assets").upsert({ user_id: userId, name: lens.name, slug: lens.slug, asset_type: lens.assetType, priority: lens.priority, metadata_json: { bootstrap: "morning-brief-v1" } }, { onConflict: "user_id,slug" }).select("id").single();
    if (error || !data) throw error ?? new Error("Portfolio bootstrap failed");
    const rows = lens.exposures.map((exposure) => ({ user_id: userId, portfolio_asset_id: data.id, exposure_type: exposure.exposureType, exposure_key: exposure.exposureKey, relevance_strength: exposure.relevanceStrength, metadata_json: { bootstrap: "morning-brief-v1" } }));
    const { error: exposureError } = await db.from("morning_brief_portfolio_exposures").upsert(rows, { onConflict: "portfolio_asset_id,exposure_type,exposure_key", ignoreDuplicates: true }); if (exposureError) throw exposureError;
  }
  const defaults = preferenceDefaults.map((preference) => ({ user_id: userId, dimension_type: preference.dimensionType, dimension_key: preference.key, explicit_weight: preference.weight, pinned: true, metadata_json: { bootstrap: "morning-brief-v1" } }));
  const { error } = await db.from("morning_brief_user_preferences").upsert(defaults, { onConflict: "user_id,dimension_type,dimension_key", ignoreDuplicates: true }); if (error) throw error;
}

function briefing(story: RankedStoryCluster, articleIds: string[], mode: MorningBriefGenerationMode) { return { paragraphs_json: [story.summary, `${mode === "mock" ? "This is a synthetic development briefing" : "This is a live-source briefing"} for ${story.headline}.`], why_it_matters: story.score.reasons[0] ?? "This development is included because of its Morning Brief relevance.", key_takeaways_json: [story.summary, ...story.score.portfolioMatches.slice(0, 2).map((match) => match.reason)], exposure_path_json: story.score.portfolioMatches.map((match) => match.lens), generated_from_article_ids: articleIds, generation_version: mode === "mock" ? "mock-briefing-v1" : "live-briefing-v1" }; }

async function loadRealCandidates(userId: string, now: Date) {
  const loaded = await loadLiveMorningBriefCandidates(userId, now);
  return { candidates: loaded.candidates.map((candidate) => candidate.article), liveCandidateCount: loaded.liveCandidateCount, importedCandidateCount: loaded.importedCandidateCount };
}

/** Explicit generation modes keep production candidate selection free of synthetic fixtures. */
export async function generateMorningBriefForUser(userId: string, { mode, now = new Date() }: MorningBriefGenerationOptions) {
  const db = createServiceSupabaseClient(); await ensureMorningBriefProfile(userId);
  const real = await loadRealCandidates(userId, now);
  const articleId = new Map<string, string>();
  let mockSourceCount = 0; let mockArticleCount = 0;
  if (mode === "mock") {
  const sourceNames = [...new Set(MOCK_NEWS_CORPUS.map((article) => article.source))];
  const sourceRows = sourceNames.map((name) => ({ slug: `mock-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`, name: `Mock: ${name}`, source_type: name === "Official Institution" ? "official" as const : "manual" as const, enabled: true, default_language: "en", metadata_json: { development_mock: true } }));
  const { data: sources, error: sourceError } = await db.from("morning_brief_sources").upsert(sourceRows, { onConflict: "slug" }).select("id,slug,name"); if (sourceError || !sources) throw sourceError ?? new Error("Mock sources unavailable");
  mockSourceCount = sources.length;
  const sourceId = new Map(sources.map((source) => [source.name.replace(/^Mock: /, ""), source.id]));
  const articles = MOCK_NEWS_CORPUS.map((article) => ({ id: stableUuid(`mock-article:${article.id}`), source_id: sourceId.get(article.source)!, source_article_id: article.id, title: article.title, excerpt: article.summary, canonical_url: article.canonicalUrl ?? mockUrl(article.source, article.id), published_at: article.publishedAt, language: "en", content_type: article.contentType, access_type: "unknown" as const, image_url: article.imageUrl ?? null, image_alt: article.imageAlt ?? null, image_source: article.imageSource ?? null, raw_metadata_json: { development_mock: true, event_key: article.eventKey ?? null } }));
  mockArticleCount = articles.length;
  const { error: articleError } = await db.from("morning_brief_articles").upsert(articles, { onConflict: "source_id,source_article_id" }); if (articleError) throw articleError;
  for (const article of articles) articleId.set(article.source_article_id!, article.id);
  const classifications = MOCK_NEWS_CORPUS.map((article) => ({ article_id: articleId.get(article.id)!, countries: article.countries, regions: article.regions, categories: article.categories, topics: article.topics, sectors: article.sectors, companies: article.companies, event_type: article.eventType ?? null, significance: article.significance, consequence: article.consequence, scope: article.scope, primary_section: article.primarySection, summary: article.summary, classification_version: "mock-classifier-v1" }));
  const { error: classError } = await db.from("morning_brief_article_classifications").upsert(classifications, { onConflict: "article_id,classification_version" }); if (classError) throw classError;
  }
  for (const candidate of real.candidates) articleId.set(candidate.id, candidate.id);
  const clusteredStories = clusterArticles(mode === "mock" ? [...MOCK_NEWS_CORPUS, ...real.candidates] : real.candidates, now);
  const { data: learnedRows, error: learnedError } = await db.from("morning_brief_learned_interests").select("dimension_type,dimension_key,affinity_score,last_signal_at").eq("user_id", userId); if (learnedError) throw learnedError;
  const learnedProfile: LearnedInterest[] = (learnedRows ?? []).map((row) => ({ dimensionType: row.dimension_type as LearnableDimension, dimensionKey: row.dimension_key, affinityScore: row.affinity_score, lastSignalAt: row.last_signal_at ?? now.toISOString() }));
  // Only the top base candidates are embedded on demand; this avoids embedding the full mock corpus.
  const semanticCandidates = clusteredStories.slice(0, 30); const candidateDbIds = semanticCandidates.map((story) => articleId.get(story.primaryArticleId)!).filter(Boolean);
  const candidateVectors = await ensureArticleEmbeddings(candidateDbIds); const semanticProfile = await loadUserSemanticProfile(userId, now);
  const semanticScores = new Map<string, { likedSimilarity: number; seedCount: number; confidence: number }>();
  for (const story of semanticCandidates) { const vector = candidateVectors.get(articleId.get(story.primaryArticleId)!); const score = likedSimilarityFromProfile(semanticProfile, vector ?? null); semanticScores.set(story.article.id, { likedSimilarity: score.likedSimilarity, seedCount: semanticProfile?.seedCount ?? 0, confidence: score.confidence }); }
  const stories = rankStoriesWithLearnedProfile(clusteredStories, learnedProfile, now, semanticScores);
  const persisted = stories.map((story) => ({ story, id: stableUuid(`mock-cluster:${story.articleIds.join("|")}`) }));
  const { error: clusterError } = await db.from("morning_brief_story_clusters").upsert(persisted.map(({ story, id }) => ({ id, primary_article_id: articleId.get(story.primaryArticleId)!, canonical_headline: story.headline, canonical_summary: story.summary, event_key: story.article.eventKey ?? null, display_image_url: story.displayImageUrl ?? null, display_image_alt: story.displayImageAlt ?? null, display_image_source: story.displayImageSource ?? null, first_published_at: story.firstPublishedAt, latest_published_at: story.latestPublishedAt, source_count: story.sourceCount, cluster_version: "clustering-v1" }))); if (clusterError) throw clusterError;
  const links = persisted.flatMap(({ story, id }) => story.relatedCoverage.map((coverage, index) => ({ cluster_id: id, article_id: articleId.get(coverage.articleId)!, relation_type: coverage.relationType, source_priority: index + 1 }))); await db.from("morning_brief_cluster_articles").upsert(links, { onConflict: "cluster_id,article_id" });
  await db.from("morning_brief_scores").delete().eq("user_id", userId).in("story_cluster_id", persisted.map((item) => item.id));
  const scores = persisted.map(({ story, id }) => ({ user_id: userId, story_cluster_id: id, final_score: Math.round(story.score.finalScore), portfolio_relevance: Math.round(story.score.portfolioRelevance), learned_preference: Math.round(story.score.learnedPreference), importance_score: Math.round(story.score.importanceScore), explicit_interest: Math.round(story.score.explicitInterest), freshness_score: Math.round(story.score.freshnessScore), source_fit: Math.round(story.score.sourceFit), liked_similarity: Math.round(story.score.likedSimilarity), novelty_score: Math.round(story.score.noveltyScore), exploration_score: Math.round(story.score.explorationScore), score_explanation_json: { reasons: story.score.reasons, semantic_seed_count: semanticProfile?.seedCount ?? 0, semantic_confidence: semanticProfile?.confidence ?? 0 }, algorithm_version: "ranking-v1" })); await db.from("morning_brief_scores").insert(scores);
  const date = helsinkiDate(now); const { data: brief, error: briefError } = await db.from("morning_briefs").upsert(dailyBriefGenerationRecord(userId, date, now.toISOString(), mode, real.liveCandidateCount, real.importedCandidateCount), { onConflict: "user_id,brief_date,brief_version" }).select("id").single(); if (briefError || !brief) throw briefError ?? new Error("Brief persistence failed");
  await db.from("morning_brief_items").delete().eq("brief_id", brief.id);
  const sections = ["top_5", "vietnam", "credit", "finland", "markets", "politics", "emerging_frontier", "vc_pe", "world", "worth_reading"] as const;
  const byId = new Map(persisted.map((item) => [item.story.id, item])); const items = sections.flatMap((section) => selectSectionFeed(stories, section, section === "top_5" ? 5 : section === "worth_reading" ? 10 : 20).map((story, index) => ({ brief_id: brief.id, story_cluster_id: byId.get(story.id)!.id, article_id: articleId.get(story.primaryArticleId)!, section, rank: index + 1, score: Math.round(story.score.finalScore), score_explanation_json: { reasons: story.score.reasons } }))); await db.from("morning_brief_items").insert(items);
  // Live refresh must never synthesize or overwrite personalized Story Detail
  // briefings. Deterministic mock rows remain available for development only.
  if (persistsDeterministicStoryBriefings(mode)) for (const { story, id } of persisted) await db.from("morning_brief_story_briefings").upsert({ story_cluster_id: id, user_id: userId, input_hash: `mock:${story.id}`, evidence_note: "Development mock briefing.", ...briefing(story, story.articleIds.map((article) => articleId.get(article)!), mode) }, { onConflict: "story_cluster_id,user_id,generation_version" });
  return { briefId: brief.id, date, counts: { sources: mockSourceCount, articles: mockArticleCount + real.candidates.length, liveCandidates: real.liveCandidateCount, importedCandidates: real.importedCandidateCount, clusters: persisted.length, items: items.length } };
}

/** Compatibility helper for development fixtures and existing test callers. */
export function generateMockMorningBriefForUser(userId: string, now = MOCK_CORPUS_NOW) { return generateMorningBriefForUser(userId, { mode: "mock", now }); }
