import type { CalendarSettingsResponse, FreeSlot, ReservationRow, ResourceRule } from "@/lib/golf/types";

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
function isClosed(rules: ResourceRule[], date: string, weekday: number, slotMinutes: number): boolean {
  return rules
    .filter((rule) => rule.ruleName === "aikaSulku" && isRuleActiveOn(rule, date, weekday))
    .some((rule) => slotMinutes >= toMinutes(rule.startTime) && slotMinutes < toMinutes(rule.endTime));
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
  rows: ReservationRow[]
): FreeSlot[] {
  const { startTime, endTime, duration, breakTime, resources } = settings.reservationSettings;
  const quantity = resources[0]?.quantity ?? 0;
  const step = duration + breakTime;
  if (step <= 0 || quantity <= 0) return [];

  const weekday = isoWeekday(date);

  const bookedCounts = new Map<string, number>();
  for (const row of rows) {
    const [rowDate, rowTime] = row.start.split(" ");
    if (rowDate !== date || !rowTime) continue;
    const key = rowTime.slice(0, 5); // "HH:MM"
    bookedCounts.set(key, (bookedCounts.get(key) ?? 0) + 1);
  }

  const slots: FreeSlot[] = [];
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  for (let t = start; t < end; t += step) {
    if (isClosed(settings.resourceRules, date, weekday, t)) continue;
    const aika = minutesToHHMM(t);
    const vapaita = quantity - (bookedCounts.get(aika) ?? 0);
    if (vapaita > 0) slots.push({ aika, vapaita });
  }

  return slots;
}
