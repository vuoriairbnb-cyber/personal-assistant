import { scoreArticle, type RankingArticle } from "./ranking";
import type { RankedStoryCluster } from "./clustering";

export const LEARNING_VERSION = "learning-v1";
export const FEEDBACK_STRENGTH = { open: 0.2, like: 1, save: 0.3, import: 2, not_relevant: -1, show_fewer_like_this: -2 } as const;
export const DIMENSION_MULTIPLIER = { topic: 1, category: 0.95, country: 0.9, sector: 0.85, event_type: 0.75, asset_class: 0.7, region: 0.6, content_type: 0.45, source: 0.2 } as const;
export type LearnableDimension = keyof typeof DIMENSION_MULTIPLIER;
export type FeedbackEvent = { eventType: keyof typeof FEEDBACK_STRENGTH | "unlike" | "unsave"; storyId: string; createdAt: string; userId?: string };
export type LearnedInterest = { dimensionType: LearnableDimension; dimensionKey: string; affinityScore: number; lastSignalAt: string };
const clamp = (value: number) => Math.max(0, Math.min(100, value));
const unique = (values: string[]) => [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
export function extractPreferenceSignals(article: RankingArticle): Array<{ dimensionType: LearnableDimension; dimensionKey: string }> {
  return [
    ...unique(article.topics).map((dimensionKey) => ({ dimensionType: "topic" as const, dimensionKey })), ...unique(article.categories).map((dimensionKey) => ({ dimensionType: "category" as const, dimensionKey })), ...unique(article.countries).map((dimensionKey) => ({ dimensionType: "country" as const, dimensionKey })), ...unique(article.sectors).map((dimensionKey) => ({ dimensionType: "sector" as const, dimensionKey })), ...unique(article.regions).map((dimensionKey) => ({ dimensionType: "region" as const, dimensionKey })),
    ...(article.eventType ? [{ dimensionType: "event_type" as const, dimensionKey: article.eventType.toLowerCase() }] : []), { dimensionType: "content_type" as const, dimensionKey: article.contentType }, { dimensionType: "source" as const, dimensionKey: article.source.toLowerCase() },
  ];
}
export function effectiveAffinity(interest: LearnedInterest | undefined, now: Date) { if (!interest) return 50; const ageDays = Math.max(0, (now.getTime() - new Date(interest.lastSignalAt).getTime()) / 86_400_000); return 50 + (interest.affinityScore - 50) * Math.pow(0.5, ageDays / 180); }
export function applyFeedback(current: LearnedInterest | undefined, signal: number, now: Date): LearnedInterest { const base = effectiveAffinity(current, now); return { dimensionType: current?.dimensionType ?? "topic", dimensionKey: current?.dimensionKey ?? "", affinityScore: clamp(base + signal * 8), lastSignalAt: now.toISOString() }; }
export function deriveCurrentStoryFeedback(events: FeedbackEvent[]) { const ordered = [...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); let liked = false; let saved = false; let notRelevant = false; let fewerLikeThis = false; for (const event of ordered) { if (event.eventType === "like") liked = true; if (event.eventType === "unlike") liked = false; if (event.eventType === "save") saved = true; if (event.eventType === "unsave") saved = false; if (event.eventType === "not_relevant") notRelevant = true; if (event.eventType === "show_fewer_like_this") fewerLikeThis = true; } return { liked, saved, notRelevant, fewerLikeThis }; }
export const deriveCurrentState = deriveCurrentStoryFeedback;
export function helsinkiDateKey(value: Date | string) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)); }
export function canRecordStoryOpen(events: FeedbackEvent[], storyId: string, now: Date) { const day = helsinkiDateKey(now); return !events.some((event) => event.storyId === storyId && event.eventType === "open" && helsinkiDateKey(event.createdAt) === day); }
export function deriveLibraryStoryIds(events: FeedbackEvent[], userId?: string) { const scoped = userId ? events.filter((event) => event.userId === userId) : events; const byStory = new Map<string, FeedbackEvent[]>(); for (const event of scoped) byStory.set(event.storyId, [...(byStory.get(event.storyId) ?? []), event]); const liked: string[] = []; const saved: string[] = []; for (const [storyId, history] of byStory) { const state = deriveCurrentStoryFeedback(history); if (state.liked) liked.push(storyId); if (state.saved) saved.push(storyId); } return { liked: liked.sort(), saved: saved.sort() }; }
export function learnedPreference(article: RankingArticle, interests: LearnedInterest[], now: Date) { const index = new Map(interests.map((interest) => [`${interest.dimensionType}:${interest.dimensionKey.toLowerCase()}`, interest])); const grouped = new Map<LearnableDimension, number[]>(); for (const signal of extractPreferenceSignals(article)) grouped.set(signal.dimensionType, [...(grouped.get(signal.dimensionType) ?? []), effectiveAffinity(index.get(`${signal.dimensionType}:${signal.dimensionKey}`), now)]); const weights: Partial<Record<LearnableDimension, number>> = { topic: .30, country: .20, sector: .15, category: .15, event_type: .08, asset_class: .05, content_type: .04, source: .03 }; let total = 0; let used = 0; for (const [type, weight] of Object.entries(weights) as Array<[LearnableDimension, number]>) { const values = (grouped.get(type) ?? [50]).sort((a, b) => b - a); const value = values[0]! + ((values[1] ?? 50) - 50) * .2; total += value * weight; used += weight; } return clamp(used ? total / used : 50); }

export function updateLearnedProfile(profile: LearnedInterest[], article: RankingArticle, eventType: keyof typeof FEEDBACK_STRENGTH, now: Date) {
  const strength = FEEDBACK_STRENGTH[eventType]; const byKey = new Map(profile.map((interest) => [`${interest.dimensionType}:${interest.dimensionKey}`, interest]));
  for (const signal of extractPreferenceSignals(article)) { const key = `${signal.dimensionType}:${signal.dimensionKey}`; const current = byKey.get(key) ?? { ...signal, affinityScore: 50, lastSignalAt: now.toISOString() }; byKey.set(key, applyFeedback(current, strength * DIMENSION_MULTIPLIER[signal.dimensionType], now)); }
  return [...byKey.values()].sort((a, b) => `${a.dimensionType}:${a.dimensionKey}`.localeCompare(`${b.dimensionType}:${b.dimensionKey}`));
}

export function rankStoriesWithLearnedProfile(stories: RankedStoryCluster[], profile: LearnedInterest[], now: Date, likedSimilarityByArticleId?: Map<string, { likedSimilarity: number; seedCount: number; confidence: number }>) {
  const candidates = stories.map((story) => story.article);
  return stories.map((story) => { const semantic = likedSimilarityByArticleId?.get(story.article.id); return { ...story, score: scoreArticle(story.article, { now, candidates, learnedPreference: learnedPreference(story.article, profile, now), likedSimilarity: semantic?.likedSimilarity ?? 50, semanticExplanation: semantic && semantic.confidence > 0 ? { seedCount: semantic.seedCount, confidence: semantic.confidence } : undefined }) }; }).sort((a, b) => b.score.finalScore - a.score.finalScore || a.id.localeCompare(b.id));
}
