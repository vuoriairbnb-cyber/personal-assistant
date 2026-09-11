import { createHash } from "node:crypto";
import type { SourceCandidate } from "./sources";

const INPUT_HASH_VERSION = "live-feed-classification-v1";
export const liveCandidateContentHash = (candidate: SourceCandidate) => createHash("sha256").update(JSON.stringify([candidate.title, candidate.excerpt, candidate.author ?? "", candidate.categories, candidate.imageUrl ?? ""])).digest("hex");
export const classificationInputHash = (candidate: SourceCandidate) => createHash("sha256").update(JSON.stringify([INPUT_HASH_VERSION, candidate.title, candidate.excerpt, candidate.author ?? "", candidate.publishedAt, candidate.language, candidate.categories])).digest("hex");
export const shouldReuseLiveClassification = (existingHash: unknown, nextHash: string, hasCurrentClassification: boolean) => hasCurrentClassification && existingHash === nextHash;
