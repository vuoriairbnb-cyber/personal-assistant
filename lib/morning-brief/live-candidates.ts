import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { isProductionMorningBriefCandidate, isTrustedLiveMorningBriefSource } from "./candidate-eligibility";
import { IMPORT_CLASSIFICATION_VERSION } from "./classification-contract";
import type { RankingArticle } from "./ranking";
import { isMorningBriefEligible, MAX_MORNING_BRIEF_ELIGIBILITY_WINDOW_HOURS } from "./freshness-policy";

export type LiveCandidateClassification = {
  topics: string[];
  categories: string[];
  countries: string[];
  regions: string[];
  sectors: string[];
  companies: string[];
  eventType: string | null;
  assetClasses: string[];
  significance: number;
  consequence: number;
  scope: number;
  confidence: number | null;
};

export type LiveMorningBriefCandidate = { article: RankingArticle; classification: LiveCandidateClassification };
export type LiveMorningBriefCandidates = { candidates: LiveMorningBriefCandidate[]; liveCandidateCount: number; importedCandidateCount: number; mockExcludedCount: number };

const record = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Read-only candidate mapping shared by production generation and diagnostics. */
export async function loadLiveMorningBriefCandidates(userId: string, now: Date): Promise<LiveMorningBriefCandidates> {
  const db = createServiceSupabaseClient();
  const liveCutoff = new Date(now.getTime() - MAX_MORNING_BRIEF_ELIGIBILITY_WINDOW_HOURS * 3_600_000).toISOString();
  const { data: sources, error: sourceError } = await db.from("morning_brief_sources").select("id,slug,name,metadata_json");
  if (sourceError) throw sourceError;
  const sourceById = new Map((sources ?? []).map((source) => [source.id, source]));
  const liveSourceIds = (sources ?? []).filter((source) => record(source.metadata_json).live_public_source === true || isTrustedLiveMorningBriefSource(source.slug)).map((source) => source.id);
  const [{ data: liveArticles, error: liveError }, { data: imports, error: importsError }] = await Promise.all([
    liveSourceIds.length ? db.from("morning_brief_articles").select("*").in("source_id", liveSourceIds).gte("published_at", liveCutoff).order("published_at", { ascending: false }).limit(120) : Promise.resolve({ data: [], error: null }),
    db.from("morning_brief_imports").select("linked_article_id").eq("user_id", userId).eq("status", "completed").not("linked_article_id", "is", null),
  ]);
  if (liveError || importsError) throw liveError ?? importsError;
  const importIds = [...new Set((imports ?? []).map((item) => item.linked_article_id).filter((id): id is string => Boolean(id)))];
  const { data: importedArticles, error: importedError } = importIds.length ? await db.from("morning_brief_articles").select("*").in("id", importIds) : { data: [], error: null };
  if (importedError) throw importedError;
  const articles = [...new Map([...(liveArticles ?? []), ...(importedArticles ?? [])].map((article) => [article.id, article])).values()];
  const ids = articles.map((article) => article.id);
  const { data: classifications, error: classificationError } = ids.length ? await db.from("morning_brief_article_classifications").select("article_id,countries,regions,categories,topics,sectors,companies,event_type,asset_classes,significance,consequence,scope,confidence,primary_section,summary,classification_version,created_at").in("article_id", ids).eq("classification_version", IMPORT_CLASSIFICATION_VERSION).order("created_at", { ascending: false }) : { data: [], error: null };
  if (classificationError) throw classificationError;
  const classificationByArticle = new Map<string, NonNullable<typeof classifications>[number]>();
  for (const classification of classifications ?? []) if (!classificationByArticle.has(classification.article_id)) classificationByArticle.set(classification.article_id, classification);
  const candidates: LiveMorningBriefCandidate[] = []; let liveCandidateCount = 0; let importedCandidateCount = 0; let mockExcludedCount = 0;
  for (const article of articles) {
    const classification = classificationByArticle.get(article.id); const source = sourceById.get(article.source_id);
    if (!classification || classification.significance === null || classification.consequence === null || classification.scope === null || !classification.primary_section || !classification.summary || !source) continue;
    const markers = { sourceSlug: source.slug, sourceMetadata: record(source.metadata_json), articleMetadata: record(article.raw_metadata_json), canonicalUrl: article.canonical_url, classificationVersion: classification.classification_version };
    if (!isProductionMorningBriefCandidate(markers)) {
      if (markers.articleMetadata.development_mock === true || markers.canonicalUrl?.startsWith("https://mock.local/") || markers.classificationVersion === "mock-classifier-v1") mockExcludedCount += 1;
      continue;
    }
    const imported = record(source.metadata_json).imported === true || record(article.raw_metadata_json).imported === true;
    if (!imported && !isMorningBriefEligible(article.published_at, { rawMetadata: markers.articleMetadata, contentType: article.content_type }, now)) continue;
    if (imported) importedCandidateCount += 1; else liveCandidateCount += 1;
    const candidate: RankingArticle = { id: article.id, title: article.title, source: source.name, publishedAt: article.published_at, contentType: article.content_type, countries: classification.countries, regions: classification.regions, categories: classification.categories, topics: classification.topics, sectors: classification.sectors, companies: classification.companies, eventType: classification.event_type ?? undefined, canonicalUrl: article.canonical_url, imageUrl: article.image_url, imageAlt: article.image_alt, imageSource: article.image_source, significance: classification.significance, consequence: classification.consequence, scope: classification.scope, summary: classification.summary, primarySection: classification.primary_section };
    candidates.push({ article: candidate, classification: { topics: classification.topics, categories: classification.categories, countries: classification.countries, regions: classification.regions, sectors: classification.sectors, companies: classification.companies, eventType: classification.event_type, assetClasses: classification.asset_classes, significance: classification.significance, consequence: classification.consequence, scope: classification.scope, confidence: classification.confidence } });
  }
  return { candidates, liveCandidateCount, importedCandidateCount, mockExcludedCount };
}
