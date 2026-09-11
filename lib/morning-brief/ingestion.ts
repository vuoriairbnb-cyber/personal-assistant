import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { ExtractedArticle } from "./article-extraction";
import { classifyImportedArticle } from "./classification";
import { IMPORT_CLASSIFICATION_VERSION } from "./classification-contract";
import { ensureArticleEmbeddings } from "./embeddings";
import { normalizeImportUrl } from "./import-url";
import { MORNING_BRIEF_SOURCE_ADAPTERS } from "./sources";
import type { MorningBriefSourceAdapter, SourceCandidate, SourceIngestionSummary } from "./sources";
import { classificationInputHash, liveCandidateContentHash, shouldReuseLiveClassification } from "./ingestion-contract";
import { LIVE_INGESTION_BATCH_LIMITS, LIVE_INGESTION_CANDIDATE_LIMITS, LIVE_INGESTION_CONCURRENCY } from "./sources/config";
import { mapBounded } from "./ingestion-runtime";
export { classificationInputHash, shouldReuseLiveClassification } from "./ingestion-contract";

const sourceMetadata = (slug: SourceCandidate["sourceSlug"]) => ({ live_public_source: true, source_slug: slug });
const emptySummary = (source: string): SourceIngestionSummary => ({ source, fetched: 0, parsed: 0, considered: 0, filtered: 0, new: 0, duplicates: 0, classified: 0, reusedClassifications: 0, embedded: 0, reusedEmbeddings: 0, failed: 0 });
const candidateAsExtracted = (candidate: SourceCandidate): ExtractedArticle => ({ canonicalUrl: candidate.canonicalUrl, title: candidate.title, excerpt: candidate.excerpt, author: candidate.author, publishedAt: candidate.publishedAt, language: candidate.language, imageUrl: candidate.imageUrl, siteName: candidate.sourceSlug === "ecb" ? "European Central Bank" : candidate.sourceSlug === "yle" ? "Yle" : "Bank of Finland", text: "", contentAvailability: candidate.excerpt.length >= 220 ? "partial_text" : "metadata_only" });
const safeError = (error: unknown) => error instanceof Error ? error.message.slice(0, 180) : "Unknown error";
type PersistedCandidate =
  | { skipped: true }
  | { skipped: false; articleId: string; classify: boolean };

async function ensureLiveSources(db: SupabaseClient<Database>) {
  const rows = [
    { slug: "yle", name: "Yle", base_url: "https://yle.fi", source_type: "rss" as const, default_language: "fi", enabled: true, default_content_type: "news" as const, metadata_json: sourceMetadata("yle") },
    { slug: "bank-of-finland", name: "Bank of Finland", base_url: "https://www.suomenpankki.fi", source_type: "official" as const, default_language: "en", enabled: true, default_content_type: "news" as const, metadata_json: sourceMetadata("bank-of-finland") },
    { slug: "ecb", name: "European Central Bank", base_url: "https://www.ecb.europa.eu", source_type: "rss" as const, default_language: "en", enabled: true, default_content_type: "news" as const, metadata_json: sourceMetadata("ecb") },
  ];
  const { data, error } = await db.from("morning_brief_sources").upsert(rows, { onConflict: "slug" }).select("id,slug");
  if (error || !data) throw error ?? new Error("Could not persist live news sources.");
  return new Map(data.map((row) => [row.slug, row.id]));
}

async function persistCandidate(db: SupabaseClient<Database>, sourceId: string, candidate: SourceCandidate, summary: SourceIngestionSummary, allowNew: boolean): Promise<PersistedCandidate> {
  const canonicalUrl = normalizeImportUrl(candidate.canonicalUrl); const inputHash = classificationInputHash(candidate); const nextContentHash = liveCandidateContentHash(candidate);
  const { data: bySource } = await db.from("morning_brief_articles").select("id,content_hash,raw_metadata_json").eq("source_id", sourceId).eq("source_article_id", candidate.sourceArticleId).maybeSingle();
  const { data: byUrl } = bySource ? { data: null } : await db.from("morning_brief_articles").select("id,content_hash,raw_metadata_json").eq("source_id", sourceId).eq("canonical_url", canonicalUrl).maybeSingle();
  const existing = bySource ?? byUrl;
  const metadata = { ...candidate.rawMetadata, live_public_source: true, source_slug: candidate.sourceSlug, classification_input_hash: inputHash };
  const row = { source_id: sourceId, source_article_id: candidate.sourceArticleId, title: candidate.title, excerpt: candidate.excerpt || null, canonical_url: canonicalUrl, author: candidate.author ?? null, published_at: candidate.publishedAt, fetched_at: new Date().toISOString(), language: candidate.language, content_type: candidate.contentType ?? "news" as const, access_type: "public" as const, image_url: candidate.imageUrl ?? null, image_alt: null, image_source: candidate.imageUrl ? candidate.sourceSlug : null, raw_metadata_json: metadata, content_hash: nextContentHash };
  if (!existing) {
    if (!allowNew) return { skipped: true as const };
    const { data, error } = await db.from("morning_brief_articles").insert(row).select("id").single(); if (error || !data) throw error ?? new Error("Could not persist live article."); summary.new += 1; return { skipped: false, articleId: data.id, classify: true };
  }
  if (existing.content_hash === nextContentHash) { summary.duplicates += 1; const { data: classifications } = await db.from("morning_brief_article_classifications").select("id").eq("article_id", existing.id).eq("classification_version", IMPORT_CLASSIFICATION_VERSION).limit(1); return { skipped: false, articleId: existing.id, classify: !shouldReuseLiveClassification((existing.raw_metadata_json as Record<string, unknown>)?.classification_input_hash, inputHash, Boolean(classifications?.length)) }; }
  const { error } = await db.from("morning_brief_articles").update(row).eq("id", existing.id); if (error) throw error; return { skipped: false, articleId: existing.id, classify: true };
}

async function classifyAndEmbed(db: SupabaseClient<Database>, candidate: SourceCandidate, articleId: string, summary: SourceIngestionSummary) {
  const classified = await classifyImportedArticle(candidateAsExtracted(candidate));
  const { error } = await db.from("morning_brief_article_classifications").upsert({ article_id: articleId, countries: classified.data.countries, regions: classified.data.regions, categories: classified.data.categories, topics: classified.data.topics, sectors: classified.data.sectors, companies: classified.data.companies, people: classified.data.people, asset_classes: classified.data.assetClasses, funds: classified.data.funds, event_type: classified.data.eventType, significance: classified.data.significance, consequence: classified.data.consequence, scope: classified.data.scope, confidence: classified.data.confidence, primary_section: classified.data.primarySection, summary: classified.data.summary, why_it_matters: classified.data.whyItMatters, classification_version: IMPORT_CLASSIFICATION_VERSION }, { onConflict: "article_id,classification_version" }); if (error) throw error;
  const { error: metadataError } = await db.from("morning_brief_articles").update({ raw_metadata_json: { ...candidate.rawMetadata, live_public_source: true, source_slug: candidate.sourceSlug, classification_input_hash: classificationInputHash(candidate) } }).eq("id", articleId); if (metadataError) throw metadataError;
  summary.classified += 1;
  const before = await db.from("morning_brief_article_embeddings").select("id").eq("article_id", articleId).limit(1);
  const vectors = await ensureArticleEmbeddings([articleId]);
  if (!vectors.has(articleId)) { summary.failed += 1; return; }
  if (before.data?.length) summary.reusedEmbeddings += 1; else summary.embedded += 1;
}

export type IngestMorningBriefSourcesOptions = { sources?: readonly MorningBriefSourceAdapter[]; now?: Date; db?: SupabaseClient<Database> };
export async function ingestMorningBriefSources({ sources = MORNING_BRIEF_SOURCE_ADAPTERS, now = new Date(), db = createServiceSupabaseClient() }: IngestMorningBriefSourcesOptions = {}) {
  const startedAt = Date.now(); const sourceIds = await ensureLiveSources(db); const cutoff = now.getTime() - 48 * 3_600_000;
  const prepared = await Promise.all(sources.map(async (source) => {
    const summary = emptySummary(source.sourceSlug);
    try { const candidates = await source.fetchCandidates(); summary.fetched = candidates.length; const recent = candidates.filter((candidate) => Number.isFinite(Date.parse(candidate.publishedAt)) && Date.parse(candidate.publishedAt) >= cutoff); summary.parsed = recent.length; const limited = recent.slice(0, LIVE_INGESTION_CANDIDATE_LIMITS[source.sourceSlug]); summary.considered = limited.length; summary.filtered = recent.length - limited.length; return { source, summary, candidates: limited }; }
    catch (error) { summary.failed += 1; summary.error = safeError(error); console.warn("[morning-brief] live source failed", { source: source.sourceSlug, error: summary.error }); return { source, summary, candidates: [] as SourceCandidate[] }; }
  }));
  const work: Array<{ candidate: SourceCandidate; articleId: string; summary: SourceIngestionSummary }> = [];
  for (const item of prepared) {
    const sourceId = sourceIds.get(item.source.sourceSlug); if (!sourceId) { item.summary.failed += 1; item.summary.error = "Live source was not configured."; continue; }
    for (const candidate of item.candidates) try {
      const persisted = await persistCandidate(db, sourceId, candidate, item.summary, work.filter((entry) => entry.summary === item.summary).length < LIVE_INGESTION_BATCH_LIMITS[item.source.sourceSlug]);
      if (persisted.skipped) { item.summary.filtered += 1; continue; }
      if (persisted.classify) { if (work.filter((entry) => entry.summary === item.summary).length < LIVE_INGESTION_BATCH_LIMITS[item.source.sourceSlug]) work.push({ candidate, articleId: persisted.articleId, summary: item.summary }); else item.summary.filtered += 1; }
      else item.summary.reusedClassifications += 1;
    } catch (error) { item.summary.failed += 1; console.warn("[morning-brief] live candidate failed", { source: item.source.sourceSlug, error: safeError(error) }); }
  }
  await mapBounded(work, LIVE_INGESTION_CONCURRENCY, async (entry) => { try { await classifyAndEmbed(db, entry.candidate, entry.articleId, entry.summary); } catch (error) { entry.summary.failed += 1; console.warn("[morning-brief] live candidate AI failed", { source: entry.summary.source, error: safeError(error) }); } });
  const summaries = prepared.map((item) => item.summary); const result = { sources: summaries, processed: work.length, durationMs: Date.now() - startedAt, partialFailure: summaries.some((summary) => summary.failed > 0) };
  console.info("[morning-brief] live ingestion complete", result); return result;
}
