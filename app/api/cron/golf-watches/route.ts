import type { NextRequest } from "next/server";
import { processDueGolfWatches } from "@/lib/golf/watches";
import { processDuePlayerWatches } from "@/lib/golf/player-watches";
import { processPendingNotifications } from "@/lib/notifications/dispatcher";
import { createGolfWatchCronHandler } from "@/lib/golf/cron-handler";

const handleCron = createGolfWatchCronHandler({
  secret: process.env.CRON_SECRET,
  processWatches: processDueGolfWatches,
  processPlayerWatches: processDuePlayerWatches,
  processNotifications: processPendingNotifications,
});

// Supabase Cron invokes this route with POST. GET is retained for safe manual
// verification and both methods intentionally share the exact same flow.
export async function POST(request: NextRequest) {
  return handleCron(request);
}

export async function GET(request: NextRequest) {
  return handleCron(request);
}
