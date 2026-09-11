import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { logAiCost } from "@/lib/cost/logCost";
import { classifyImportedArticle } from "./classification";
import { IMPORT_CLASSIFICATION_VERSION } from "./classification-contract";
import { fetchPublicArticle } from "./safe-fetch";
import { normalizeImportUrl } from "./import-url";
import { isCompletedImport } from "./import-dedup";
import { ensureArticleEmbeddings } from "./embeddings";

const stableUuid = (value: string) => { const hash = createHash("sha256").update(value).digest("hex"); return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`; };
const sourceSlug = (host: string) => `${host.toLowerCase().replace(/^www\./, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "imported"}-${createHash("sha256").update(host).digest("hex").slice(0, 8)}`;
export async function importMorningBriefUrl(userId: string, userClient: SupabaseClient<Database>, originalUrl: string) {
  const normalizedUrl = normalizeImportUrl(originalUrl);
  const { data: existing } = await userClient.from("morning_brief_imports").select("*").eq("user_id", userId).eq("normalized_url", normalizedUrl).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existing && isCompletedImport(existing.status, existing.linked_article_id)) {
    const service = createServiceSupabaseClient(); const { data: link } = await service.from("morning_brief_cluster_articles").select("cluster_id").eq("article_id", existing.linked_article_id!).limit(1).maybeSingle();
    return { articleId: existing.linked_article_id!, storyId: link?.cluster_id ?? null, duplicate: true };
  }
  const importId = existing?.id;
  const pending = importId ? await userClient.from("morning_brief_imports").update({ status: "processing", error_message: null }).eq("id", importId).select("id").single() : await userClient.from("morning_brief_imports").insert({ user_id: userId, original_url: originalUrl, normalized_url: normalizedUrl, status: "processing" }).select("id").single();
  if (pending.error || !pending.data) throw pending.error ?? new Error("Could not create import.");
  try {
    const extracted = await fetchPublicArticle(normalizedUrl); const canonicalUrl = normalizeImportUrl(extracted.canonicalUrl);
    const classified = await classifyImportedArticle(extracted); const service = createServiceSupabaseClient(); const parsed = new URL(canonicalUrl); const slug = sourceSlug(parsed.hostname);
    const sourceResult = await service.from("morning_brief_sources").upsert({ slug, name: extracted.siteName || parsed.hostname, base_url: `${parsed.protocol}//${parsed.host}`, source_type: "web_metadata", default_language: extracted.language ?? null, enabled: true, default_content_type: classified.data.contentType, metadata_json: { imported: true } }, { onConflict: "slug" }).select("id").single();
    if (sourceResult.error || !sourceResult.data) throw sourceResult.error ?? new Error("Could not persist source.");
    const articleId = stableUuid(`import-article:${canonicalUrl}`); const now = new Date().toISOString(); const publishedAt = extracted.publishedAt && !Number.isNaN(Date.parse(extracted.publishedAt)) ? new Date(extracted.publishedAt).toISOString() : now;
    const { data: persistedArticle } = await service.from("morning_brief_articles").select("id").eq("id", articleId).maybeSingle();
    if (!persistedArticle) { const articleResult = await service.from("morning_brief_articles").insert({ id: articleId, source_id: sourceResult.data.id, source_article_id: canonicalUrl, title: extracted.title, excerpt: extracted.excerpt || classified.data.summary, body_text: extracted.text || null, canonical_url: canonicalUrl, author: extracted.author ?? null, published_at: publishedAt, fetched_at: now, language: extracted.language ?? null, content_type: classified.data.contentType, access_type: "public", image_url: extracted.imageUrl ?? null, image_alt: extracted.imageAlt ?? null, image_source: extracted.siteName, raw_metadata_json: { imported: true, content_availability: extracted.contentAvailability }, content_hash: createHash("sha256").update(extracted.text || extracted.excerpt || extracted.title).digest("hex") }); if (articleResult.error) throw articleResult.error; }
    const classificationResult = await service.from("morning_brief_article_classifications").upsert({ article_id: articleId, countries: classified.data.countries, regions: classified.data.regions, categories: classified.data.categories, topics: classified.data.topics, sectors: classified.data.sectors, companies: classified.data.companies, people: classified.data.people, asset_classes: classified.data.assetClasses, funds: classified.data.funds, event_type: classified.data.eventType, significance: classified.data.significance, consequence: classified.data.consequence, scope: classified.data.scope, confidence: classified.data.confidence, primary_section: classified.data.primarySection, summary: classified.data.summary, why_it_matters: classified.data.whyItMatters, classification_version: IMPORT_CLASSIFICATION_VERSION }, { onConflict: "article_id,classification_version" });
    if (classificationResult.error) throw classificationResult.error;
    // Semantic personalization is optional: provider failures are isolated inside this helper.
    await ensureArticleEmbeddings([articleId]);
    let { data: link } = await service.from("morning_brief_cluster_articles").select("cluster_id").eq("article_id", articleId).limit(1).maybeSingle(); const storyId = link?.cluster_id ?? stableUuid(`import-cluster:${articleId}`);
    if (!link) { const cluster = await service.from("morning_brief_story_clusters").upsert({ id: storyId, primary_article_id: articleId, canonical_headline: extracted.title, canonical_summary: classified.data.summary, event_key: `import:${articleId}`, display_image_url: extracted.imageUrl ?? null, display_image_alt: extracted.imageAlt ?? null, display_image_source: extracted.siteName, first_published_at: publishedAt, latest_published_at: publishedAt, source_count: 1, cluster_version: "import-v1" }, { onConflict: "id" }); if (cluster.error) throw cluster.error; const linked = await service.from("morning_brief_cluster_articles").upsert({ cluster_id: storyId, article_id: articleId, relation_type: "primary", similarity: 1, source_priority: 1 }, { onConflict: "cluster_id,article_id" }); if (linked.error) throw linked.error; link = { cluster_id: storyId }; }
    const completed = await userClient.from("morning_brief_imports").update({ linked_article_id: articleId, status: "completed", import_strength: 100, processed_at: now, error_message: null }).eq("id", pending.data.id); if (completed.error) throw completed.error;
    await logAiCost(service, { userId, tripId: null, feature: "morning_brief_import_classification", model: classified.model, inputTokens: classified.inputTokens, outputTokens: classified.outputTokens });
    return { articleId, storyId, duplicate: false };
  } catch (error) {
    await userClient.from("morning_brief_imports").update({ status: "failed", error_message: error instanceof Error ? error.message.slice(0, 300) : "Import failed", processed_at: new Date().toISOString() }).eq("id", pending.data.id);
    throw error;
  }
}
