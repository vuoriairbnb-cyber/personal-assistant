/** Morning Brief production policy: NO SOL API USAGE. Never add a Sol fallback. */
export const MORNING_BRIEF_MODELS = { default: "gpt-5.6-luna", advanced: "gpt-5.6-terra", embedding: "text-embedding-3-small" } as const;
export const MORNING_BRIEF_GENERATIVE_ALLOWLIST = [MORNING_BRIEF_MODELS.default, MORNING_BRIEF_MODELS.advanced] as const;
export const MORNING_BRIEF_EMBEDDING_ALLOWLIST = [MORNING_BRIEF_MODELS.embedding] as const;
export const CLASSIFICATION_ESCALATION_CONFIDENCE = 75;
export type MorningBriefGenerativeModel = (typeof MORNING_BRIEF_GENERATIVE_ALLOWLIST)[number];
export function assertMorningBriefGenerativeModel(model: string): MorningBriefGenerativeModel { if (!(MORNING_BRIEF_GENERATIVE_ALLOWLIST as readonly string[]).includes(model)) throw new Error("Morning Brief model is not allowed."); return model as MorningBriefGenerativeModel; }
export function assertMorningBriefEmbeddingModel(model: string) { if (!(MORNING_BRIEF_EMBEDDING_ALLOWLIST as readonly string[]).includes(model)) throw new Error("Morning Brief embedding model is not allowed."); return model; }
export function resolveMorningBriefModels(env: Record<string, string | undefined> = process.env) { return { default: assertMorningBriefGenerativeModel(env.MORNING_BRIEF_LUNA_MODEL ?? MORNING_BRIEF_MODELS.default), advanced: assertMorningBriefGenerativeModel(env.MORNING_BRIEF_TERRA_MODEL ?? MORNING_BRIEF_MODELS.advanced), embedding: assertMorningBriefEmbeddingModel(env.MORNING_BRIEF_EMBEDDING_MODEL ?? MORNING_BRIEF_MODELS.embedding) }; }
export const shouldEscalateClassification = (confidence: number | null | undefined) => confidence === null || confidence === undefined || confidence < CLASSIFICATION_ESCALATION_CONFIDENCE;
/** The complete permitted route. A Terra failure ends the operation; no third model exists. */
export function classificationModelRoute(confidence: number | null | undefined, env?: Record<string, string | undefined>) { const models = resolveMorningBriefModels(env); return shouldEscalateClassification(confidence) ? [models.default, models.advanced] : [models.default]; }
