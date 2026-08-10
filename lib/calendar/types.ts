// Shapes for the Calendar module. Field names are chosen to map straight onto a
// future `calendar_events` / `calendar_connections` table pair, so swapping the
// mock data for real Supabase queries won't require touching any component.

export type CalendarEventSource = "manual" | "trip" | "google" | "airbnb" | "golf";

export interface CalendarEvent {
  id: string;
  title: string;
  /** ISO 8601. For all-day events the time part is ignored. */
  start: string;
  /** ISO 8601, inclusive of the final day for all-day/multi-day events. */
  end: string;
  allDay: boolean;
  source: CalendarEventSource;
  location?: string | null;
  notes?: string | null;
  /** Set when the event belongs to (or was linked to) a trip project. */
  tripId?: string | null;
}

export type ConnectionProvider = "google" | "airbnb";

export type ConnectionStatus = "connected" | "syncing" | "error" | "disconnected";

export interface CalendarConnection {
  id: string;
  provider: ConnectionProvider;
  name: string;
  status: ConnectionStatus;
  lastSyncedAt?: string | null;
  error?: string | null;
}

/** Minimal trip shape the calendar needs — a subset of `Trip` from types/trip.ts. */
export interface CalendarTripRef {
  id: string;
  title: string;
  start: string;
  end: string;
}

export type CalendarViewMode = "month" | "week" | "agenda";

/**
 * Only events the user created here can be edited or deleted. Everything else
 * is owned by another system (Trips module, Google, Airbnb) and is rendered
 * without edit affordances rather than with disabled ones.
 */
export function isEditable(event: CalendarEvent) {
  return event.source === "manual";
}
