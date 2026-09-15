import { DAILY_INTELLIGENCE_VERSION, assessDailyIntelligenceSignal, dailyIntelligenceInputHash, isCurrentDailyIntelligenceCache, type DailyIntelligence, type DailyIntelligenceInput, type DailyIntelligenceQualityAssessment } from "./daily-intelligence-contract";

export type DailyIntelligenceCacheRecord = { userId: string; inputHash: string; generationVersion: string; intelligence: DailyIntelligence };
export type DailyIntelligenceFlowDependencies = {
  loadInput: (userId: string) => Promise<DailyIntelligenceInput | null>;
  readCache: (userId: string, input: DailyIntelligenceInput) => Promise<DailyIntelligenceCacheRecord | null>;
  synthesize: (input: DailyIntelligenceInput) => Promise<DailyIntelligence>;
  persist: (record: DailyIntelligenceCacheRecord, input: DailyIntelligenceInput) => Promise<DailyIntelligenceCacheRecord>;
};
export type DailyIntelligenceState = "missing" | "current" | "stale" | "quiet";
export type DailyIntelligenceFlowResult = { state: DailyIntelligenceState; intelligence: DailyIntelligence | null; cache: "hit" | "generated" | "stale" | null; assessment: DailyIntelligenceQualityAssessment | null };

/** Read mode is deliberately side-effect and AI free; synthesis exists only in explicit generate mode. */
export async function resolveDailyIntelligenceFlow(userId: string, generate: boolean, dependencies: DailyIntelligenceFlowDependencies): Promise<DailyIntelligenceFlowResult> {
  const input = await dependencies.loadInput(userId); if (!input) return { state: "missing", intelligence: null, cache: null, assessment: null };
  const inputHash = dailyIntelligenceInputHash(input); const cached = await dependencies.readCache(userId, input);
  const assessment = assessDailyIntelligenceSignal(input);
  if (cached && isCurrentDailyIntelligenceCache(cached, userId, inputHash)) return { state: "current", intelligence: cached.intelligence, cache: "hit", assessment };
  if (cached && !generate) return { state: "stale", intelligence: cached.intelligence, cache: "stale", assessment };
  if (!assessment.eligible) return cached ? { state: "stale", intelligence: cached.intelligence, cache: "stale", assessment } : { state: "quiet", intelligence: null, cache: null, assessment };
  if (!generate) return { state: "missing", intelligence: null, cache: null, assessment };
  const intelligence = await dependencies.synthesize(input);
  const persisted = await dependencies.persist({ userId, inputHash, generationVersion: DAILY_INTELLIGENCE_VERSION, intelligence }, input);
  return { state: "current", intelligence: persisted.intelligence, cache: "generated", assessment };
}
