import { NextResponse, type NextRequest } from "next/server";
import { requireApprovedUser } from "@/lib/auth/guard";
import { createPlayerWatch, listPlayerWatchesForUser, PlayerWatchError } from "@/lib/golf/player-watches";

async function approvedUser() {
  try { return await requireApprovedUser(); }
  catch { return null; }
}

export async function GET() {
  const auth = await approvedUser();
  if (!auth) return NextResponse.json({ error: "Kirjaudu sisään." }, { status: 401 });
  try { return NextResponse.json({ watches: await listPlayerWatchesForUser(auth.supabase, auth.user.id) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Pelaajavahtien haku epäonnistui." }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const auth = await approvedUser();
  if (!auth) return NextResponse.json({ error: "Kirjaudu sisään." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Virheellinen pelaajavahti." }, { status: 400 }); }
  try { return NextResponse.json({ watch: await createPlayerWatch(auth.supabase, auth.user.id, body) }, { status: 201 }); }
  catch (error) {
    const watchError = error instanceof PlayerWatchError ? error : new PlayerWatchError("Pelaajavahdin luonti epäonnistui.", 500);
    return NextResponse.json({ error: watchError.message }, { status: watchError.status });
  }
}
