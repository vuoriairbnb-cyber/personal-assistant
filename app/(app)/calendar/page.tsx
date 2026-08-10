import { CalendarView } from "@/components/calendar/CalendarView";
import { listCalendarConnections, listCalendarEvents } from "@/lib/calendar/queries";
import { fetchOmatVaraukset } from "@/lib/golf/user-reservations";

export const metadata = {
  title: "Calendar — Personal Assistant",
};

// Trips don't have start/end dates yet (only a free-text date_window), so
// they can't be placed on the calendar or offered in "Link to trip" until
// that's added — passing an empty list rather than fabricating anything.
export default async function CalendarPage() {
  const [events, connections, golfResult] = await Promise.all([
    listCalendarEvents(),
    listCalendarConnections(),
    // Golf reservations are fetched live (never stored in Supabase). A missing
    // or expired HGK_SESSION_COOKIE returns an empty list — never crashes the
    // calendar. Read-only; no write path exists.
    fetchOmatVaraukset(),
  ]);

  const allEvents = [...events, ...golfResult.events];

  return <CalendarView initialEvents={allEvents} initialConnections={connections} trips={[]} />;
}
