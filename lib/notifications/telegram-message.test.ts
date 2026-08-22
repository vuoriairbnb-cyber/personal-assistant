import assert from "node:assert/strict";
import test from "node:test";
import { formatPlayerWatchTelegramMessage } from "./telegram-message.ts";

test("player watch message formats date and time deterministically", () => {
  assert.equal(formatPlayerWatchTelegramMessage({ player_name: "Elo Vartiainen", course: "Helsingin Golfklubi", date: "2026-08-22", time: "14:51" }), "👤 Pelaajavahti löysi uuden lähdön!\n\nElo Vartiainen\nHelsingin Golfklubi\n22.08.2026 klo 14.51\n\nPelaajavahti jatkaa seurantaa.");
});
