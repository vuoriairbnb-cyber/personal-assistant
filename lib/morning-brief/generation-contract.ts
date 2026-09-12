import { IMPORT_CLASSIFICATION_VERSION } from "./classification-contract";

export type MorningBriefGenerationMode = "live" | "mock";

/** Explicitly supplies generated_at on every upsert without resetting created_at. */
export function dailyBriefGenerationRecord(userId: string, date: string, generatedAt: string, mode: MorningBriefGenerationMode, liveCandidateCount: number, importedCandidateCount: number) {
  return { user_id: userId, brief_date: date, brief_version: 1, generated_at: generatedAt, status: "ready" as const, summary_text: mode === "mock" ? "Development Morning Brief using eligible live public sources and fixtures." : "Morning Brief using eligible live public sources and imported articles.", algorithm_version: "ranking-v1", classification_version: mode === "mock" ? "mock-classifier-v1" : IMPORT_CLASSIFICATION_VERSION, metadata_json: { development_mock: mode === "mock", generation_mode: mode, live_candidate_count: liveCandidateCount, imported_candidate_count: importedCandidateCount, clustering_version: "clustering-v1" } };
}
