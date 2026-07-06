"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireApprovedUser } from "@/lib/auth/guard";
import { getTripOrThrow } from "@/lib/trips/getTrip";
import { getAppSettings } from "@/lib/trips/queries";
import { logAiCost } from "@/lib/cost/logCost";
import {
  parseRawPlan,
  generateBrief,
  generateItinerary,
  generateBudget,
  generateEmailDraft,
  type EmailDraftParams,
} from "@/lib/claude/actions";
import type { TripAiOutputType } from "@/types/trip";
import type { Database } from "@/types/database";

async function saveOutput(
  supabase: SupabaseClient<Database>,
  tripId: string,
  userId: string,
  type: TripAiOutputType,
  title: string,
  content: Record<string, unknown>
) {
  const { error } = await supabase.from("trip_ai_outputs").insert({
    trip_id: tripId,
    user_id: userId,
    type,
    title,
    content,
  });
  if (error) throw new Error(error.message);
}

async function getPreferredModel() {
  const settings = await getAppSettings();
  return settings?.default_model;
}

export async function runParsePlan(tripId: string) {
  const { user, supabase } = await requireApprovedUser();
  const { trip } = await getTripOrThrow(tripId);
  if (!trip.raw_plan?.trim()) {
    throw new Error("Paste a raw plan first.");
  }

  const result = await parseRawPlan(trip, trip.raw_plan, await getPreferredModel());
  await saveOutput(
    supabase,
    tripId,
    user.id,
    "structured_plan",
    "Parsed plan",
    result.data as unknown as Record<string, unknown>
  );
  await logAiCost(supabase, {
    userId: user.id,
    tripId,
    feature: "parse_plan",
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });

  revalidatePath(`/trips/${tripId}`);
}

export async function runGenerateBrief(tripId: string) {
  const { user, supabase } = await requireApprovedUser();
  const { trip } = await getTripOrThrow(tripId);
  const result = await generateBrief(trip, undefined, await getPreferredModel());
  await saveOutput(
    supabase,
    tripId,
    user.id,
    "brief",
    "Trip brief",
    result.data as unknown as Record<string, unknown>
  );
  await logAiCost(supabase, {
    userId: user.id,
    tripId,
    feature: "generate_brief",
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });

  revalidatePath(`/trips/${tripId}`);
}

export async function runGenerateItinerary(tripId: string) {
  const { user, supabase } = await requireApprovedUser();
  const { trip } = await getTripOrThrow(tripId);
  const result = await generateItinerary(trip, undefined, await getPreferredModel());
  await saveOutput(
    supabase,
    tripId,
    user.id,
    "itinerary",
    "Itinerary",
    result.data as unknown as Record<string, unknown>
  );
  await logAiCost(supabase, {
    userId: user.id,
    tripId,
    feature: "generate_itinerary",
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });

  revalidatePath(`/trips/${tripId}`);
}

export async function runGenerateBudget(tripId: string) {
  const { user, supabase } = await requireApprovedUser();
  const { trip } = await getTripOrThrow(tripId);
  const result = await generateBudget(trip, undefined, await getPreferredModel());
  await saveOutput(
    supabase,
    tripId,
    user.id,
    "budget",
    "Budget estimate",
    result.data as unknown as Record<string, unknown>
  );
  await logAiCost(supabase, {
    userId: user.id,
    tripId,
    feature: "generate_budget",
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });

  revalidatePath(`/trips/${tripId}`);
}

export async function runGenerateEmailDraft(tripId: string, params: EmailDraftParams) {
  const { user, supabase } = await requireApprovedUser();
  const { trip } = await getTripOrThrow(tripId);
  const result = await generateEmailDraft(trip, params, await getPreferredModel());
  await saveOutput(supabase, tripId, user.id, "email_draft", `Email — ${params.operatorName}`, {
    ...result.data,
    to: result.data.to ?? params.recipientEmail,
  } as unknown as Record<string, unknown>);
  await logAiCost(supabase, {
    userId: user.id,
    tripId,
    feature: "generate_email_draft",
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });

  revalidatePath(`/trips/${tripId}`);
}
