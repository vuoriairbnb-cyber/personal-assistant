import { NextResponse, type NextRequest } from "next/server";
import { requireApprovedUser } from "@/lib/auth/guard";
import { cancelPlayerWatch, PlayerWatchError } from "@/lib/golf/player-watches";

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  let auth;
  try { auth = await requireApprovedUser(); }
  catch { return NextResponse.json({ error: "Kirjaudu sisään." }, { status: 401 }); }
  try {
    const { id } = await context.params;
    await cancelPlayerWatch(auth.supabase, auth.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const watchError = error instanceof PlayerWatchError ? error : new PlayerWatchError("Pelaajavahdin poisto epäonnistui.", 500);
    return NextResponse.json({ error: watchError.message }, { status: watchError.status });
  }
}
