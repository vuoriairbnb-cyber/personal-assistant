import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { estimateCostUsd } from "@/lib/claude/pricing";

export async function logAiCost(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    tripId?: string | null;
    feature: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
  }
) {
  const estimatedCostUsd = estimateCostUsd(params.model, params.inputTokens, params.outputTokens);

  const { error } = await supabase.from("ai_cost_logs").insert({
    user_id: params.userId,
    trip_id: params.tripId ?? null,
    feature: params.feature,
    model: params.model,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    estimated_cost_usd: estimatedCostUsd,
  });

  if (error) {
    // Cost logging must never block the user from seeing their AI output.
    console.error("Failed to log AI cost", error);
  }

  return estimatedCostUsd;
}
