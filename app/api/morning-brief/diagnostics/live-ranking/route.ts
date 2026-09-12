import { requireApprovedUser } from "@/lib/auth/guard";
import { createLiveRankingDiagnosticsGetHandler } from "@/lib/morning-brief/diagnostics-route";
import { buildLiveRankingDiagnostic } from "@/lib/morning-brief/live-ranking-diagnostics";

/** TEMPORARY approved-user-only, read-only production ranking diagnostic. */
export const GET = createLiveRankingDiagnosticsGetHandler({ requireApprovedUser, buildDiagnostic: buildLiveRankingDiagnostic });
