import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { applyFeedback, DIMENSION_MULTIPLIER, extractPreferenceSignals, FEEDBACK_STRENGTH, type LearnableDimension } from "./learning";

export async function applyMorningBriefLearningSignal(userId: string, storyId: string, eventType: keyof typeof FEEDBACK_STRENGTH) {
  const service = createServiceSupabaseClient();
  const { data: links } = await service.from("morning_brief_cluster_articles").select("article_id").eq("cluster_id", storyId).limit(1);
  const articleId = links?.[0]?.article_id;
  if (!articleId) return;
  const [{ data: article }, { data: classifications }] = await Promise.all([
    service.from("morning_brief_articles").select("*").eq("id", articleId).single(),
    service.from("morning_brief_article_classifications").select("*").eq("article_id", articleId).order("created_at", { ascending: false }).limit(1),
  ]);
  const classification = classifications?.[0];
  if (!article || !classification) return;
  const { data: source } = await service.from("morning_brief_sources").select("name").eq("id", article.source_id).maybeSingle();
  const signals = extractPreferenceSignals({ id: article.id, title: article.title, source: source?.name ?? new URL(article.canonical_url).hostname, publishedAt: article.published_at, contentType: article.content_type, countries: classification.countries, regions: classification.regions, categories: classification.categories, topics: classification.topics, sectors: classification.sectors, companies: classification.companies, eventType: classification.event_type ?? undefined, significance: classification.significance ?? 0, consequence: classification.consequence ?? 0, scope: classification.scope ?? 0, summary: classification.summary ?? "", primarySection: classification.primary_section ?? "world" });
  const { data: existing } = await service.from("morning_brief_learned_interests").select("*").eq("user_id", userId);
  const index = new Map((existing ?? []).map((row) => [`${row.dimension_type}:${row.dimension_key}`, row]));
  const now = new Date(); const strength = FEEDBACK_STRENGTH[eventType];
  const rows = signals.map((signal) => { const old = index.get(`${signal.dimensionType}:${signal.dimensionKey}`); const next = applyFeedback(old ? { dimensionType: old.dimension_type as LearnableDimension, dimensionKey: old.dimension_key, affinityScore: old.affinity_score, lastSignalAt: old.last_signal_at ?? now.toISOString() } : { dimensionType: signal.dimensionType, dimensionKey: signal.dimensionKey, affinityScore: 50, lastSignalAt: now.toISOString() }, strength * DIMENSION_MULTIPLIER[signal.dimensionType], now); return { user_id: userId, dimension_type: signal.dimensionType, dimension_key: signal.dimensionKey, affinity_score: Math.round(next.affinityScore), positive_signal_count: (old?.positive_signal_count ?? 0) + (strength > 0 ? 1 : 0), negative_signal_count: (old?.negative_signal_count ?? 0) + (strength < 0 ? 1 : 0), last_signal_at: now.toISOString(), model_version: "learning-v1" }; });
  if (rows.length) { const { error } = await service.from("morning_brief_learned_interests").upsert(rows, { onConflict: "user_id,dimension_type,dimension_key" }); if (error) throw error; }
}
