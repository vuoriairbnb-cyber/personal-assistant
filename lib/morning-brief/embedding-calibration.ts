import "server-only";
import { generateEmbeddings } from "./embeddings";
import { cosineSimilarity } from "./semantic";

const CALIBRATION_TEXTS = [
  "Nordic private credit lenders tighten covenant protection as refinancing pressure rises.",
  "Nordic direct lenders demand stronger documentation in sponsor-backed debt deals.",
  "European leveraged-finance borrowers return to market for refinancing.",
  "Vietnam banks report stronger credit growth as domestic demand improves.",
  "Celebrity lifestyle news and travel recommendations.",
] as const;

/** Manual development utility: call explicitly when validating the configured provider's cosine distribution. */
export async function runMorningBriefEmbeddingCalibration() {
  const vectors = await generateEmbeddings([...CALIBRATION_TEXTS]);
  const anchor = vectors[0]!;
  return CALIBRATION_TEXTS.slice(1).map((text, index) => ({ anchor: CALIBRATION_TEXTS[0], comparison: text, cosine: cosineSimilarity(anchor, vectors[index + 1]!) }));
}
