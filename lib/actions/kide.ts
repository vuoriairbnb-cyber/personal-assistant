"use server";

import { requireApprovedUser } from "@/lib/auth/guard";
import { getKideEvent } from "@/lib/kide/client";
import { parseKideEventId } from "@/lib/kide/event-id";
import { KideError, type KideEvent } from "@/lib/kide/types";

export type KideInspectionResult = { ok: true; event: KideEvent } | { ok: false; error: string };

export async function inspectKideEvent(input: string): Promise<KideInspectionResult> {
  try {
    await requireApprovedUser();
    return { ok: true, event: await getKideEvent(parseKideEventId(input)) };
  } catch (error) {
    if (error instanceof KideError) return { ok: false, error: error.message };
    return { ok: false, error: "Kide-tapahtumaa ei voitu hakea." };
  }
}
