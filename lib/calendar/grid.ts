import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { CalendarEvent } from "@/lib/calendar/types";

/** The reference layout runs Mon–Sun. */
export const WEEK_OPTIONS = { weekStartsOn: 1 as const };

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

export interface MonthWeek {
  /** Stable React key — the ISO date of the row's Monday. */
  key: string;
  start: Date;
  end: Date;
  days: Date[];
}

/** Week rows covering `month`, including leading/trailing overflow days. */
export function buildMonthMatrix(month: Date): MonthWeek[] {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), WEEK_OPTIONS),
    end: endOfWeek(endOfMonth(month), WEEK_OPTIONS),
  });

  const weeks: MonthWeek[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const slice = days.slice(i, i + 7);
    const start = startOfDay(slice[0] as Date);
    const end = startOfDay(slice[slice.length - 1] as Date);
    weeks.push({ key: start.toISOString(), start, end, days: slice });
  }
  return weeks;
}

export function eventRange(event: CalendarEvent) {
  return { start: startOfDay(new Date(event.start)), end: startOfDay(new Date(event.end)) };
}

export function isMultiDay(event: CalendarEvent) {
  const { start, end } = eventRange(event);
  return differenceInCalendarDays(end, start) > 0;
}

function occursOn(event: CalendarEvent, day: Date) {
  const { start, end } = eventRange(event);
  const target = startOfDay(day);
  return target >= start && target <= end;
}

/** Every event touching `day`, multi-day ones included, earliest start first. */
export function eventsOnDay(events: CalendarEvent[], day: Date) {
  return events
    .filter((event) => occursOn(event, day))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

/** Single-day events only — multi-day ones are drawn as spanning bars instead. */
export function singleDayEventsOnDay(events: CalendarEvent[], day: Date) {
  return eventsOnDay(events, day).filter((event) => !isMultiDay(event));
}

export interface WeekSpan {
  event: CalendarEvent;
  /** 0-6 column index within the week row. */
  startCol: number;
  /** How many columns the bar covers in this row. */
  span: number;
  /** The event started before this row / continues past it. */
  continuesLeft: boolean;
  continuesRight: boolean;
  /** Vertical slot, so overlapping bars stack instead of colliding. */
  lane: number;
}

/**
 * Slice every multi-day event into per-week segments and pack them into lanes.
 * Greedy first-fit: segments are placed left-to-right, longest first, into the
 * topmost lane whose occupied columns don't overlap.
 */
export function layoutWeekSpans(events: CalendarEvent[], week: MonthWeek): WeekSpan[] {
  const { start: weekStart, end: weekEnd } = week;

  const segments = events
    .filter(isMultiDay)
    .map((event) => {
      const { start, end } = eventRange(event);
      if (end < weekStart || start > weekEnd) return null;

      const segStart = start < weekStart ? weekStart : start;
      const segEnd = end > weekEnd ? weekEnd : end;

      return {
        event,
        startCol: differenceInCalendarDays(segStart, weekStart),
        span: differenceInCalendarDays(segEnd, segStart) + 1,
        continuesLeft: start < weekStart,
        continuesRight: end > weekEnd,
      };
    })
    .filter((segment): segment is Omit<WeekSpan, "lane"> => segment !== null)
    .sort((a, b) => a.startCol - b.startCol || b.span - a.span);

  const lanes: number[] = []; // lane index -> first free column
  return segments.map((segment) => {
    let lane = lanes.findIndex((freeFrom) => freeFrom <= segment.startCol);
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(0);
    }
    lanes[lane] = segment.startCol + segment.span;
    return { ...segment, lane };
  });
}

export function laneCount(spans: WeekSpan[]) {
  return spans.reduce((max, span) => Math.max(max, span.lane + 1), 0);
}

export function isToday(day: Date, today: Date) {
  return isSameDay(day, today);
}
