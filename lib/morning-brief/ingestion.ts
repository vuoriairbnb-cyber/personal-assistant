import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { ExtractedArticle } from "./article-extraction";
import { classifyImportedArticle } from "./classification";
import { IMPORT_CLASSIFICATION_VERSION } from "./classification-contract";
import { EMBEDDING_MODEL, EMBEDDING_VERSION, buildEmbeddingInput, embeddingInputHash, ensureArticleEmbeddings } from "./embeddings";
import { normalizeImportUrl } from "./import-url";
import { MORNING_BRIEF_SOURCE_ADAPTERS } from "./sources";
import type { MorningBriefSourceAdapter, SourceCandidate, SourceIngestionSummary } from "./sources";
import { classificationInputHash, liveCandidateContentHash } from "./ingestion-contract";
import { isMorningBriefEligible, MAX_MORNING_BRIEF_ELIGIBILITY_WINDOW_HOURS } from "./freshness-policy";
import { needsLiveMorningBriefClassification } from "./live-processing-contract";
import { LIVE_INGESTION_BATCH_LIMITS, LIVE_INGESTION_CANDIDATE_LIMITS, LIVE_PENDING_AI_TIMEOUT_MS, LIVE_PENDING_BATCH_SIZE, LIVE_PENDING_SCAN_LIMIT } from "./sources/config";
import { mapBounded } from "./ingestion-runtime";
import { selectMorningBriefPendingBatch } from "./pending-pipeline";
export { classificationInputHash, shouldReuseLiveClassification } from "./ingestion-contract";

type LiveArticle = Database["public"]["Tables"]["morning_brief_articles"]["Row"];
type LiveClassification = Database["public"]["Tables"]["morning_brief_article_classifications"]["Row"];
type PendingArticle = { article: LiveArticle; candidate: SourceCandidate; needsClassification: boolean };
type PersistedCandidate = "new" | "duplicate" | "updated" | "skipped";
export type MorningBriefClassificationDiagnostic = {
  headline: string;
  source: string;
  luna: Pick<LiveClassification, "confidence" | "significance" | "consequence" | "scope"> | null;
  escalationReason: "low_confidence" | "invalid_structure" | "important_uncertain" | "other" | null;
  finalTerraConfidence: number | null;
};

const sourceMetadata = (slug: SourceCandidate["sourceSlug"]) => ({ live_public_source: true, source_slug: slug });
const emptySummary = (source: string): SourceIngestionSummary => ({ source, fetched: 0, parsed: 0, considered: 0, filtered: 0, invalid: 0, stale: 0, outsideBatchLimit: 0, skipped: 0, new: 0, duplicates: 0, classified: 0, reusedClassifications: 0, embedded: 0, reusedEmbeddings: 0, failed: 0 });
const safeError = (error: unknown) => error instanceof Error ? error.message.slice(0, 180) : "Unknown error";
const metadata = (article: LiveArticle) => article.raw_metadata_json as Record<string, unknown>;
const stringArray = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
const sourceNames: Record<string, string> = { yle: "Yle", "bank-of-finland": "Bank of Finland", ecb: "European Central Bank", "pyn-elite": "PYN Elite", "vietnam-statistics": "National Statistics Office of Vietnam", "federal-reserve": "Federal Reserve", eurostat: "Eurostat" };
const candidateAsExtracted = (candidate: SourceCandidate): ExtractedArticle => ({ canonicalUrl: candidate.canonicalUrl, title: candidate.title, excerpt: candidate.excerpt, author: candidate.author, publishedAt: candidate.publishedAt, language: candidate.language, imageUrl: candidate.imageUrl, siteName: sourceNames[candidate.sourceSlug] ?? candidate.sourceSlug, text: "", contentAvailability: candidate.excerpt.length >= 220 ? "partial_text" : "metadata_only" });

function candidateFromArticle(article: LiveArticle): SourceCandidate {
  const raw = metadata(article);
  return { sourceSlug: typeof raw.source_slug === "string" ? raw.source_slug : "yle", sourceArticleId: article.source_article_id ?? article.id, title: article.title, canonicalUrl: article.canonical_url, excerpt: article.excerpt ?? "", publishedAt: article.published_at, author: article.author ?? undefined, categories: stringArray(raw.categories), imageUrl: article.image_url ?? undefined, language: article.language ?? "en", contentType: article.content_type, rawMetadata: raw };
}

async function ensureLiveSources(db: SupabaseClient<Database>) {
  const rows = [
    { slug: "yle", name: "Yle", base_url: "https://yle.fi", source_type: "rss" as const, default_language: "fi", enabled: true, default_content_type: "news" as const, metadata_json: sourceMetadata("yle") },
    { slug: "bank-of-finland", name: "Bank of Finland", base_url: "https://www.suomenpankki.fi", source_type: "official" as const, default_language: "en", enabled: true, default_content_type: "news" as const, metadata_json: sourceMetadata("bank-of-finland") },
    { slug: "ecb", name: "European Central Bank", base_url: "https://www.ecb.europa.eu", source_type: "rss" as const, default_language: "en", enabled: true, default_content_type: "news" as const, metadata_json: sourceMetadata("ecb") },
    { slug: "pyn-elite", name: "PYN Elite", base_url: "https://www.pyn.fi", source_type: "official" as const, default_language: "en", enabled: true, default_content_type: "news" as const, metadata_json: { ...sourceMetadata("pyn-elite"), source_family: "portfolio_manager_official", portfolio_lens: "PYN Elite" } },
    { slug: "vietnam-statistics", name: "National Statistics Office of Vietnam", base_url: "https://www.nso.gov.vn", source_type: "official" as const, default_language: "en", enabled: true, default_content_type: "news" as const, metadata_json: { ...sourceMetadata("vietnam-statistics"), source_family: "official_primary_statistics", country: "Vietnam" } },
    { slug: "federal-reserve", name: "Federal Reserve", base_url: "https://www.federalreserve.gov", source_type: "rss" as const, default_language: "en", enabled: true, default_content_type: "news" as const, metadata_json: { ...sourceMetadata("federal-reserve"), source_family: "official_primary_policy", country: "United States" } },
    { slug: "eurostat", name: "Eurostat", base_url: "https://ec.europa.eu/eurostat", source_type: "rss" as const, default_language: "en", enabled: true, default_content_type: "news" as const, metadata_json: { ...sourceMetadata("eurostat"), source_family: "official_primary_statistics", region: "Europe" } },
  ];
  const { data, error } = await db.from("morning_brief_sources").upsert(rows, { onConflict: "slug" }).select("id,slug");
  if (error || !data) throw error ?? new Error("Could not persist live news sources.");
  return new Map(data.map((row) => [row.slug, row.id]));
}

async function persistCandidate(db: SupabaseClient<Database>, sourceId: string, candidate: SourceCandidate, summary: SourceIngestionSummary, allowNew: boolean): Promise<PersistedCandidate> {
  const canonicalUrl = normalizeImportUrl(candidate.canonicalUrl); const nextContentHash = liveCandidateContentHash(candidate);
  const { data: bySource } = await db.from("morning_brief_articles").select("id,content_hash").eq("source_id", sourceId).eq("source_article_id", candidate.sourceArticleId).maybeSingle();
  const { data: byUrl } = bySource ? { data: null } : await db.from("morning_brief_articles").select("id,content_hash").eq("source_id", sourceId).eq("canonical_url", canonicalUrl).maybeSingle();
  const existing = bySource ?? byUrl;
  const row = { source_id: sourceId, source_article_id: candidate.sourceArticleId, title: candidate.title, excerpt: candidate.excerpt || null, canonical_url: canonicalUrl, author: candidate.author ?? null, published_at: candidate.publishedAt, fetched_at: new Date().toISOString(), language: candidate.language, content_type: candidate.contentType ?? "news" as const, access_type: "public" as const, image_url: candidate.imageUrl ?? null, image_alt: null, image_source: candidate.imageUrl ? candidate.sourceSlug : null, raw_metadata_json: { ...candidate.rawMetadata, ...sourceMetadata(candidate.sourceSlug), classification_input_hash: classificationInputHash(candidate), classified_input_hash: null }, content_hash: nextContentHash };
  if (!existing) {
    if (!allowNew) return "skipped";
    const { error } = await db.from("morning_brief_articles").insert(row); if (error) throw error;
    summary.new += 1; return "new";
  }
  if (existing.content_hash === nextContentHash) { summary.duplicates += 1; return "duplicate"; }
  const { error } = await db.from("morning_brief_articles").update(row).eq("id", existing.id); if (error) throw error;
  return "updated";
}

function hasCurrentClassification(article: LiveArticle, classification: LiveClassification | null) {
  if (!classification) return false;
  const raw = metadata(article); const currentHash = classificationInputHash(candidateFromArticle(article));
  // Legacy rows predate classified_input_hash; they were only persisted after their old synchronous classifier completed.
  const persistedHash = typeof raw.classified_input_hash === "string" ? raw.classified_input_hash : raw.classification_input_hash;
  return !needsLiveMorningBriefClassification(classification.classification_version, persistedHash, currentHash);
}

function hasCurrentEmbedding(article: LiveArticle, classification: LiveClassification | null, hashes: Set<string> | undefined) {
  if (!classification || !hashes) return false;
  const input = buildEmbeddingInput({ ...article, ...classification });
  return hashes.has(embeddingInputHash(input));
}

async function listPendingArticles(db: SupabaseClient<Database>, now = new Date()): Promise<PendingArticle[]> {
  const cutoff = new Date(now.getTime() - MAX_MORNING_BRIEF_ELIGIBILITY_WINDOW_HOURS * 3_600_000).toISOString();
  const { data: articles, error } = await db.from("morning_brief_articles").select("*").contains("raw_metadata_json", { live_public_source: true }).gte("published_at", cutoff).order("fetched_at", { ascending: false }).limit(LIVE_PENDING_SCAN_LIMIT);
  if (error) throw error;
  const ids = (articles ?? []).map((article) => article.id); if (!ids.length) return [];
  const [{ data: classifications }, { data: embeddings }] = await Promise.all([
    db.from("morning_brief_article_classifications").select("*").in("article_id", ids).eq("classification_version", IMPORT_CLASSIFICATION_VERSION).order("created_at", { ascending: false }),
    db.from("morning_brief_article_embeddings").select("article_id,input_hash").in("article_id", ids).eq("embedding_model", EMBEDDING_MODEL).eq("embedding_version", EMBEDDING_VERSION),
  ]);
  const classificationByArticle = new Map<string, LiveClassification>(); for (const item of classifications ?? []) if (!classificationByArticle.has(item.article_id)) classificationByArticle.set(item.article_id, item);
  const embeddingHashes = new Map<string, Set<string>>(); for (const item of embeddings ?? []) embeddingHashes.set(item.article_id, new Set([...(embeddingHashes.get(item.article_id) ?? []), item.input_hash]));
  return (articles ?? []).flatMap((article): PendingArticle[] => {
    if (!isMorningBriefEligible(article.published_at, { rawMetadata: metadata(article), contentType: article.content_type }, now)) return [];
    const candidate = candidateFromArticle(article); const classification = classificationByArticle.get(article.id) ?? null; const needsClassification = !hasCurrentClassification(article, classification);
    return needsClassification || !hasCurrentEmbedding(article, classification, embeddingHashes.get(article.id)) ? [{ article, candidate, needsClassification }] : [];
  });
}

export async function getMorningBriefPendingArticleCount(db: SupabaseClient<Database> = createServiceSupabaseClient()) {
  return (await listPendingArticles(db)).length;
}

async function persistClassification(db: SupabaseClient<Database>, pending: PendingArticle) {
  const classified = await classifyImportedArticle(candidateAsExtracted(pending.candidate), { timeoutMs: LIVE_PENDING_AI_TIMEOUT_MS });
  const { error } = await db.from("morning_brief_article_classifications").upsert({ article_id: pending.article.id, countries: classified.data.countries, regions: classified.data.regions, categories: classified.data.categories, topics: classified.data.topics, sectors: classified.data.sectors, companies: classified.data.companies, people: classified.data.people, asset_classes: classified.data.assetClasses, funds: classified.data.funds, event_type: classified.data.eventType, significance: classified.data.significance, consequence: classified.data.consequence, scope: classified.data.scope, confidence: classified.data.confidence, primary_section: classified.data.primarySection, summary: classified.data.summary, why_it_matters: classified.data.whyItMatters, classification_version: IMPORT_CLASSIFICATION_VERSION }, { onConflict: "article_id,classification_version" });
  if (error) throw error;
  const { error: metadataError } = await db.from("morning_brief_articles").update({ raw_metadata_json: { ...metadata(pending.article), classified_input_hash: classificationInputHash(pending.candidate) } }).eq("id", pending.article.id);
  if (metadataError) throw metadataError;
  const luna = classified.lunaFirstPass ? {
    confidence: classified.lunaFirstPass.confidence,
    significance: classified.lunaFirstPass.significance,
    consequence: classified.lunaFirstPass.consequence,
    scope: classified.lunaFirstPass.scope,
  } : null;
  const diagnostic: MorningBriefClassificationDiagnostic = {
    headline: pending.candidate.title,
    source: pending.candidate.sourceSlug,
    luna,
    escalationReason: classified.escalationReason,
    finalTerraConfidence: classified.escalationReason ? classified.data.confidence : null,
  };
  return { modelsUsed: classified.modelsUsed, escalationReason: classified.escalationReason, diagnostic };
}

export type IngestMorningBriefSourcesOptions = { sources?: readonly MorningBriefSourceAdapter[]; now?: Date; db?: SupabaseClient<Database> };
/** Fetches and persists only; AI work is deliberately resumed in separate requests. */
export async function ingestMorningBriefSources({ sources = MORNING_BRIEF_SOURCE_ADAPTERS, now = new Date(), db = createServiceSupabaseClient() }: IngestMorningBriefSourcesOptions = {}) {
  const startedAt = Date.now(); const sourceIds = await ensureLiveSources(db);
  const prepared = await Promise.all(sources.map(async (source) => {
    const summary = emptySummary(source.sourceSlug);
    try {
      const candidates = await source.fetchCandidates(); summary.fetched = candidates.length;
      const relevant = source.shouldKeepCandidate ? candidates.filter((candidate) => source.shouldKeepCandidate!(candidate)) : candidates;
      const sourceFiltered = candidates.length - relevant.length;
      const dated = relevant.filter((candidate) => Number.isFinite(Date.parse(candidate.publishedAt)));
      summary.invalid = relevant.length - dated.length;
      const recent = dated.filter((candidate) => isMorningBriefEligible(candidate.publishedAt, { rawMetadata: candidate.rawMetadata, contentType: candidate.contentType }, now));
      summary.stale = dated.length - recent.length;
      summary.parsed = recent.length;
      const limited = recent.slice(0, LIVE_INGESTION_CANDIDATE_LIMITS[source.sourceSlug] ?? 10);
      summary.considered = limited.length;
      summary.outsideBatchLimit = recent.length - limited.length;
      summary.filtered = sourceFiltered + summary.invalid + summary.stale + summary.outsideBatchLimit;
      return { source, summary, candidates: limited };
    }
    catch (error) { summary.failed += 1; summary.error = safeError(error); console.warn("[morning-brief] live source failed", { source: source.sourceSlug, error: summary.error }); return { source, summary, candidates: [] as SourceCandidate[] }; }
  }));
  for (const item of prepared) {
    const sourceId = sourceIds.get(item.source.sourceSlug); if (!sourceId) { item.summary.failed += 1; item.summary.error = "Live source was not configured."; continue; }
    for (const candidate of item.candidates) try {
      const status = await persistCandidate(db, sourceId, candidate, item.summary, item.summary.new < (LIVE_INGESTION_BATCH_LIMITS[item.source.sourceSlug] ?? 3));
      if (status === "skipped") item.summary.skipped += 1;
    } catch (error) { item.summary.failed += 1; console.warn("[morning-brief] live candidate persistence failed", { source: item.source.sourceSlug, error: safeError(error) }); }
  }
  const pending = await listPendingArticles(db); const sourcesSummary = prepared.map((item) => item.summary); const result = { sources: sourcesSummary, pending: pending.length, durationMs: Date.now() - startedAt, partialFailure: sourcesSummary.some((summary) => summary.failed > 0) };
  console.info("[morning-brief] live source fetch complete", result); return result;
}

export async function processMorningBriefPendingBatch(db: SupabaseClient<Database> = createServiceSupabaseClient()) {
  const pending = await listPendingArticles(db); const batch = selectMorningBriefPendingBatch(pending, LIVE_PENDING_BATCH_SIZE); if (!batch.length) return { attempted: 0, processed: 0, failed: 0, remaining: 0, luna: 0, lunaAccepted: 0, terra: 0, terraEscalationPercentage: 0, escalationReasons: { low_confidence: 0, invalid_structure: 0, important_uncertain: 0, other: 0 }, classificationDiagnostics: [] as MorningBriefClassificationDiagnostic[], embedded: 0, errors: [] as string[] };
  const classificationWork = batch.filter((item) => item.needsClassification); let failed = 0; const luna = classificationWork.length; let lunaAccepted = 0; let terra = 0; const escalationReasons = { low_confidence: 0, invalid_structure: 0, important_uncertain: 0, other: 0 }; const errors: string[] = [];
  const classificationDiagnostics: MorningBriefClassificationDiagnostic[] = [];
  const classificationReady = await mapBounded(classificationWork, LIVE_PENDING_BATCH_SIZE, async (item) => {
    try { const result = await persistClassification(db, item); classificationDiagnostics.push(result.diagnostic); if (result.escalationReason) escalationReasons[result.escalationReason] += 1; else lunaAccepted += 1; terra += result.modelsUsed.filter((model) => model.includes("terra")).length; return item.article.id; }
    catch (error) { failed += 1; errors.push(safeError(error)); console.warn("[morning-brief] pending classification failed", { articleId: item.article.id, error: safeError(error) }); return null; }
  });
  const classificationFailed = new Set(classificationWork.map((item) => item.article.id).filter((id) => !classificationReady.includes(id)));
  const embeddingIds = batch.filter((item) => !classificationFailed.has(item.article.id)).map((item) => item.article.id);
  let embedded = 0;
  if (embeddingIds.length) {
    const vectors = await ensureArticleEmbeddings(embeddingIds, { timeoutMs: LIVE_PENDING_AI_TIMEOUT_MS }); embedded = vectors.size;
    const missing = embeddingIds.filter((id) => !vectors.has(id)); if (missing.length) { failed += missing.length; errors.push("Embedding was unavailable for one or more articles."); }
  }
  const remainingPending = await listPendingArticles(db); const remainingIds = new Set(remainingPending.map((item) => item.article.id)); const processed = batch.filter((item) => !remainingIds.has(item.article.id)).length;
  return { attempted: batch.length, processed, failed, remaining: remainingPending.length, luna, lunaAccepted, terra, terraEscalationPercentage: luna ? Number(((terra / luna) * 100).toFixed(1)) : 0, escalationReasons, classificationDiagnostics, embedded, errors };
}
