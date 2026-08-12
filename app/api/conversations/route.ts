import { NextResponse } from "next/server";
import { requireApprovedUser } from "@/lib/auth/guard";
import { listConversations, toPublicError } from "@/lib/elevenlabs/conversations";

export async function GET() {
  try {
    await requireApprovedUser();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kirjaudu sisään.";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  try {
    return NextResponse.json({ conversations: await listConversations() });
  } catch (error) {
    const { message, status } = toPublicError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
