"use server";

import { requireApprovedUser } from "@/lib/auth/guard";
import { getKideEvent } from "@/lib/kide/client";
import { parseKideEventId } from "@/lib/kide/event-id";
import { KideError, type KideEvent } from "@/lib/kide/types";
import { createPairingCode, sha256, validateKideWatchInput, type KideWatchInput } from "@/lib/kide/control-plane";

export type KideInspectionResult = { ok: true; event: KideEvent } | { ok: false; error: string };
export type KideActionResult = { ok: true; pairingCode?: string } | { ok: false; error: string };

export async function inspectKideEvent(input: string): Promise<KideInspectionResult> {
  try {
    await requireApprovedUser();
    return { ok: true, event: await getKideEvent(parseKideEventId(input)) };
  } catch (error) {
    if (error instanceof KideError) return { ok: false, error: error.message };
    return { ok: false, error: "Kide-tapahtumaa ei voitu hakea." };
  }
}

export async function createKidePairingCode(): Promise<KideActionResult> {
  try { const { user, supabase } = await requireApprovedUser(); const pairingCode = createPairingCode(); const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString(); const { error } = await supabase.from("kide_agent_pairings").insert({ user_id: user.id, pairing_code_hash: sha256(pairingCode), expires_at: expiresAt }); if (error) throw error; return { ok: true, pairingCode }; } catch { return { ok: false, error: "Could not create a pairing code." }; }
}

export async function armKideWatch(input: KideWatchInput): Promise<KideActionResult> {
  let watch: ReturnType<typeof validateKideWatchInput>;
  try { watch = validateKideWatchInput(input); } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Invalid watch configuration." }; }
  try { const { user, supabase } = await requireApprovedUser(); const { error } = await supabase.from("kide_watches").insert({ user_id: user.id, event_id: watch.eventId, event_url: `https://kide.app/events/${watch.eventId}`, target_mode: watch.targetMode, exact_variant_name: watch.exactVariantName, max_price_cents: watch.maxPriceCents, sale_start_at: watch.saleStartAt, expires_at: watch.expiresAt, status: "armed", armed_at: new Date().toISOString() }); if (error) return { ok: false, error: "A Kide watch is already active or could not be armed." }; return { ok: true }; } catch { return { ok: false, error: "Could not arm Kide watch." }; }
}

export async function disarmKideWatch(watchId: string): Promise<KideActionResult> {
  try { const { user, supabase } = await requireApprovedUser(); const { error } = await supabase.from("kide_watches").update({ status: "disarmed", disarmed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", watchId).eq("user_id", user.id); if (error) throw error; return { ok: true }; } catch { return { ok: false, error: "Could not disarm Kide watch." }; }
}

export async function revokeKideAgent(deviceId: string): Promise<KideActionResult> {
  try { const { user, supabase } = await requireApprovedUser(); const { error } = await supabase.from("kide_agent_devices").update({ revoked_at: new Date().toISOString() }).eq("id", deviceId).eq("user_id", user.id); if (error) throw error; return { ok: true }; } catch { return { ok: false, error: "Could not revoke Kide agent." }; }
}
