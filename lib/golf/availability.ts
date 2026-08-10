import type {
  CalendarSettingsResponse,
  FreeSlot,
  ReservationRow,
  ResourceRule,
  WiseGolfRuleValue,
} from "@/lib/golf/types";

function toMinutes(time: string): number {
  const parts = time.split(":");
  return Number(parts[0] ?? 0) * 60 + Number(parts[1] ?? 0);
}

function minutesToHHMM(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/** ISO weekday index (0 = Monday .. 6 = Sunday). Computed at noon so DST
 * transitions can never shift which calendar day this resolves to. */
function isoWeekday(date: string): number {
  const day = new Date(`${date}T12:00:00`).getDay();
  return (day + 6) % 7;
}

function isRuleActiveOn(rule: ResourceRule, date: string, weekday: number): boolean {
  if (rule.startDate && date < rule.startDate) return false;
  if (rule.endDate && date > rule.endDate) return false;
  if (rule.recurrenceDays && !rule.recurrenceDays[weekday]) return false;
  return true;
}

/** Is `slotMinutes` inside an active aikaSulku (time-closure) rule for this date? */
function ruleMatchesResource(rule: ResourceRule, resourceId?: number): boolean {
  return resourceId === undefined || rule.resourceId === null || rule.resourceId === undefined || rule.resourceId === resourceId;
}

/** Normalizes both WiseGolf kuumatAjat formats: `{ minutes: N }` and `N`. */
export function getHotRuleMinutes(ruleValue: WiseGolfRuleValue | undefined): number | null {
  const minutes = typeof ruleValue === "number" ? ruleValue : ruleValue?.minutes;
  return typeof minutes === "number" && Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
}

function getRuleMessage(ruleValue: WiseGolfRuleValue | undefined): string | undefined {
  return ruleValue && typeof ruleValue === "object" && typeof ruleValue.message === "string"
    ? ruleValue.message
    : undefined;
}

function isClosed(
  rules: ResourceRule[],
  date: string,
  weekday: number,
  slotMinutes: number,
  resourceId?: number
): boolean {
  return rules
    .filter(
      (rule) =>
        rule.ruleName === "aikaSulku" &&
        ruleMatchesResource(rule, resourceId) &&
        isRuleActiveOn(rule, date, weekday)
    )
    .some((rule) => slotMinutes >= toMinutes(rule.startTime) && slotMinutes < toMinutes(rule.endTime));
}

function helsinkiOffsetMinutes(utcMilliseconds: number): number {
  const timeZoneName = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Helsinki",
    timeZoneName: "longOffset",
  })
    .formatToParts(new Date(utcMilliseconds))
    .find((part) => part.type === "timeZoneName")?.value;
  const match = timeZoneName?.match(/^GMT([+-])(\d{2}):(\d{2})$/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "+" ? minutes : -minutes;
}

/** Converts a local Europe/Helsinki tee-time date and minute count to UTC. */
function helsinkiTeeTime(date: string, slotMinutes: number): Date {
  const [year, month, day] = date.split("-").map(Number);
  const hour = Math.floor(slotMinutes / 60);
  const minute = slotMinutes % 60;
  const utcGuess = Date.UTC(year!, month! - 1, day!, hour, minute);
  return new Date(utcGuess - helsinkiOffsetMinutes(utcGuess) * 60_000);
}

/** An ISO timestamp that retains the user-facing Europe/Helsinki offset. */
function toHelsinkiIso(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  const offset = value("timeZoneName").replace("GMT", "") || "+00:00";
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}:${value("second")}${offset}`;
}

function openingRestriction(
  rules: ResourceRule[],
  date: string,
  weekday: number,
  slotMinutes: number,
  resourceId?: number
): FreeSlot["bookingRestriction"] {
  const rule = rules.find(
    (candidate) =>
      candidate.ruleName === "kuumatAjat" &&
      ruleMatchesResource(candidate, resourceId) &&
      isRuleActiveOn(candidate, date, weekday) &&
      slotMinutes >= toMinutes(candidate.startTime) &&
      slotMinutes < toMinutes(candidate.endTime) &&
      getHotRuleMinutes(candidate.ruleValue) !== null
  );
  const minutesBefore = rule ? getHotRuleMinutes(rule.ruleValue) : null;
  if (!rule || minutesBefore === null) return undefined;

  const opensAt = new Date(helsinkiTeeTime(date, slotMinutes).getTime() - minutesBefore * 60_000);
  return {
    type: "opens_before_start",
    minutesBefore,
    opensAt: toHelsinkiIso(opensAt),
    ...(getRuleMessage(rule.ruleValue) ? { message: getRuleMessage(rule.ruleValue) } : {}),
  };
}

/**
 * Free tee times for one day. Every parameter (opening hours, slot length,
 * capacity, closures) is read from `settings` — never hardcoded, since the
 * club can change any of them. `rows` must already be booked seats for
 * exactly `date` (one row = one occupied seat at that start time).
 */
export function computeFreeSlots(
  date: string,
  settings: CalendarSettingsResponse,
  rows: ReservationRow[],
  now: Date = new Date(),
  resourceId?: number
): FreeSlot[] {
  const { startTime, endTime, duration, breakTime, resources } = settings.reservationSettings;
  const resource = resourceId === undefined
    ? resources[0]
    : resources.find((item) => item.id === resourceId || item.resourceId === resourceId);
  const quantity = resource?.quantity ?? 0;
  const step = duration + breakTime;
  if (step <= 0 || quantity <= 0) return [];

  const weekday = isoWeekday(date);

  const bookedCounts = new Map<string, number>();
  for (const row of rows) {
    if (resourceId !== undefined && row.resourceId !== resourceId) continue;
    const [rowDate, rowTime] = row.start.split(" ");
    if (rowDate !== date || !rowTime) continue;
    const key = rowTime.slice(0, 5); // "HH:MM"
    bookedCounts.set(key, (bookedCounts.get(key) ?? 0) + 1);
  }

  const slots: FreeSlot[] = [];
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  for (let t = start; t < end; t += step) {
    if (isClosed(settings.resourceRules, date, weekday, t, resourceId)) continue;
    const aika = minutesToHHMM(t);
    const availablePlayers = quantity - (bookedCounts.get(aika) ?? 0);
    if (availablePlayers > 0) {
      const bookingRestriction = openingRestriction(settings.resourceRules, date, weekday, t, resourceId);
      slots.push({
        aika,
        vapaita: availablePlayers,
        availablePlayers,
        bookableNow: !bookingRestriction || now >= new Date(bookingRestriction.opensAt),
        ...(bookingRestriction ? { bookingRestriction } : {}),
      });
    }
  }

  return slots;
}
