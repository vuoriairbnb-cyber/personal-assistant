/** Morning Brief production policy: NO SOL API USAGE. Never add a Sol fallback. */
export const MORNING_BRIEF_MODELS = { default: "gpt-5.6-luna", advanced: "gpt-5.6-terra", embedding: "text-embedding-3-small" } as const;
export const MORNING_BRIEF_GENERATIVE_ALLOWLIST = [MORNING_BRIEF_MODELS.default, MORNING_BRIEF_MODELS.advanced] as const;
export const MORNING_BRIEF_EMBEDDING_ALLOWLIST = [MORNING_BRIEF_MODELS.embedding] as const;

/** Terra is reserved for genuinely uncertain or malformed Luna classifications. */
export const CLASSIFICATION_LOW_CONFIDENCE = 60;
export const CLASSIFICATION_IMPORTANT_UNCERTAIN_CONFIDENCE = 70;
export const CLASSIFICATION_HIGH_IMPORTANCE = 80;
/** Compatibility alias for consumers that only need the normal low-confidence cutoff. */
export const CLASSIFICATION_ESCALATION_CONFIDENCE = CLASSIFICATION_LOW_CONFIDENCE;

export type MorningBriefGenerativeModel = (typeof MORNING_BRIEF_GENERATIVE_ALLOWLIST)[number];
export type ClassificationEscalationReason = "low_confidence" | "invalid_structure" | "important_uncertain" | "other";
export type ClassificationEscalationInput = { confidence: number | null | undefined; significance?: number | null; consequence?: number | null; scope?: number | null; invalidStructure?: boolean };

export function assertMorningBriefGenerativeModel(model: string): MorningBriefGenerativeModel { if (!(MORNING_BRIEF_GENERATIVE_ALLOWLIST as readonly string[]).includes(model)) throw new Error("Morning Brief model is not allowed."); return model as MorningBriefGenerativeModel; }
export function assertMorningBriefEmbeddingModel(model: string) { if (!(MORNING_BRIEF_EMBEDDING_ALLOWLIST as readonly string[]).includes(model)) throw new Error("Morning Brief embedding model is not allowed."); return model; }
export function resolveMorningBriefModels(env: Record<string, string | undefined> = process.env) { return { default: assertMorningBriefGenerativeModel(env.MORNING_BRIEF_LUNA_MODEL ?? MORNING_BRIEF_MODELS.default), advanced: assertMorningBriefGenerativeModel(env.MORNING_BRIEF_TERRA_MODEL ?? MORNING_BRIEF_MODELS.advanced), embedding: assertMorningBriefEmbeddingModel(env.MORNING_BRIEF_EMBEDDING_MODEL ?? MORNING_BRIEF_MODELS.embedding) }; }
export const shouldEscalateClassification = (confidence: number | null | undefined) => confidence === null || confidence === undefined || confidence < CLASSIFICATION_LOW_CONFIDENCE;
export function classificationEscalationReason(input: ClassificationEscalationInput): ClassificationEscalationReason | null {
  if (input.invalidStructure) return "invalid_structure";
  if (shouldEscalateClassification(input.confidence)) return "low_confidence";
  const highImportance = Math.max(input.significance ?? 0, input.consequence ?? 0, input.scope ?? 0) >= CLASSIFICATION_HIGH_IMPORTANCE;
  return highImportance && input.confidence! < CLASSIFICATION_IMPORTANT_UNCERTAIN_CONFIDENCE ? "important_uncertain" : null;
}
/** The complete permitted route. Terra is final; no third model exists. */
export function classificationModelRoute(input: number | ClassificationEscalationInput, env?: Record<string, string | undefined>) {
  const reason = classificationEscalationReason(typeof input === "number" ? { confidence: input } : input); const models = resolveMorningBriefModels(env);
  return reason ? [models.default, models.advanced] : [models.default];
}
