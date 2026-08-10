import { requireApprovedUser } from "@/lib/auth/guard";
import { fetchOmatVaraukset } from "@/lib/golf/user-reservations";

/**
 * GET /api/golf/omat-varaukset
 *
 * Returns the authenticated user's own HGK golf reservations as calendar
 * events. Read-only — never performs any booking or cancellation.
 *
 * Fully separate from /api/golf (public availability search): own cache,
 * own error handling, no shared state.
 */
export async function GET() {
  await requireApprovedUser();

  const result = await fetchOmatVaraukset();

  return Response.json(result);
}
