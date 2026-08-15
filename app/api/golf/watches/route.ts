import { NextResponse, type NextRequest } from "next/server";
import { requireApprovedUser } from "@/lib/auth/guard";
import { createGolfWatch, GolfWatchError, listGolfWatchesForUser } from "@/lib/golf/watches";

async function approvedUser() {
  try { return await requireApprovedUser(); }
  catch { return null; }
}

export async function GET() {
  const auth = await approvedUser();
  if (!auth) return NextResponse.json({ error: "Kirjaudu sisään." }, { status: 401 });
  try { return NextResponse.json({ watches: await listGolfWatchesForUser(auth.supabase, auth.user.id) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Vahtien haku epäonnistui." }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const auth = await approvedUser();
  if (!auth) return NextResponse.json({ error: "Kirjaudu sisään." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Virheellinen vahti." }, { status: 400 }); }
  try { return NextResponse.json({ watch: await createGolfWatch(auth.supabase, auth.user.id, body) }, { status: 201 }); }
  catch (error) {
    const watchError = error instanceof GolfWatchError ? error : new GolfWatchError("Vahdin luonti epäonnistui.", 500);
    return NextResponse.json({ error: watchError.message }, { status: watchError.status });
  }
}
