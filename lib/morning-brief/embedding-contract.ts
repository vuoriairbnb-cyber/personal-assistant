import { createHash } from "node:crypto";
import { MORNING_BRIEF_MODELS, assertMorningBriefEmbeddingModel } from "./ai-models";

export const EMBEDDING_MODEL = assertMorningBriefEmbeddingModel(MORNING_BRIEF_MODELS.embedding);
export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_VERSION = "morning-brief-openai-embedding-v1";
const MAX_INPUT_CHARS = 12_000;
type SemanticArticle = { id: string; title: string; excerpt: string | null; body_text: string | null; content_type: string; countries: string[]; regions: string[]; categories: string[]; topics: string[]; sectors: string[]; companies: string[]; event_type: string | null; summary: string | null; };
const compact = (value: string | null | undefined) => value?.replace(/\s+/g, " ").trim() ?? "";
export function buildEmbeddingInput(article: SemanticArticle) { return [`TITLE: ${compact(article.title)}`, `SUMMARY: ${compact(article.summary) || compact(article.excerpt)}`, `TOPICS: ${article.topics.join(", ")}`, `SECTORS: ${article.sectors.join(", ")}`, `COUNTRIES: ${article.countries.join(", ")}`, `REGIONS: ${article.regions.join(", ")}`, `CATEGORIES: ${article.categories.join(", ")}`, `COMPANIES: ${article.companies.join(", ")}`, `EVENT: ${compact(article.event_type)}`, `CONTENT: ${compact(article.body_text).slice(0, 7_000)}`].filter((line) => !line.endsWith(": ")).join("\n").slice(0, MAX_INPUT_CHARS); }
export const embeddingInputHash = (input: string) => createHash("sha256").update(input).digest("hex");
export const needsEmbeddingGeneration = (existingInputHash: string | null | undefined, currentInputHash: string) => existingInputHash !== currentInputHash;
export function parseVector(value: string | number[] | null | undefined) { if (Array.isArray(value)) return value.every(Number.isFinite) ? value : null; if (typeof value !== "string") return null; try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) && parsed.length === EMBEDDING_DIMENSIONS && parsed.every((item) => typeof item === "number" && Number.isFinite(item)) ? parsed : null; } catch { return null; } }
