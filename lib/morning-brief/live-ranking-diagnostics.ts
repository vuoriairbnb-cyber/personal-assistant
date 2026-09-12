import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { clusterArticles, type RankedStoryCluster } from "./clustering";
import { EMBEDDING_MODEL, EMBEDDING_VERSION, parseVector } from "./embeddings";
import { LIVE_MORNING_BRIEF_FRESHNESS_WINDOW_HOURS, loadLiveMorningBriefCandidates } from "./live-candidates";
import { rankStoriesWithLearnedProfile, type LearnedInterest, type LearnableDimension } from "./learning";
import { RANKING_VERSION } from "./ranking";
import { TOP_FIVE_CONFIG } from "./selection";
import { likedSimilarityFromProfile } from "./semantic";
import { loadUserSemanticProfile } from "./semantic-profile";
import { serializeDiagnosticStory, simulateDiagnosticFloor, type DiagnosticStory } from "./live-ranking-diagnostics-contract";

type Distribution = { min: number; p25: number; median: number; p75: number; max: number; average: number };
export type LiveRankingDiagnostic = { meta: { generatedAt: string; liveCandidateCount: number; mockExcludedCount: number; importedCandidateCount: number; freshnessWindowHours: number; currentTop5QualityFloor: number }; liveTop15: DiagnosticStory[]; distributions: { finalScore: Distribution; portfolioRelevance: Distribution & { buckets: { zero: number; oneTo24: number; twentyFiveTo49: number; fiftyTo74: number; seventyFiveTo100: number } }; importance: Distribution; explicitInterest: Distribution; significance: Distribution; consequence: Distribution; scope: Distribution }; floorSimulation: Array<{ floor: number; eligibleCountBeforeSelector: number; selected: Array<{ headline: string; source: string; finalScore: number }> }> };

const compact = (value: number) => Number(value.toFixed(2));
const distribution = (values: number[]): Distribution => { const sorted = [...values].sort((a, b) => a - b); const p = (fraction: number) => sorted[Math.floor((sorted.length - 1) * fraction)] ?? 0; return { min: compact(sorted[0] ?? 0), p25: compact(p(.25)), median: compact(p(.5)), p75: compact(p(.75)), max: compact(sorted.at(-1) ?? 0), average: compact(sorted.reduce((sum, value) => sum + value, 0) / Math.max(1, sorted.length)) }; };
const portfolioBuckets = (values: number[]) => ({ zero: values.filter((value) => value === 0).length, oneTo24: values.filter((value) => value >= 1 && value <= 24).length, twentyFiveTo49: values.filter((value) => value >= 25 && value <= 49).length, fiftyTo74: values.filter((value) => value >= 50 && value <= 74).length, seventyFiveTo100: values.filter((value) => value >= 75).length });
const byArticle = <T extends { article: { id: string } }>(items: T[]) => new Map(items.map((item) => [item.article.id, item]));

/** TEMPORARY: production-safe diagnostic. This function only performs SELECT queries and in-memory ranking. */
export async function buildLiveRankingDiagnostic(userId: string, now = new Date()): Promise<LiveRankingDiagnostic> {
  const loaded = await loadLiveMorningBriefCandidates(userId, now);
  const baseStories = clusterArticles(loaded.candidates.map((candidate) => candidate.article), now);
  const db = createServiceSupabaseClient();
  const { data: learnedRows, error: learnedError } = await db.from("morning_brief_learned_interests").select("dimension_type,dimension_key,affinity_score,last_signal_at").eq("user_id", userId);
  if (learnedError) throw learnedError;
  const learned: LearnedInterest[] = (learnedRows ?? []).map((row) => ({ dimensionType: row.dimension_type as LearnableDimension, dimensionKey: row.dimension_key, affinityScore: row.affinity_score, lastSignalAt: row.last_signal_at ?? now.toISOString() }));
  const primaryArticleIds = baseStories.slice(0, 30).map((story) => story.primaryArticleId);
  const { data: embeddingRows, error: embeddingError } = primaryArticleIds.length ? await db.from("morning_brief_article_embeddings").select("article_id,embedding,created_at").in("article_id", primaryArticleIds).eq("embedding_model", EMBEDDING_MODEL).eq("embedding_version", EMBEDDING_VERSION).order("created_at", { ascending: false }) : { data: [], error: null };
  if (embeddingError) throw embeddingError;
  const vectors = new Map<string, number[]>(); for (const row of embeddingRows ?? []) if (!vectors.has(row.article_id)) { const vector = parseVector(row.embedding); if (vector) vectors.set(row.article_id, vector); }
  const semanticProfile = await loadUserSemanticProfile(userId, now);
  const semanticScores = new Map<string, { likedSimilarity: number; seedCount: number; confidence: number }>();
  for (const story of baseStories.slice(0, 30)) { const semantic = likedSimilarityFromProfile(semanticProfile, vectors.get(story.primaryArticleId) ?? null); semanticScores.set(story.article.id, { likedSimilarity: semantic.likedSimilarity, seedCount: semanticProfile?.seedCount ?? 0, confidence: semantic.confidence }); }
  const stories = rankStoriesWithLearnedProfile(baseStories, learned, now, semanticScores);
  const classificationByArticle = byArticle(loaded.candidates);
  const scores = (selector: (story: RankedStoryCluster) => number) => stories.map(selector);
  return { meta: { generatedAt: now.toISOString(), liveCandidateCount: loaded.liveCandidateCount, mockExcludedCount: loaded.mockExcludedCount, importedCandidateCount: loaded.importedCandidateCount, freshnessWindowHours: LIVE_MORNING_BRIEF_FRESHNESS_WINDOW_HOURS, currentTop5QualityFloor: TOP_FIVE_CONFIG.qualityFloor }, liveTop15: stories.slice(0, 15).map((story) => serializeDiagnosticStory(story, classificationByArticle.get(story.article.id)?.classification)), distributions: { finalScore: distribution(scores((story) => story.score.finalScore)), portfolioRelevance: { ...distribution(scores((story) => story.score.portfolioRelevance)), buckets: portfolioBuckets(scores((story) => story.score.portfolioRelevance)) }, importance: distribution(scores((story) => story.score.importanceScore)), explicitInterest: distribution(scores((story) => story.score.explicitInterest)), significance: distribution(scores((story) => story.article.significance)), consequence: distribution(scores((story) => story.article.consequence)), scope: distribution(scores((story) => story.article.scope)) }, floorSimulation: [48, 46, 45, 44, 42, 40].map((floor) => simulateDiagnosticFloor(stories, floor)) };
}

export const LIVE_RANKING_DIAGNOSTIC_ALGORITHM_VERSION = RANKING_VERSION;
