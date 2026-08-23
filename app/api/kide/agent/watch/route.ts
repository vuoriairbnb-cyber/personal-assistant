import { requireKideAgent, agentUnauthorized } from "@/lib/kide/agent-auth";

export async function GET(request: Request) {
  const agent = await requireKideAgent(request); if (!agent) return agentUnauthorized();
  const { data: watch } = await agent.supabase.from("kide_watches").select("id,event_id,event_url,target_mode,exact_variant_name,max_price_cents,quantity,sale_start_at,expires_at,status,reservation_attempted,updated_at").eq("user_id", agent.userId).in("status", ["armed", "waiting_for_sale", "waiting_for_variant", "attempting"]).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!watch) return Response.json({ watch: null });
  return Response.json({ watch: { id: watch.id, eventId: watch.event_id, eventUrl: watch.event_url, targetMode: watch.target_mode, exactVariantName: watch.exact_variant_name, maxPriceCents: watch.max_price_cents, quantity: watch.quantity, saleStartAt: watch.sale_start_at, expiresAt: watch.expires_at, status: watch.status, reservationAttempted: watch.reservation_attempted, updatedAt: watch.updated_at } });
}
