"use server";
import { revalidatePath } from "next/cache";
import { requireApprovedUser } from "@/lib/auth/guard";
import { generateMockMorningBriefForUser } from "@/lib/morning-brief/generation";
import { canRecordStoryOpen, FEEDBACK_STRENGTH } from "@/lib/morning-brief/learning";
import { applyMorningBriefLearningSignal } from "@/lib/morning-brief/feedback-service";
import { importMorningBriefUrl } from "@/lib/morning-brief/import-service";
import { shouldApplyImportSignal } from "@/lib/morning-brief/import-dedup";
import { ingestMorningBriefSources } from "@/lib/morning-brief/ingestion";

export async function regenerateMockMorningBrief() {
  if (process.env.NODE_ENV !== "development") return { ok: false, error: "Mock generation is available only in development." };
  try { const { user } = await requireApprovedUser(); await generateMockMorningBriefForUser(user.id, new Date()); revalidatePath("/morning-brief"); return { ok: true }; } catch { return { ok: false, error: "Could not generate the development brief." }; }
}

/** Deliberately development-only: production scheduling is outside this phase. */
export async function fetchLiveMorningBriefSources() {
  if (process.env.NODE_ENV !== "development") return { ok: false, error: "Live source fetching is available only in development." };
  try { await requireApprovedUser(); return { ok: true, summary: await ingestMorningBriefSources() }; } catch { return { ok: false, error: "Could not fetch live open sources." }; }
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
