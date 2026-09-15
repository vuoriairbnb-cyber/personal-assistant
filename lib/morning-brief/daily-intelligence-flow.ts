import { DAILY_INTELLIGENCE_VERSION, dailyIntelligenceInputHash, isCurrentDailyIntelligenceCache, type DailyIntelligence, type DailyIntelligenceInput } from "./daily-intelligence-contract";

export type DailyIntelligenceCacheRecord = { userId: string; inputHash: string; generationVersion: string; intelligence: DailyIntelligence };
export type DailyIntelligenceFlowDependencies = {
  loadInput: (userId: string) => Promise<DailyIntelligenceInput | null>;
  readCache: (userId: string, input: DailyIntelligenceInput) => Promise<DailyIntelligenceCacheRecord | null>;
  synthesize: (input: DailyIntelligenceInput) => Promise<DailyIntelligence>;
  persist: (record: DailyIntelligenceCacheRecord, input: DailyIntelligenceInput) => Promise<DailyIntelligenceCacheRecord>;
};
export type DailyIntelligenceFlowResult = { state: "ready" | "stale"; intelligence: DailyIntelligence | null; cache: "hit" | "generated" | null };

/** Read mode is deliberately side-effect and AI free; synthesis exists only in explicit generate mode. */
export async function resolveDailyIntelligenceFlow(userId: string, generate: boolean, dependencies: DailyIntelligenceFlowDependencies): Promise<DailyIntelligenceFlowResult> {
  const input = await dependencies.loadInput(userId); if (!input) return { state: "stale", intelligence: null, cache: null };
  const inputHash = dailyIntelligenceInputHash(input); const cached = await dependencies.readCache(userId, input);
  if (cached && isCurrentDailyIntelligenceCache(cached, userId, inputHash)) return { state: "ready", intelligence: cached.intelligence, cache: "hit" };
  if (!generate) return { state: "stale", intelligence: null, cache: null };
  const intelligence = await dependencies.synthesize(input);
  const persisted = await dependencies.persist({ userId, inputHash, generationVersion: DAILY_INTELLIGENCE_VERSION, intelligence }, input);
  return { state: "ready", intelligence: persisted.intelligence, cache: "generated" };
}
