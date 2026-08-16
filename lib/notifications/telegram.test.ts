import assert from "node:assert/strict";
import test from "node:test";
import { formatGolfWatchTelegramMessage, TelegramConfigurationError, TelegramSender } from "./telegram.ts";

const event = { id: "event-1", eventType: "golf_watch_matched", sourceType: "golf_watch", sourceId: "watch-1", payload: { course: "Helsingin Golfklubi", date: "2026-08-17", time: "17:33", available_spots: 4, players: 2, time_from: "17:00", time_to: "19:00" } };

test("Telegram message uses the deterministic golf-watch template", () => {
  const text = formatGolfWatchTelegramMessage(event.payload);
  assert.match(text, /Helsingin Golfklubi/);
  assert.match(text, /17\.08\.2026 klo 17:33/);
  assert.match(text, /4 paikkaa vapaana/);
  assert.match(text, /17:00–19:00/);
  assert.match(text, /2 pelaajaa/);
});

test("TelegramSender uses configured Bot API URL and chat ID", async () => {
  const originalFetch = globalThis.fetch;
  const previousToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousChat = process.env.TELEGRAM_CHAT_ID;
  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "12345";
  let request: { url?: string; init?: RequestInit } = {};
  globalThis.fetch = async (url, init) => { request = { url: String(url), init }; return new Response(JSON.stringify({ ok: true, result: { message_id: 123 } }), { status: 200 }); };
  try {
    const result = await new TelegramSender().send(event);
    assert.equal(request.url, "https://api.telegram.org/bottest-token/sendMessage");
    assert.deepEqual(JSON.parse(String(request.init?.body)), { chat_id: "12345", text: formatGolfWatchTelegramMessage(event.payload) });
    assert.equal(result.externalId, "123");
  } finally {
    globalThis.fetch = originalFetch;
    if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN; else process.env.TELEGRAM_BOT_TOKEN = previousToken;
    if (previousChat === undefined) delete process.env.TELEGRAM_CHAT_ID; else process.env.TELEGRAM_CHAT_ID = previousChat;
  }
});

test("missing Telegram environment fails without sending", async () => {
  const previousToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousChat = process.env.TELEGRAM_CHAT_ID;
  delete process.env.TELEGRAM_BOT_TOKEN; delete process.env.TELEGRAM_CHAT_ID;
  try { await assert.rejects(() => new TelegramSender().send(event), TelegramConfigurationError); }
  finally {
    if (previousToken !== undefined) process.env.TELEGRAM_BOT_TOKEN = previousToken;
    if (previousChat !== undefined) process.env.TELEGRAM_CHAT_ID = previousChat;
  }
});
