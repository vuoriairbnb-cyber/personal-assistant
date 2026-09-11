import { clusterArticles } from "./clustering";
import { MOCK_CORPUS_NOW, MOCK_NEWS_CORPUS } from "./mock-corpus";
import { learnedPreference, rankStoriesWithLearnedProfile, updateLearnedProfile, type LearnedInterest } from "./learning";

const byId = (id: string) => { const article = MOCK_NEWS_CORPUS.find((item) => item.id === id); if (!article) throw new Error(`Missing demo fixture: ${id}`); return article; };
export const LEARNING_DEMO_SEQUENCE = [
  ["vietnam-bank-credit", "like"], ["vietnam-central-bank", "like"], ["nordic-credit-1", "like"], ["vietnam-tourism-noise", "show_fewer_like_this"], ["vc-pe-3", "not_relevant"], ["european-hy-5", "save"], ["global-3", "open"],
] as const;

export function createLearningDemo(now = MOCK_CORPUS_NOW) {
  const clusters = clusterArticles(MOCK_NEWS_CORPUS, now); const before = rankStoriesWithLearnedProfile(clusters, [], now); let profile: LearnedInterest[] = [];
  for (const [id, event] of LEARNING_DEMO_SEQUENCE) profile = updateLearnedProfile(profile, byId(id), event, now);
  const after = rankStoriesWithLearnedProfile(clusters, profile, now);
  const affinities = (keys: Array<[string, string]>) => Object.fromEntries(keys.map(([type, key]) => [`${type}/${key}`, profile.find((item) => item.dimensionType === type && item.dimensionKey === key)?.affinityScore ?? 50]));
  return { profile, before, after, affinities: affinities([["country", "vietnam"], ["sector", "banking"], ["topic", "credit growth"], ["topic", "refinancing"], ["content_type", "long_read"], ["source", "reuters"], ["topic", "tourism"], ["topic", "seed round"]]), learned: { banking: learnedPreference(byId("vietnam-bank-credit"), profile, now), lifestyle: learnedPreference(byId("vietnam-tourism-noise"), profile, now), nordicRefinancing: learnedPreference(byId("nordic-credit-1"), profile, now), tinySeed: learnedPreference(byId("vc-pe-3"), profile, now), majorVc: learnedPreference(byId("vc-pe-1"), profile, now) } };
}

export function formatLearningDemo() { const demo = createLearningDemo(); const table = (rows: typeof demo.before) => rows.slice(0, 10).map((story, index) => `${index + 1} | ${story.score.finalScore.toFixed(1)} | ${story.score.learnedPreference.toFixed(1)} | ${story.headline}`).join("\n"); return `LEARNED PROFILE AFTER\n${Object.entries(demo.affinities).map(([key, value]) => `${key} | ${value.toFixed(1)}`).join("\n")}\n\nBEFORE TOP 10\n${table(demo.before)}\n\nAFTER TOP 10\n${table(demo.after)}`; }
