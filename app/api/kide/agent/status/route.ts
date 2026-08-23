import { requireKideAgent, agentUnauthorized } from "@/lib/kide/agent-auth";
import { KIDE_WATCH_STATUSES } from "@/lib/kide/control-plane";

const AGENT_REPORTABLE_STATUSES = ["waiting_for_sale", "waiting_for_variant", "attempting", "reserved", "verification_required", "reservation_result_unknown", "expired", "failed"] as const;

export async function POST(request: Request) {
  const agent = await requireKideAgent(request); if (!agent) return agentUnauthorized(); let body: Record<string, unknown>; try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const watchId = typeof body.watchId === "string" ? body.watchId : ""; const status = typeof body.status === "string" && KIDE_WATCH_STATUSES.includes(body.status as typeof KIDE_WATCH_STATUSES[number]) && AGENT_REPORTABLE_STATUSES.includes(body.status as typeof AGENT_REPORTABLE_STATUSES[number]) ? body.status : null;
  if (!watchId || !status) return Response.json({ error: "Invalid status." }, { status: 400 });
  const selectedVariantName = typeof body.selectedVariantName === "string" ? body.selectedVariantName.slice(0, 200) : null; const selectedPriceCents = typeof body.selectedPriceCents === "number" && Number.isInteger(body.selectedPriceCents) && body.selectedPriceCents >= 0 ? body.selectedPriceCents : null;
  const terminal = ["reserved", "verification_required", "reservation_result_unknown", "expired", "failed"].includes(status); const { data, error } = await agent.supabase.from("kide_watches").update({ status, reservation_attempted: ["attempting", "reserved", "verification_required", "reservation_result_unknown", "failed"].includes(status), selected_variant_name: selectedVariantName, selected_price_cents: selectedPriceCents, last_agent_update_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", watchId).eq("user_id", agent.userId).select("id").maybeSingle();
  if (error || !data) return Response.json({ error: "Watch not found." }, { status: 404 });
  return Response.json({ ok: true, terminal });
}
