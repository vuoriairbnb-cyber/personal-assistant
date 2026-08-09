import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CalendarConnection, CalendarEvent } from "@/lib/calendar/types";
import type { CalendarConnectionProvider } from "@/types/database";

/** Providers shown in the UI even before the user has ever connected them. */
const KNOWN_PROVIDERS: { provider: CalendarConnectionProvider; name: string }[] = [
  { provider: "airbnb", name: "Airbnb (iCal)" },
  { provider: "google", name: "Google Calendar" },
];

export async function listCalendarEvents(): Promise<CalendarEvent[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("calendar_events").select("*");

  if (error) throw new Error(error.message);

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    start: row.start_at,
    end: row.end_at,
    allDay: row.all_day,
    source: row.source,
    location: row.location,
    notes: row.description,
    tripId: row.trip_id,
  }));
}

/**
 * Every approved user gets a card for every known provider, even ones they've
 * never touched — connecting is what creates the underlying row.
 */
export async function listCalendarConnections(): Promise<CalendarConnection[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("calendar_connections").select("*");

  if (error) throw new Error(error.message);

  return KNOWN_PROVIDERS.map(({ provider, name }) => {
    const row = data.find((connection) => connection.provider === provider);
    return {
      id: row?.id ?? provider,
      provider,
      name,
      status: row?.status ?? "disconnected",
      lastSyncedAt: row?.last_synced_at ?? null,
      error: row?.error ?? null,
    };
  });
}
