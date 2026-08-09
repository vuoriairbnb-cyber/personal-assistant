import { addDays, format } from "date-fns";

export interface ParsedGolfQuery {
  date?: string;
  after?: string;
  before?: string;
  min?: number;
}

const WEEKDAY_PATTERNS: { pattern: RegExp; index: number }[] = [
  { pattern: /maanantai/, index: 0 },
  { pattern: /tiistai/, index: 1 },
  { pattern: /keskiviikk/, index: 2 },
  { pattern: /torstai/, index: 3 },
  { pattern: /perjantai/, index: 4 },
  { pattern: /lauantai/, index: 5 },
  { pattern: /sunnuntai/, index: 6 },
];

/**
 * Next occurrence of ISO weekday `targetIdx` (0 = Monday), always in the
 * future (today itself never counts, even if today is that weekday — an
 * exact same-day match rolls over to next week). `pushExtraWeek` adds one
 * more week on top of that — the rule for "seuraavan viikon X" ("the X of
 * next week"), which is a distinct, deliberately-later request.
 *
 * Plain "keskiviikkona", "keskiviikko", and "ensi keskiviikkona" all resolve
 * to the same date: the nearest upcoming Wednesday. In everyday Finnish
 * "ensi X" is not a "skip a week" instruction — it means the same thing as
 * plain "X" — so "ensi" has no effect here at all.
 */
function nextWeekday(targetIdx: number, pushExtraWeek: boolean, today: Date): Date {
  const todayIdx = (today.getDay() + 6) % 7;
  let diff = (targetIdx - todayIdx + 7) % 7;
  if (diff === 0) diff = 7;
  if (pushExtraWeek) diff += 7;
  return addDays(today, diff);
}

/** Regex-based Finnish query parser. No LLM call — works offline, no API key, no cost. */
export function parseGolfQuery(text: string, today: Date = new Date()): ParsedGolfQuery {
  const q = text.toLowerCase();
  const query: ParsedGolfQuery = {};

  // --- date ---
  if (/huomenna/.test(q)) {
    query.date = format(addDays(today, 1), "yyyy-MM-dd");
  } else if (/tänä(än)?\b/.test(q)) {
    // Matches both "tänään" ("today") and "tänä" ("this", as in "tänä iltana").
    query.date = format(today, "yyyy-MM-dd");
  } else {
    const weekday = WEEKDAY_PATTERNS.find(({ pattern }) => pattern.test(q));
    if (weekday) {
      const pushExtraWeek = /seuraavan viikon/.test(q);
      query.date = format(nextWeekday(weekday.index, pushExtraWeek, today), "yyyy-MM-dd");
    }
  }

  // --- time of day ---
  // Checked as an else-if chain, in this specific order:
  // - "iltapäiv" before the evening check — "iltapäivä" (afternoon) keeps
  //   its "ilta" prefix in every case form (only the "päivä" half
  //   inflects), so an evening check placed first would also fire on
  //   "iltapäivänä" etc.
  // - "aamupäiv" before "aamu", same reasoning.
  // - the evening check itself can't just look for "ilta": Finnish
  //   consonant gradation turns "ilta" into "illalla" ("in the evening")
  //   — the most natural way to say it, and the exact phrasing in this
  //   tool's own example query ("ensi keskiviikkona illalla") — so the
  //   common inflected forms are spelled out explicitly instead of relying
  //   on a substring match that would silently miss them.
  if (/iltapäiv/.test(q)) {
    query.after = "12:00";
    query.before = "17:00";
  } else if (/illalla|iltana|iltaisin|ilta\b/.test(q)) {
    query.after = "17:00";
    query.before = "21:00";
  } else if (/aamupäiv/.test(q)) {
    query.after = "09:00";
    query.before = "12:00";
  } else if (/aamu/.test(q)) {
    query.after = "06:00";
    query.before = "09:00";
  }

  // --- "klo N jälkeen" — an exact time overrides the fuzzy bucket above ---
  const afterMatch = q.match(/klo\s+(\d{1,2})(?:[.:](\d{2}))?\s+jälkeen/);
  if (afterMatch?.[1]) {
    query.after = `${afterMatch[1].padStart(2, "0")}:${afterMatch[2] ?? "00"}`;
  }

  // --- "N hengelle" ("for N people") ---
  const minMatch = q.match(/(\d+)\s+hengelle/);
  if (minMatch) {
    query.min = Number(minMatch[1]);
  }

  return query;
}

/**
 * Turns a parsed query into /api/golf params. When no date was recognized
 * (e.g. just a time-of-day word, or free text the parser couldn't place),
 * falls back to the next 7 days rather than erroring — a search tool should
 * show something useful, not demand exact phrasing.
 */
export function toSearchParams(parsed: ParsedGolfQuery, today: Date = new Date()): URLSearchParams {
  const params = new URLSearchParams();

  if (parsed.date) {
    params.set("date", parsed.date);
  } else {
    params.set("from", format(today, "yyyy-MM-dd"));
    params.set("to", format(addDays(today, 6), "yyyy-MM-dd"));
  }
  if (parsed.after) params.set("after", parsed.after);
  if (parsed.before) params.set("before", parsed.before);
  if (parsed.min !== undefined) params.set("min", String(parsed.min));

  return params;
}
