import { createHash, randomBytes } from "node:crypto";
import { parseKideEventId } from "./event-id.ts";

export const KIDE_WATCH_STATUSES = ["draft", "armed", "waiting_for_sale", "waiting_for_variant", "attempting", "reserved", "verification_required", "reservation_result_unknown", "expired", "disarmed", "failed"] as const;
export type KideWatchStatus = typeof KIDE_WATCH_STATUSES[number];
export type KideTargetMode = "exact_variant" | "first_available_under_price";
export const ACTIVE_KIDE_WATCH_STATUSES: KideWatchStatus[] = ["armed", "waiting_for_sale", "waiting_for_variant", "attempting"];

export function sha256(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function createPairingCode() { const value = randomBytes(6).toString("hex").toUpperCase(); return `KIDE-${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}`; }
export function createAgentToken() { return randomBytes(32).toString("base64url"); }
export function parsePriceCents(value: unknown) {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,5})(?:[,.](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

export type KideWatchInput = { event: string; targetMode: KideTargetMode; exactVariantName?: string; maxPrice?: string; quantity?: number; saleStartAt: string; timeoutMinutes: number; startWatchingNow?: boolean };
export function validateKideWatchInput(input: KideWatchInput, now = Date.now()) {
  const eventId = parseKideEventId(input.event); const targetMode = input.targetMode;
  const exactVariantName = input.exactVariantName?.trim() || null; const maxPriceCents = targetMode === "first_available_under_price" ? parsePriceCents(input.maxPrice) : null;
  if (!(["exact_variant", "first_available_under_price"] as string[]).includes(targetMode)) throw new Error("Invalid target mode.");
  if (targetMode === "exact_variant" && !exactVariantName) throw new Error("Enter an exact ticket name.");
  if (targetMode === "first_available_under_price" && (maxPriceCents === null || maxPriceCents > 1_000_000)) throw new Error("Enter a valid maximum price.");
  if (input.quantity !== undefined && input.quantity !== 1) throw new Error("Only one ticket can be reserved.");
  if (!Number.isInteger(input.timeoutMinutes) || input.timeoutMinutes < 1 || input.timeoutMinutes > 60) throw new Error("Enter a valid watch timeout.");
  const saleStart = input.startWatchingNow ? now : Date.parse(input.saleStartAt); if (!Number.isFinite(saleStart)) throw new Error("Choose a valid sale start time.");
  const expiresAt = saleStart + input.timeoutMinutes * 60_000;
  return { eventId, targetMode, exactVariantName: targetMode === "exact_variant" ? exactVariantName : null, maxPriceCents: targetMode === "first_available_under_price" ? maxPriceCents : null, saleStartAt: new Date(saleStart).toISOString(), expiresAt: new Date(expiresAt).toISOString() };
}
