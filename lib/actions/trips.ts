"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireApprovedUser } from "@/lib/auth/guard";
import type { TripStatus } from "@/types/trip";

function parseInterests(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toNullableNumber(value: FormDataEntryValue | null) {
  if (!value || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function tripFieldsFromForm(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    destination: String(formData.get("destination") ?? "").trim(),
    departure_city: String(formData.get("departure_city") ?? "").trim() || null,
    date_window: String(formData.get("date_window") ?? "").trim() || null,
    duration_days: toNullableNumber(formData.get("duration_days")),
    travelers: toNullableNumber(formData.get("travelers")) ?? 1,
    budget_min: toNullableNumber(formData.get("budget_min")),
    budget_max: toNullableNumber(formData.get("budget_max")),
    currency: String(formData.get("currency") ?? "EUR").trim() || "EUR",
    interests: parseInterests(formData.get("interests")),
    travel_style: String(formData.get("travel_style") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createTrip(formData: FormData) {
  const { user, supabase } = await requireApprovedUser();

  const fields = tripFieldsFromForm(formData);
  if (!fields.title || !fields.destination) {
    throw new Error("Title and destination are required.");
  }

  const { data, error } = await supabase
    .from("trips")
    .insert({ user_id: user.id, ...fields })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create trip.");
  }

  revalidatePath("/trips");
  redirect(`/trips/${data.id}`);
}

export async function updateTrip(tripId: string, formData: FormData) {
  const { supabase } = await requireApprovedUser();
  const fields = tripFieldsFromForm(formData);
  const status = String(formData.get("status") ?? "planning") as TripStatus;

  const { error } = await supabase
    .from("trips")
    .update({ ...fields, status })
    .eq("id", tripId);

  if (error) throw new Error(error.message);

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
}

export async function saveRawPlan(tripId: string, formData: FormData) {
  const { supabase } = await requireApprovedUser();
  const rawPlan = String(formData.get("raw_plan") ?? "");

  const { error } = await supabase.from("trips").update({ raw_plan: rawPlan }).eq("id", tripId);
  if (error) throw new Error(error.message);

  revalidatePath(`/trips/${tripId}`);
}

export async function saveNotes(tripId: string, formData: FormData) {
  const { supabase } = await requireApprovedUser();
  const notes = String(formData.get("notes") ?? "");

  const { error } = await supabase.from("trips").update({ notes }).eq("id", tripId);
  if (error) throw new Error(error.message);

  revalidatePath(`/trips/${tripId}`);
}

export async function deleteTrip(tripId: string) {
  const { supabase } = await requireApprovedUser();
  const { error } = await supabase.from("trips").delete().eq("id", tripId);
  if (error) throw new Error(error.message);

  revalidatePath("/trips");
  redirect("/trips");
}
