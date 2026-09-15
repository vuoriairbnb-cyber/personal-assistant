import type { DailyIntelligenceFlowResult } from "./daily-intelligence-flow";

export type DailyIntelligenceViewState = "missing" | "generating" | "current" | "stale" | "quiet" | "failed";
export type DailyIntelligenceView = { state: DailyIntelligenceViewState; action: "generate" | "update" | "retry" | null; keepsPreviousBrief: boolean };

/** Client-only presentation policy: no cache/model terminology crosses this boundary. */
export function getDailyIntelligenceView(result: DailyIntelligenceFlowResult, running: boolean, failed: boolean): DailyIntelligenceView {
  if (running) return { state: "generating", action: null, keepsPreviousBrief: Boolean(result.intelligence) };
  if (failed) return { state: "failed", action: "retry", keepsPreviousBrief: Boolean(result.intelligence) };
  if (result.state === "current") return { state: "current", action: null, keepsPreviousBrief: true };
  if (result.state === "stale") return { state: "stale", action: result.assessment?.eligible ? "update" : null, keepsPreviousBrief: true };
  if (result.state === "quiet") return { state: "quiet", action: null, keepsPreviousBrief: false };
  return { state: "missing", action: "generate", keepsPreviousBrief: false };
}
