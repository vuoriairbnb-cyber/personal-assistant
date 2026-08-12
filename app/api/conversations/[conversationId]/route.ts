import { NextResponse, type NextRequest } from "next/server";
import { requireApprovedUser } from "@/lib/auth/guard";
import { getConversation, isSafeConversationId, toPublicError } from "@/lib/elevenlabs/conversations";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    await requireApprovedUser();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kirjaudu sisään.";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const { conversationId } = await params;
  if (!isSafeConversationId(conversationId)) {
    return NextResponse.json({ error: "Virheellinen keskustelutunniste." }, { status: 400 });
  }

  try {
    return NextResponse.json({ conversation: await getConversation(conversationId) });
  } catch (error) {
    const { message, status } = toPublicError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
