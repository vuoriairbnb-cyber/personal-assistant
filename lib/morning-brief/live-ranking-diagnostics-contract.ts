import type { RankedStoryCluster } from "./clustering";
import type { LiveCandidateClassification } from "./live-candidates";
import { selectTopFive, TOP_FIVE_CONFIG } from "./selection";

export type DiagnosticStory = { headline: string; source: string; finalScore: number; ranking: { portfolioRelevance: number; learnedPreference: number; importance: number; explicitInterest: number; freshness: number; sourceFit: number; likedSimilarity: number; novelty: number; exploration: number }; classification: { topics: string[]; categories: string[]; countries: string[]; regions: string[]; sectors: string[]; eventType: string | null; assetClasses: string[]; significance: number; consequence: number; scope: number; confidence: number | null }; portfolio: { matchedLenses: string[]; matchedCausalRelations: string[]; mustConsider: boolean } };
const compact = (value: number) => Number(value.toFixed(2));

/** Deliberately serializes only the approved diagnostic fields. */
export function serializeDiagnosticStory(story: RankedStoryCluster, classification: LiveCandidateClassification | undefined): DiagnosticStory {
  return { headline: story.headline, source: story.article.source, finalScore: compact(story.score.finalScore), ranking: { portfolioRelevance: compact(story.score.portfolioRelevance), learnedPreference: compact(story.score.learnedPreference), importance: compact(story.score.importanceScore), explicitInterest: compact(story.score.explicitInterest), freshness: compact(story.score.freshnessScore), sourceFit: compact(story.score.sourceFit), likedSimilarity: compact(story.score.likedSimilarity), novelty: compact(story.score.noveltyScore), exploration: compact(story.score.explorationScore) }, classification: { topics: classification?.topics ?? [], categories: classification?.categories ?? [], countries: classification?.countries ?? [], regions: classification?.regions ?? [], sectors: classification?.sectors ?? [], eventType: classification?.eventType ?? null, assetClasses: classification?.assetClasses ?? [], significance: classification?.significance ?? story.article.significance, consequence: classification?.consequence ?? story.article.consequence, scope: classification?.scope ?? story.article.scope, confidence: classification?.confidence ?? null }, portfolio: { matchedLenses: story.score.portfolioMatches.map((match) => match.lens), matchedCausalRelations: story.score.portfolioMatches.filter((match) => match.causal).map((match) => match.reason), mustConsider: story.score.mustConsider } };
}

export function simulateDiagnosticFloor(stories: RankedStoryCluster[], floor: number) {
  const selection = selectTopFive(stories, { ...TOP_FIVE_CONFIG, qualityFloor: floor });
  return { floor, eligibleCountBeforeSelector: stories.filter((story) => story.score.finalScore >= floor).length, selected: selection.selected.map((entry) => ({ headline: entry.cluster.headline, source: entry.cluster.article.source, finalScore: compact(entry.cluster.score.finalScore) })) };
}
