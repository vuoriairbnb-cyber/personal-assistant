import { buildSemanticProfile, likedSimilarityFromProfile, type SemanticSeed } from "./semantic";

export function morningBriefSemanticDemo(now = new Date("2026-09-11T09:00:00Z")) {
  const seeds: SemanticSeed[] = [
    { storyId: "imported-nordic-private-credit", vector: [1, 0, 0, 0], weight: 2, intent: "import", createdAt: now.toISOString() },
    { storyId: "liked-swedish-property-refinancing", vector: [.9, .1, 0, 0], weight: 1, intent: "like", createdAt: now.toISOString() },
    { storyId: "liked-vietnam-banking", vector: [0, 0, 1, 0], weight: 1, intent: "like", createdAt: now.toISOString() },
  ];
  const profile = buildSemanticProfile(seeds)!;
  const candidates = [
    ["Nordic direct lending covenant change", [1, .05, 0, 0], 67], ["Nordic syndicated loan refinancing", [.82, .18, 0, 0], 65], ["European HY issuance", [.45, .4, 0, 0], 64], ["Vietnam bank lending", [0, 0, 1, 0], 69], ["Vietnam property", [0, 0, .7, .3], 62], ["Generic world politics", [.1, 0, .05, .4], 71], ["Vietnam tourism", [0, 0, .2, .8], 49], ["Celebrity story", [0, 0, 0, 1], 42],
  ] as const;
  return candidates.map(([candidate, vector, oldFinalScore]) => { const semantic = likedSimilarityFromProfile(profile, [...vector]); return { candidate, rawSimilarity: semantic.rawCosineSimilarity, semanticConfidence: semantic.confidence, likedSimilarity: semantic.likedSimilarity, oldFinalScore, newFinalScore: oldFinalScore + (semantic.likedSimilarity - 50) * .05 }; });
}
