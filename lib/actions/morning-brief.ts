"use server";
import { revalidatePath } from "next/cache";
import { requireApprovedUser } from "@/lib/auth/guard";
import { generateMorningBriefForUser } from "@/lib/morning-brief/generation";
import { canRecordStoryOpen, FEEDBACK_STRENGTH } from "@/lib/morning-brief/learning";
import { applyMorningBriefLearningSignal } from "@/lib/morning-brief/feedback-service";
import { importMorningBriefUrl } from "@/lib/morning-brief/import-service";
import { shouldApplyImportSignal } from "@/lib/morning-brief/import-dedup";
import { getMorningBriefPendingArticleCount, ingestMorningBriefSources, processMorningBriefPendingBatch } from "@/lib/morning-brief/ingestion";

export async function regenerateMorningBrief() {
  try { const { user } = await requireApprovedUser(); if (await getMorningBriefPendingArticleCount()) return { ok: false, error: "Finish live article processing before regenerating Morning Brief." }; await generateMorningBriefForUser(user.id, { mode: "live", now: new Date() }); revalidatePath("/morning-brief"); return { ok: true }; } catch { return { ok: false, error: "Could not regenerate the Morning Brief." }; }
}

/** Manual, authenticated ingestion. Scheduling remains intentionally out of scope. */
export async function fetchLiveMorningBriefSources() {
  try { await requireApprovedUser(); return { ok: true, summary: await ingestMorningBriefSources() }; } catch (error) { console.warn("[morning-brief] manual ingestion action failed", { error: error instanceof Error ? error.message.slice(0, 180) : "Unknown error" }); return { ok: false, error: "Could not fetch live open sources. Please try again." }; }
}

/** One protected, resumable AI-processing request. The browser calls batches sequentially. */
export async function processMorningBriefPendingBatchAction() {
  try { await requireApprovedUser(); return { ok: true, summary: await processMorningBriefPendingBatch() }; } catch (error) { console.warn("[morning-brief] pending batch action failed", { error: error instanceof Error ? error.message.slice(0, 180) : "Unknown error" }); return { ok: false, error: "Could not process the next Morning Brief batch." }; }
}

type UserFeedbackEvent = Exclude<keyof typeof FEEDBACK_STRENGTH, "import"> | "unlike" | "unsave";
const USER_FEEDBACK_EVENTS = new Set<UserFeedbackEvent>(["open", "like", "save", "not_relevant", "show_fewer_like_this", "unlike", "unsave"]);
export async function recordMorningBriefFeedback(storyId: string, eventType: UserFeedbackEvent) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(storyId)) return { ok: false, error: "Invalid story." };
  if (!USER_FEEDBACK_EVENTS.has(eventType)) return { ok: false, error: "Invalid feedback." };
  try {
    const { user, supabase } = await requireApprovedUser();
    const { error } = await supabase.from("morning_brief_feedback").insert({ user_id: user.id, story_cluster_id: storyId, event_type: eventType }); if (error) throw error;
    if (eventType in FEEDBACK_STRENGTH) await applyMorningBriefLearningSignal(user.id, storyId, eventType as keyof typeof FEEDBACK_STRENGTH);
    revalidatePath("/morning-brief"); revalidatePath("/morning-brief/library"); return { ok: true };
  } catch { return { ok: false, error: "Could not save feedback." }; }
}

export async function importMorningBriefArticle(url: string) {
  try {
    const { user, supabase } = await requireApprovedUser(); const result = await importMorningBriefUrl(user.id, supabase, url);
    if (shouldApplyImportSignal(result.duplicate, result.storyId)) { const { error } = await supabase.from("morning_brief_feedback").insert({ user_id: user.id, article_id: result.articleId, story_cluster_id: result.storyId, event_type: "import", signal_strength: 100, metadata_json: { source: "manual_url_import" } }); if (error) throw error; await applyMorningBriefLearningSignal(user.id, result.storyId!, "import"); }
    revalidatePath("/morning-brief"); revalidatePath("/morning-brief/library"); return { ok: true, duplicate: result.duplicate };
  } catch (error) { const message = error instanceof Error && /Only public|credentials|Private|valid URL/i.test(error.message) ? error.message : "Could not import this article."; return { ok: false, error: message }; }
}

export async function recordMorningBriefOpen(storyId: string, now = new Date()) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(storyId)) return { ok: false, recorded: false };
  const { user, supabase } = await requireApprovedUser();
  const { data, error } = await supabase.from("morning_brief_feedback").select("event_type,story_cluster_id,created_at").eq("user_id", user.id).eq("story_cluster_id", storyId).eq("event_type", "open");
  if (error) return { ok: false, recorded: false };
  const events = (data ?? []).map((event) => ({ eventType: "open" as const, storyId: event.story_cluster_id!, createdAt: event.created_at }));
  if (!canRecordStoryOpen(events, storyId, now)) return { ok: true, recorded: false };
  const result = await recordMorningBriefFeedback(storyId, "open"); return { ok: result.ok, recorded: result.ok };
}
