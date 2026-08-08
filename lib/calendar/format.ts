import { format } from "date-fns";
import type { CalendarEvent } from "@/lib/calendar/types";

/**
 * Calendar-local formatters. The app-wide helpers in lib/utils/format.ts use
 * en-GB 24-hour output; the calendar reference is 12-hour ("10:00 AM"), so these
 * live separately rather than changing formatting for the rest of the app.
 */

export function formatTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return format(date, "h:mm a");
}

export function formatTimeRange(event: CalendarEvent) {
  if (event.allDay) return "All day";
  return `${formatTime(event.start)} – ${formatTime(event.end)}`;
}

export function formatDuration(event: CalendarEvent) {
  if (event.allDay) return "All day";
  const minutes = Math.round(
    (new Date(event.end).getTime() - new Date(event.start).getTime()) / 60_000
  );
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatDayRange(start: string | Date, end: string | Date) {
  const from = typeof start === "string" ? new Date(start) : start;
  const to = typeof end === "string" ? new Date(end) : end;
  return `${format(from, "MMM d")} – ${format(to, "MMM d")}`;
}

/** "2 min ago" / "just now", measured against the demo clock rather than Date.now(). */
export function formatRelativeTime(value: string | null | undefined, now: Date) {
  if (!value) return "Never synced";
  const minutes = Math.round((now.getTime() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return "Last synced: just now";
  if (minutes < 60) return `Last synced: ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Last synced: ${hours} h ago`;
  return `Last synced: ${format(new Date(value), "MMM d, HH:mm")}`;
}
