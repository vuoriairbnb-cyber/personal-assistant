import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Trip } from "@/types/trip";

/**
 * Loads a trip through the RLS-scoped server client, so this also acts as the
 * ownership check: a trip that isn't the caller's throws before any AI call runs.
 */
export async function getTripOrThrow(tripId: string): Promise<{ trip: Trip; userId: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not signed in.");

  const { data: trip, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();

  if (error || !trip) throw new Error("Trip not found.");

  return { trip, userId: user.id };
}
