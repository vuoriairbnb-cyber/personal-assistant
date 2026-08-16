import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, GolfWatchStatus } from "@/types/database";
import { KLUBIT, getClub, getCourse } from "@/lib/golf/clubs";
import { helsinkiNow, searchCourseDay, type GolfSearchTarget } from "@/lib/golf/search";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { normalizeGolfWatchInput, WatchInputError } from "./watch-input";
import { earliestWatchMatch } from "./watch-matching";
export { MAX_WATCH_COURSES } from "./watch-input";

export const MAX_ACTIVE_GOLF_WATCHES = 3;
const HELSINKI_TIME_ZONE = "Europe/Helsinki";

type GolfWatchRow = Database["public"]["Tables"]["golf_watches"]["Row"];
type UserClient = SupabaseClient<Database>;

export class GolfWatchError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

/** Converts a Helsinki wall-clock date/time to an ISO instant without relying on server timezone. */
export function helsinkiWallTimeToIso(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wallAsUtc = Date.UTC(year!, month! - 1, day!, hour!, minute!);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: HELSINKI_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(wallAsUtc));
  const value = (kind: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === kind)?.value ?? "0");
  const displayedAsUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"));
  return new Date(wallAsUtc - (displayedAsUtc - wallAsUtc)).toISOString();
}


function targetsForWatch(watch: Pick<GolfWatchRow, "courses" | "search_all_supported">): GolfSearchTarget[] {
  const savedCourses = Array.isArray(watch.courses) ? watch.courses : [];
  if (watch.search_all_supported) {
    // This flag is reserved for programmatic callers; the UI saves explicit courses.
    return KLUBIT.flatMap((club) => club.kentat.map((course) => ({ club, course })));
  }
  return savedCourses.flatMap((entry) => {
    const [clubId, courseId] = entry.split(":");
    const club = clubId ? getClub(clubId) : undefined;
    const course = club && courseId ? getCourse(club, courseId) : undefined;
    return club && course ? [{ club, course }] : [];
  });
}

export async function createGolfWatch(supabase: UserClient, userId: string, input: unknown) {
  let watch;
  try { watch = normalizeGolfWatchInput(input, helsinkiNow()); }
  catch (error) { throw new GolfWatchError(error instanceof WatchInputError ? error.message : "Virheellinen vahti."); }
  const { count, error: countError } = await supabase.from("golf_watches").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "active");
  if (countError) throw new GolfWatchError("Vahdin luonti epäonnistui.", 500);
  if ((count ?? 0) >= MAX_ACTIVE_GOLF_WATCHES) throw new GolfWatchError("Aktiivisten golf-vahtien enimmäismäärä on 3.", 409);
  const { data, error } = await supabase.from("golf_watches").insert({
    user_id: userId, courses: watch.courses, search_all_supported: watch.searchAllSupported,
    date: watch.date, time_from: watch.timeFrom, time_to: watch.timeTo, players: watch.players,
    status: "active", expires_at: helsinkiWallTimeToIso(watch.date, watch.expiresAtTime), next_check_at: new Date().toISOString(),
  }).select().single();
  if (error) {
    if (error.message.includes("active golf watch limit")) throw new GolfWatchError("Aktiivisten golf-vahtien enimmäismäärä on 3.", 409);
    throw new GolfWatchError("Vahdin luonti epäonnistui.", 500);
  }
  return data;
}

const statusOrder: Record<GolfWatchStatus, number> = { active: 0, processing: 0, matched: 1, expired: 2, cancelled: 3 };
export async function listGolfWatchesForUser(supabase: UserClient, userId: string) {
  const { data, error } = await supabase.from("golf_watches").select("*").eq("user_id", userId).neq("status", "cancelled").order("created_at", { ascending: false });
  if (error) throw new GolfWatchError("Vahtien haku epäonnistui.", 500);
  return (data ?? []).sort((left, right) => statusOrder[left.status] - statusOrder[right.status] || right.created_at.localeCompare(left.created_at));
}

export async function cancelGolfWatch(supabase: UserClient, userId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new GolfWatchError("Virheellinen vahti.");
  const { data, error } = await supabase.from("golf_watches").update({ status: "cancelled", next_check_at: null, processing_started_at: null }).eq("id", id).eq("user_id", userId).eq("status", "active").select().maybeSingle();
  if (error) throw new GolfWatchError("Vahdin poisto epäonnistui.", 500);
  if (!data) throw new GolfWatchError("Vahtia ei löytynyt tai sitä ei voi enää peruuttaa.", 404);
  return data;
}

async function rescheduleWatch(service: UserClient, id: string) {
  const now = new Date();
  const nextCheckAt = new Date(now.getTime() + 5 * 60_000).toISOString();
  const { error } = await service.from("golf_watches").update({ status: "active", processing_started_at: null, last_checked_at: now.toISOString(), next_check_at: nextCheckAt }).eq("id", id).eq("status", "processing");
  if (error) throw error;
  return nextCheckAt;
}

function safeErrorSummary(error: unknown) {
  const candidate = error && typeof error === "object" ? error as { name?: unknown; status?: unknown } : {};
  return {
    name: typeof candidate.name === "string" && /^[\w -]{1,80}$/.test(candidate.name) ? candidate.name : "Error",
    message: "watch processing failed",
    ...(typeof candidate.status === "number" && Number.isFinite(candidate.status) ? { statusCode: candidate.status } : {}),
  };
}

/** Cron-only worker. It only searches and writes an outbox event; it never delivers a notification. */
export async function processDueGolfWatches(limit = 25) {
  const service = createServiceSupabaseClient();
  // This is observability only. The claim RPC remains the source of truth that
  // actually expires watches atomically before it claims due work.
  const { data: expiringWatches } = await service.from("golf_watches")
    .select("id").eq("status", "active").lte("expires_at", new Date().toISOString());
  const expiredWatches = expiringWatches ?? [];
  const { data, error } = await service.rpc("claim_due_golf_watches", { p_limit: limit });
  if (error) throw new Error("Golf watch claim failed");
  const watches = (data ?? []) as GolfWatchRow[];
  console.info("[golf-watch] due watches loaded", { count: watches.length });
  let matched = 0;
  let rescheduled = 0;
  let failed = 0;
  for (const watch of watches) {
    console.info("[golf-watch] watch check started", {
      watchId: watch.id, courses: watch.courses, searchAllSupported: watch.search_all_supported,
      date: watch.date, timeFrom: watch.time_from, timeTo: watch.time_to, players: watch.players,
    });
    try {
      const targets = targetsForWatch(watch);
      const days = await Promise.all(targets.map((target) => searchCourseDay(target, watch.date, { min: watch.players, after: watch.time_from, before: watch.time_to })));
      const match = earliestWatchMatch(days);
      if (!match) {
        const nextCheckAt = await rescheduleWatch(service, watch.id);
        rescheduled += 1;
        console.info("[golf-watch] watch rescheduled after failure", { watchId: watch.id, nextCheckAt });
        continue;
      }
      const payload = {
        watch_id: watch.id, course: match.course, date: watch.date, time: match.time,
        available_spots: match.availableSpots, players: watch.players,
        time_from: watch.time_from, time_to: watch.time_to,
      };
      const completed = await service.rpc("complete_golf_watch_match", {
        p_watch_id: watch.id, p_course: match.course, p_time: match.time,
        p_available_spots: match.availableSpots, p_payload: payload,
      });
      if (completed.error) throw completed.error;
      if (completed.data) {
        matched += 1;
        console.info("[golf-watch] watch matched", {
          watchId: watch.id, course: match.course, date: watch.date,
          time: match.time, availableSpots: match.availableSpots,
        });
      }
    } catch (error) {
      // Provider and transient infrastructure failures stay recoverable and retry on the next run.
      failed += 1;
      console.error("[golf-watch] watch check failed", { watchId: watch.id, error: safeErrorSummary(error) });
      try {
        const nextCheckAt = await rescheduleWatch(service, watch.id);
        rescheduled += 1;
        console.info("[golf-watch] watch no match", { watchId: watch.id, nextCheckAt });
      } catch (rescheduleError) {
        console.error("[golf-watch] watch check failed", { watchId: watch.id, error: safeErrorSummary(rescheduleError) });
      }
    }
  }
  for (const watch of expiredWatches) {
    // Only the watch UUID is logged; no user or provider data is included.
    console.info("[golf-watch] watch expired", { watchId: watch.id });
  }
  return { processed: watches.length, matched, rescheduled, expired: expiredWatches.length, failed };
}
