import { MORNING_BRIEF_CATEGORIES, MORNING_BRIEF_CONTENT_TYPES, MORNING_BRIEF_SECTIONS, isMorningBriefContentType, isMorningBriefSection } from "./taxonomy";
import type { ExtractedArticle } from "./article-extraction";

/** Bumped when the persisted classifier contract switched from legacy 0–10-like output to calibrated 0–100 scores. */
export const IMPORT_CLASSIFICATION_VERSION = "morning-brief-openai-classification-calibrated-v2";
export const isCurrentMorningBriefClassificationVersion = (version: string | null | undefined) => version === IMPORT_CLASSIFICATION_VERSION;
export type ImportedArticleClassification = {
  countries: string[]; regions: string[]; categories: string[]; topics: string[]; sectors: string[];
  companies: string[]; people: string[]; assetClasses: string[]; funds: string[]; eventType: string | null;
  significance: number; consequence: number; scope: number; confidence: number;
  primarySection: (typeof MORNING_BRIEF_SECTIONS)[number]; contentType: (typeof MORNING_BRIEF_CONTENT_TYPES)[number];
  summary: string; whyItMatters: string;
};
export function buildImportedArticleClassificationInput(article: ExtractedArticle) { return { title: article.title, excerpt: article.excerpt, site_name: article.siteName, author: article.author, published_at: article.publishedAt, language: article.language, content_availability: article.contentAvailability, article_text: article.text }; }

const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid classification response.");
  return value as Record<string, unknown>;
};
const strings = (value: unknown, name: string) => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new Error(`Invalid ${name}.`);
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))].slice(0, 20);
};
const score = (value: unknown, name: string) => {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 100) throw new Error(`Invalid ${name}.`);
  return value as number;
};
const text = (value: unknown, name: string, max: number) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Invalid ${name}.`);
  return value.trim().slice(0, max);
};

export function parseImportedArticleClassification(value: unknown): ImportedArticleClassification {
  const data = record(value);
  const categories = strings(data.categories, "categories");
  if (categories.some((item) => !MORNING_BRIEF_CATEGORIES.includes(item as never))) throw new Error("Invalid categories.");
  if (typeof data.primary_section !== "string" || !isMorningBriefSection(data.primary_section)) throw new Error("Invalid primary section.");
  if (typeof data.content_type !== "string" || !isMorningBriefContentType(data.content_type)) throw new Error("Invalid content type.");
  return {
    countries: strings(data.countries, "countries"), regions: strings(data.regions, "regions"), categories,
    topics: strings(data.topics, "topics"), sectors: strings(data.sectors, "sectors"), companies: strings(data.companies, "companies"),
    people: strings(data.people, "people"), assetClasses: strings(data.asset_classes, "asset classes"), funds: strings(data.funds, "funds"),
    eventType: data.event_type === null ? null : text(data.event_type, "event type", 100),
    significance: score(data.significance, "significance"), consequence: score(data.consequence, "consequence"), scope: score(data.scope, "scope"), confidence: score(data.confidence, "confidence"),
    primarySection: data.primary_section, contentType: data.content_type, summary: text(data.summary, "summary", 1_500), whyItMatters: text(data.why_it_matters, "why it matters", 1_500),
  };
}
