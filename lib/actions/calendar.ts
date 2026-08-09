"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedUser } from "@/lib/auth/guard";
import { fetchAirbnbEvents } from "@/lib/calendar/ical";

function toNullable(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  return s === "" ? null : s;
}

function combineDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function eventFieldsFromForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const allDay = formData.get("all_day") === "true";
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");

  if (!title) throw new Error("Title is required.");
  if (!startDate || !endDate) throw new Error("Start and end dates are required.");

  const start = allDay
    ? new Date(`${startDate}T00:00:00`).toISOString()
    : combineDateTime(startDate, String(formData.get("start_time") ?? "00:00"));
  const end = allDay
    ? new Date(`${endDate}T23:59:59`).toISOString()
    : combineDateTime(endDate, String(formData.get("end_time") ?? "00:00"));

  return {
    title,
    all_day: allDay,
    start_at: start,
    end_at: end,
    location: toNullable(formData.get("location")),
    description: toNullable(formData.get("notes")),
    trip_id: toNullable(formData.get("trip_id")),
  };
}

export async function createCalendarEvent(formData: FormData) {
  const { user, supabase } = await requireApprovedUser();
  const fields = eventFieldsFromForm(formData);

  const { error } = await supabase
    .from("calendar_events")
    .insert({ user_id: user.id, source: "manual", ...fields });

  if (error) throw new Error(error.message);

  revalidatePath("/calendar");
}

export async function updateCalendarEvent(eventId: string, formData: FormData) {
  const { supabase } = await requireApprovedUser();
  const fields = eventFieldsFromForm(formData);

  const { error } = await supabase
    .from("calendar_events")
    .update(fields)
    .eq("id", eventId)
    .eq("source", "manual");

  if (error) throw new Error(error.message);

  revalidatePath("/calendar");
}

/** Only manual events can be deleted here — synced/trip events are read-only. */
export async function deleteCalendarEvent(eventId: string) {
  const { supabase } = await requireApprovedUser();

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", eventId)
    .eq("source", "manual");

  if (error) throw new Error(error.message);

  revalidatePath("/calendar");
}

/**
 * Connects (on first call) and refreshes (on every later call) the signed-in
 * user's Airbnb calendar. Manual-only trigger — no background/on-load sync —
 * so an external HTTP fetch never happens just because someone opened the page.
 */
export async function syncAirbnbCalendar() {
  const { user, supabase } = await requireApprovedUser();

  const { data: connection, error: connectionError } = await supabase
    .from("calendar_connections")
    .upsert(
      { user_id: user.id, provider: "airbnb", status: "syncing", error: null },
      { onConflict: "user_id,provider" }
    )
    .select("id")
    .single();

  if (connectionError || !connection) {
    throw new Error(connectionError?.message ?? "Could not start Airbnb sync.");
  }

  try {
    const events = await fetchAirbnbEvents();

    const { error: upsertError } = await supabase.from("calendar_events").upsert(
      events.map((event) => ({
        user_id: user.id,
        connection_id: connection.id,
        source: "airbnb" as const,
        external_id: event.externalId,
        title: event.title,
        location: event.location,
        start_at: event.start,
        end_at: event.end,
        all_day: event.allDay,
      })),
      { onConflict: "connection_id,external_id" }
    );
    if (upsertError) throw new Error(upsertError.message);

    // Prune rows for reservations that dropped out of the feed (cancellations).
    const { data: existing, error: existingError } = await supabase
      .from("calendar_events")
      .select("id, external_id")
      .eq("connection_id", connection.id);
    if (existingError) throw new Error(existingError.message);

    const currentIds = new Set(events.map((event) => event.externalId));
    const staleIds = existing
      .filter((row) => row.external_id && !currentIds.has(row.external_id))
      .map((row) => row.id);

    if (staleIds.length > 0) {
      const { error: pruneError } = await supabase
        .from("calendar_events")
        .delete()
        .in("id", staleIds);
      if (pruneError) throw new Error(pruneError.message);
    }

    await supabase
      .from("calendar_connections")
      .update({ status: "connected", last_synced_at: new Date().toISOString(), error: null })
      .eq("id", connection.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Airbnb sync failed.";
    await supabase
      .from("calendar_connections")
      .update({ status: "error", error: message })
      .eq("id", connection.id);
    throw new Error(message);
  }

  revalidatePath("/calendar");
}

export async function disconnectAirbnbCalendar() {
  const { user, supabase } = await requireApprovedUser();

  const { data: connection, error: connectionError } = await supabase
    .from("calendar_connections")
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", "airbnb")
    .maybeSingle();
  if (connectionError) throw new Error(connectionError.message);
  if (!connection) return;

  const { error: deleteEventsError } = await supabase
    .from("calendar_events")
    .delete()
    .eq("connection_id", connection.id);
  if (deleteEventsError) throw new Error(deleteEventsError.message);

  const { error: updateError } = await supabase
    .from("calendar_connections")
    .update({ status: "disconnected", last_synced_at: null, error: null })
    .eq("id", connection.id);
  if (updateError) throw new Error(updateError.message);

  revalidatePath("/calendar");
}
