import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { EMBEDDING_MODEL, EMBEDDING_VERSION, parseVector } from "./embeddings";
import { buildSemanticProfile, semanticSeedIntent, semanticSeedWeight, type SemanticEvent, type SemanticSeed } from "./semantic";

export async function loadUserSemanticProfile(userId: string, now: Date) {
  const db = createServiceSupabaseClient(); const { data: feedback } = await db.from("morning_brief_feedback").select("story_cluster_id,event_type,created_at").eq("user_id", userId).not("story_cluster_id", "is", null);
  const byStory = new Map<string, SemanticEvent[]>(); for (const event of feedback ?? []) if (event.story_cluster_id) byStory.set(event.story_cluster_id, [...(byStory.get(event.story_cluster_id) ?? []), { storyId: event.story_cluster_id, eventType: event.event_type, createdAt: event.created_at }]);
  const storyIds = [...byStory.keys()]; if (!storyIds.length) return null;
  const { data: links } = await db.from("morning_brief_cluster_articles").select("cluster_id,article_id").in("cluster_id", storyIds); const primaryByStory = new Map<string, string>(); for (const link of links ?? []) if (!primaryByStory.has(link.cluster_id)) primaryByStory.set(link.cluster_id, link.article_id);
  const articleIds = [...new Set(primaryByStory.values())]; const { data: embeddings } = await db.from("morning_brief_article_embeddings").select("article_id,embedding,created_at").in("article_id", articleIds).eq("embedding_model", EMBEDDING_MODEL).eq("embedding_version", EMBEDDING_VERSION).order("created_at", { ascending: false }); const embeddingByArticle = new Map<string, number[]>(); for (const row of embeddings ?? []) if (!embeddingByArticle.has(row.article_id)) { const vector = parseVector(row.embedding); if (vector) embeddingByArticle.set(row.article_id, vector); }
  const seeds: SemanticSeed[] = []; for (const [storyId, events] of byStory) { const intent = semanticSeedIntent(events); const articleId = primaryByStory.get(storyId); const vector = articleId ? embeddingByArticle.get(articleId) : null; if (!intent || !vector) continue; const lastIntentAt = [...events].filter((event) => event.eventType === intent).at(-1)?.createdAt ?? events.at(-1)!.createdAt; seeds.push({ storyId, vector, intent, createdAt: lastIntentAt, weight: semanticSeedWeight(intent, lastIntentAt, now) }); }
  return buildSemanticProfile(seeds);
}
