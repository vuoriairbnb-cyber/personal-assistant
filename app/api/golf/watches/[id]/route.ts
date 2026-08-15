import { NextResponse, type NextRequest } from "next/server";
import { requireApprovedUser } from "@/lib/auth/guard";
import { cancelGolfWatch, GolfWatchError } from "@/lib/golf/watches";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let auth;
  try { auth = await requireApprovedUser(); }
  catch { return NextResponse.json({ error: "Kirjaudu sisään." }, { status: 401 }); }
  try {
    const { id } = await params;
    return NextResponse.json({ watch: await cancelGolfWatch(auth.supabase, auth.user.id, id) });
  } catch (error) {
    const watchError = error instanceof GolfWatchError ? error : new GolfWatchError("Vahdin poisto epäonnistui.", 500);
    return NextResponse.json({ error: watchError.message }, { status: watchError.status });
  }
}
