import type { CalendarConnection, CalendarEvent, CalendarTripRef } from "@/lib/calendar/types";

/**
 * Demo data for the Calendar UI. There is no `calendar_events` table yet — when
 * one lands, replace these three exports with Supabase queries; every component
 * consumes them through props, so nothing else needs to change.
 *
 * Deliberately empty: this module previously shipped with sample events/trips
 * for visual QA, but they rendered indistinguishably from real data and read as
 * entries the user never created. Until real data is wired up, the calendar
 * should show its empty state rather than fabricated content.
 */
export const DEMO_NOW = new Date();

export const MOCK_TRIPS: CalendarTripRef[] = [];

export const MOCK_EVENTS: CalendarEvent[] = [];

export const MOCK_CONNECTIONS: CalendarConnection[] = [
  {
    id: "conn-google",
    provider: "google",
    name: "Google Calendar",
    status: "disconnected",
    lastSyncedAt: null,
  },
  {
    id: "conn-airbnb",
    provider: "airbnb",
    name: "Airbnb (iCal)",
    status: "disconnected",
    lastSyncedAt: null,
  },
];
