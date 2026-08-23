import { createAgentToken, sha256 } from "@/lib/kide/control-plane";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  let body: { pairingCode?: unknown; deviceName?: unknown }; try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const pairingCode = typeof body.pairingCode === "string" ? body.pairingCode.trim() : ""; const deviceName = typeof body.deviceName === "string" ? body.deviceName.trim() : "";
  if (!pairingCode || !deviceName || deviceName.length > 100) return Response.json({ error: "Invalid pairing request." }, { status: 400 });
  const supabase = createServiceSupabaseClient(); const { data: userId, error } = await supabase.rpc("consume_kide_agent_pairing", { p_pairing_code_hash: sha256(pairingCode) });
  if (error || !userId) return Response.json({ error: "Invalid or expired pairing code." }, { status: 401 });
  const token = createAgentToken(); const { data: device, error: insertError } = await supabase.from("kide_agent_devices").insert({ user_id: userId, name: deviceName, token_hash: sha256(token), last_seen_at: new Date().toISOString() }).select("id,name").single();
  if (insertError || !device) return Response.json({ error: "Pairing failed." }, { status: 502 });
  return Response.json({ device: { id: device.id, name: device.name }, agentToken: token });
}
