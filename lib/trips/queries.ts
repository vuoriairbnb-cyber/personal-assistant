import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function listTrips() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getTripWithOutputs(tripId: string) {
  const supabase = await createServerSupabaseClient();

  const [{ data: trip, error: tripError }, { data: outputs, error: outputsError }] =
    await Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).single(),
      supabase
        .from("trip_ai_outputs")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false }),
    ]);

  if (tripError || !trip) return null;
  if (outputsError) throw new Error(outputsError.message);

  return { trip, outputs: outputs ?? [] };
}

export async function getCostLogs(limit = 50) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("ai_cost_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data;
}

export async function getAppSettings() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
