import { NextResponse, type NextRequest } from "next/server";
import { requireApprovedUser } from "@/lib/auth/guard";
import { searchPublicPlayers, validatePlayerSearchRequest } from "@/lib/golf/player-search";
import { WiseGolfAuthRequiredError } from "@/lib/golf/client";

export async function POST(request: NextRequest) {
  try { await requireApprovedUser(); } catch { return NextResponse.json({ error: "Kirjaudu sisään." }, { status: 401 }); }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  try { return NextResponse.json(await searchPublicPlayers(validatePlayerSearchRequest(body))); }
  catch (error) {
    if (error instanceof WiseGolfAuthRequiredError) return NextResponse.json({ error: "WISEGOLF_AUTH_REQUIRED" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
