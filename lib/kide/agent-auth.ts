import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { sha256 } from "./control-plane";

export async function requireKideAgent(request: Request) {
  const header = request.headers.get("authorization"); const token = header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return null;
  const supabase = createServiceSupabaseClient();
  const { data: device } = await supabase.from("kide_agent_devices").select("id,user_id").eq("token_hash", sha256(token)).is("revoked_at", null).maybeSingle();
  if (!device) return null;
  await supabase.from("kide_agent_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", device.id);
  return { deviceId: device.id, userId: device.user_id, supabase };
}

export function agentUnauthorized() { return Response.json({ error: "Unauthorized agent." }, { status: 401 }); }
