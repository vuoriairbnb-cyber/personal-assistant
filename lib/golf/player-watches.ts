import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { KLUBIT, getClub } from "./clubs";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { fetchAuthenticatedReservations } from "./client";
import { playerSearchProducts } from "./player-search-request";
import { courseForExtractedPlayer, extractPublicPlayers, normalizePlayerName } from "./players";
import { helsinkiWallTimeToIso } from "./watches";

type Client = SupabaseClient<Database>;
type Row = Database["public"]["Tables"]["player_watches"]["Row"];
const MAX_ACTIVE = 5;
const MAX_DAYS = 14;

export class PlayerWatchError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime());
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function dates(from: string, to: string) {
  const value: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) value.push(date);
  return value;
}

function resolveCourses(raw: unknown, searchAllSupported: boolean) {
  if (!Array.isArray(raw) || raw.some((value) => typeof value !== "string")) throw new PlayerWatchError("Virheelliset kentät.");
  const candidates = searchAllSupported
    ? KLUBIT.filter((club) => club.playerSearch?.enabled)
    : (raw as string[]).map(getClub).filter(Boolean);
  const clubs = candidates.filter((club): club is (typeof KLUBIT)[number] => Boolean(club?.playerSearch?.enabled));
  if (!clubs.length) throw new PlayerWatchError("Valitse vähintään yksi tuettu klubi.");
  return [...new Map(clubs.map((club) => [club.id, club])).values()];
}

export async function createPlayerWatch(client: Client, userId: string, input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new PlayerWatchError("Virheellinen pelaajavahti.");
  const body = input as Record<string, unknown>;
  if (typeof body.player_name !== "string" || !body.player_name.trim() || body.consent_confirmed !== true) {
    throw new PlayerWatchError("Pelaajan nimi ja suostumus ovat pakollisia.");
  }
  if (!validDate(body.date_from) || !validDate(body.date_to) || body.date_to < body.date_from || body.date_to > addDays(body.date_from, MAX_DAYS - 1)) {
    throw new PlayerWatchError("Ajanjakso voi olla enintään 14 päivää.");
  }
  const searchAllSupported = body.search_all_supported === true;
  const clubs = resolveCourses(body.courses ?? [], searchAllSupported);
  const { count, error: countError } = await client.from("player_watches").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "active");
  if (countError) throw new PlayerWatchError("Pelaajavahdin luonti epäonnistui.", 500);
  if ((count ?? 0) >= MAX_ACTIVE) throw new PlayerWatchError("Aktiivisia pelaajavahteja voi olla enintään 5.", 409);
  const { data, error } = await client.from("player_watches").insert({
    user_id: userId,
    player_name: body.player_name.trim(),
    player_name_normalized: normalizePlayerName(body.player_name),
    courses: clubs.map((club) => club.id),
    search_all_supported: searchAllSupported,
    date_from: body.date_from,
    date_to: body.date_to,
    consent_status: "confirmed",
    consented_at: new Date().toISOString(),
    expires_at: helsinkiWallTimeToIso(body.date_to, "23:59"),
    next_check_at: new Date().toISOString(),
  }).select().single();
  if (error) throw new PlayerWatchError("Pelaajavahdin luonti epäonnistui.", 500);
  return data;
}

export async function listPlayerWatchesForUser(client: Client, userId: string) {
  const { data, error } = await client.from("player_watches").select("*").eq("user_id", userId).neq("status", "cancelled").order("created_at", { ascending: false });
  if (error) throw new PlayerWatchError("Pelaajavahtien haku epäonnistui.", 500);
  return data ?? [];
}

export async function cancelPlayerWatch(client: Client, userId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new PlayerWatchError("Virheellinen pelaajavahti.");
  const { data, error } = await client.from("player_watches").update({ status: "cancelled", next_check_at: null, processing_started_at: null }).eq("id", id).eq("user_id", userId).eq("status", "active").select().maybeSingle();
  if (error) throw new PlayerWatchError("Pelaajavahdin poisto epäonnistui.", 500);
  if (!data) throw new PlayerWatchError("Pelaajavahtia ei löytynyt tai sitä ei voi enää peruuttaa.", 404);
  return data;
}

async function rescheduleWatch(service: Client, id: string) {
  const now = new Date();
  const { error } = await service.from("player_watches").update({
    status: "active", processing_started_at: null, last_checked_at: now.toISOString(), next_check_at: new Date(now.getTime() + 5 * 60_000).toISOString(),
  }).eq("id", id).eq("status", "processing");
  if (error) throw error;
}

/** Cron-only worker. It records deduplicated outbox events but does not deliver player notifications. */
export async function processDuePlayerWatches(limit = 25) {
  const service = createServiceSupabaseClient();
  console.info("[player-watch] cron started");
  const { data, error } = await service.rpc("claim_due_player_watches", { p_limit: limit });
  if (error) throw new Error("Player watch claim failed");
  const watches = (data ?? []) as Row[];
  console.info("[player-watch] due watches loaded", { count: watches.length });
  let newMatches = 0;
  let failed = 0;
  for (const watch of watches) {
    try {
      const clubs = (watch.search_all_supported ? KLUBIT.filter((club) => club.playerSearch?.enabled) : watch.courses.map(getClub).filter(Boolean))
        .filter((club): club is (typeof KLUBIT)[number] => Boolean(club?.playerSearch?.enabled));
      for (const club of clubs) for (const date of dates(watch.date_from, watch.date_to)) for (const group of playerSearchProducts(club)) {
        const response = await fetchAuthenticatedReservations(club, group.productid, date);
        const rows = Array.isArray(response.reservationsGolfPlayers) ? response.reservationsGolfPlayers : [];
        for (const player of extractPublicPlayers(rows)) {
          if (player.date !== date || player.normalizedName !== watch.player_name_normalized) continue;
          const course = courseForExtractedPlayer(group.courses, player.resourceId);
          if (!course) continue;
          const saved = await service.rpc("record_player_watch_match", {
            p_watch_id: watch.id, p_course: course.nimi, p_date: player.date, p_time: player.time,
            p_player_name: player.displayName, p_player_name_normalized: player.normalizedName,
          });
          if (saved.error) throw saved.error;
          if (saved.data) {
            newMatches += 1;
            console.info("[player-watch] new match", { watchId: watch.id, course: course.nimi, date: player.date, time: player.time });
          } else console.info("[player-watch] duplicate match skipped", { watchId: watch.id });
        }
      }
      await rescheduleWatch(service, watch.id);
      console.info("[player-watch] watch checked", { watchId: watch.id });
    } catch {
      failed += 1;
      try { await rescheduleWatch(service, watch.id); }
      catch { /* A failed release remains recoverable through the claim RPC timeout. */ }
      console.error("[player-watch] watch check failed", { watchId: watch.id, error: "watch processing failed" });
    }
  }
  console.info("[player-watch] cron complete", { processed: watches.length, newMatches, failed });
  return { processed: watches.length, newMatches, failed };
}
