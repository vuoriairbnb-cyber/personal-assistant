import "server-only";

const ELEVENLABS_CONVERSATIONS_URL = "https://api.elevenlabs.io/v1/convai/conversations";
const MAX_CONVERSATION_ID_LENGTH = 128;
const CONVERSATION_LIST_PAGE_SIZE = 20;
const DETAIL_ENRICHMENT_CONCURRENCY = 5;

export interface ConversationListItem {
  id: string;
  startedAtUnixSecs: number | null;
  durationSecs: number | null;
  messageCount: number | null;
  status: string | null;
  successful: boolean | null;
  agentName: string | null;
  direction: string | null;
  summary: string | null;
  title: string | null;
  userIdentifier: string | null;
  channel: "whatsapp" | null;
  preview: string;
  adminAttention: { unsupportedCourses: string[] } | null;
}

export interface ConversationTranscriptMessage {
  role: "user" | "agent";
  message: string;
  timeInCallSecs: number | null;
}

export interface ConversationDetail {
  id: string;
  userId: string | null;
  messages: ConversationTranscriptMessage[];
  adminAttention: { unsupportedCourses: string[] } | null;
}

class ElevenLabsError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function adminAttentionFromTranscript(transcript: unknown[]): { unsupportedCourses: string[] } | null {
  const unsupported = new Set<string>();
  const inspect = (value: unknown) => {
    if (typeof value === "string") {
      try { inspect(JSON.parse(value)); } catch { /* regular message text */ }
      return;
    }
    const record = asRecord(value);
    if (!record) return;
    if (record.admin_attention === true && Array.isArray(record.unsupported_courses)) {
      record.unsupported_courses.forEach((course) => { const name = asString(course); if (name) unsupported.add(name); });
    }
    Object.values(record).forEach(inspect);
  };
  transcript.forEach(inspect);
  return unsupported.size ? { unsupportedCourses: [...unsupported] } : null;
}

function getConfig() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) {
    throw new ElevenLabsError("ElevenLabs-integraatiota ei ole määritetty.", 503);
  }
  return { apiKey, agentId };
}

async function elevenLabsFetch(path = "") {
  const { apiKey } = getConfig();
  const response = await fetch(`${ELEVENLABS_CONVERSATIONS_URL}${path}`, {
    headers: { "xi-api-key": apiKey },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new ElevenLabsError(
      response.status === 401 || response.status === 403
        ? "ElevenLabs-tunnistetiedot eivät kelpaa."
        : "Keskustelujen hakeminen ElevenLabsista epäonnistui.",
      response.status
    );
  }
  return response.json() as Promise<unknown>;
}

function sourceIsWhatsApp(value: unknown): boolean {
  return typeof value === "string" && value.toLowerCase().includes("whatsapp");
}

function isInbound(direction: string | null): boolean {
  return direction?.toLowerCase() === "inbound";
}

function displayUserIdentifier(
  userId: string | null,
  channel: ConversationListItem["channel"],
  direction: string | null
): string | null {
  if (!userId) return null;
  return channel === "whatsapp" && isInbound(direction) && /^\d+$/.test(userId)
    ? `+${userId}`
    : userId;
}

function mapListItem(value: unknown): ConversationListItem | null {
  const item = asRecord(value);
  const id = asString(item?.conversation_id);
  if (!item || !id) return null;

  const source = item.conversation_initiation_source;
  const channel = sourceIsWhatsApp(source) ? "whatsapp" : null;
  const direction = asString(item.direction);
  const userIdentifier = asString(item.user_identifier) ?? asString(item.phone_number);
  const summary = asString(item.transcript_summary);
  const title = asString(item.call_summary_title);
  return {
    id,
    startedAtUnixSecs: asNumber(item.start_time_unix_secs),
    durationSecs: asNumber(item.call_duration_secs),
    messageCount: asNumber(item.message_count),
    status: asString(item.status),
    successful: asBoolean(item.call_successful),
    agentName: asString(item.agent_name),
    direction,
    summary,
    title,
    // These are deliberately explicit fields only. Metadata is not forwarded
    // wholesale, avoiding an accidental PII proxy as the API evolves.
    userIdentifier: displayUserIdentifier(userIdentifier, channel, direction),
    channel,
    preview: summary ?? title ?? "Ei viestin esikatselua",
    adminAttention: null,
  };
}

export function isSafeConversationId(value: string): boolean {
  return value.length > 0 && value.length <= MAX_CONVERSATION_ID_LENGTH && /^[A-Za-z0-9_-]+$/.test(value);
}

export async function listConversations(): Promise<ConversationListItem[]> {
  const { agentId } = getConfig();
  const params = new URLSearchParams({ agent_id: agentId, page_size: String(CONVERSATION_LIST_PAGE_SIZE) });
  const payload = asRecord(await elevenLabsFetch(`?${params.toString()}`));
  const conversations = Array.isArray(payload?.conversations) ? payload.conversations : [];
  const items = conversations.map(mapListItem).filter((item): item is ConversationListItem => item !== null);

  return mapWithConcurrency(items, DETAIL_ENRICHMENT_CONCURRENCY, async (item) => {
    try {
      const detail = await getConversation(item.id);
      const firstUserMessage = detail.messages.find((message) => message.role === "user")?.message;
      return {
        ...item,
        userIdentifier: displayUserIdentifier(detail.userId ?? item.userIdentifier, item.channel, item.direction),
        preview: firstUserMessage ?? item.summary ?? item.title ?? "Ei viestin esikatselua",
        adminAttention: detail.adminAttention,
      };
    } catch {
      // One failed detail request must never make the inbox unavailable. The
      // list response already contains a safe fallback preview and identity.
      return item;
    }
  });
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

export async function getConversation(conversationId: string): Promise<ConversationDetail> {
  if (!isSafeConversationId(conversationId)) {
    throw new ElevenLabsError("Virheellinen keskustelutunniste.", 400);
  }

  const { agentId } = getConfig();
  const payload = asRecord(await elevenLabsFetch(`/${encodeURIComponent(conversationId)}`));
  // A valid-looking ID must still belong to this configured agent. This keeps
  // the route from becoming an authenticated proxy to arbitrary conversations
  // in the ElevenLabs account.
  if (asString(payload?.agent_id) !== agentId) {
    throw new ElevenLabsError("Keskustelua ei löytynyt tälle agentille.", 404);
  }
  const transcript = Array.isArray(payload?.transcript) ? payload.transcript : [];
  const messages = transcript.flatMap((entry) => {
    const item = asRecord(entry);
    const role = asString(item?.role)?.toLowerCase();
    const message = asString(item?.message);
    if (!message || (role !== "user" && role !== "agent")) return [];
    return [{ role, message, timeInCallSecs: asNumber(item?.time_in_call_secs) } as ConversationTranscriptMessage];
  });

  return { id: conversationId, userId: asString(payload?.user_id), messages, adminAttention: adminAttentionFromTranscript(transcript) };
}

export function toPublicError(error: unknown): { message: string; status: number } {
  if (error instanceof ElevenLabsError) return { message: error.message, status: error.status };
  return { message: "Keskustelujen hakeminen epäonnistui.", status: 502 };
}
