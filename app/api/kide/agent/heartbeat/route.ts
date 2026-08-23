import { requireKideAgent, agentUnauthorized } from "@/lib/kide/agent-auth";
export async function POST(request: Request) { const agent = await requireKideAgent(request); if (!agent) return agentUnauthorized(); return Response.json({ ok: true }); }
