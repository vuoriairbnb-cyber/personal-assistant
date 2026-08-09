import { CalendarView } from "@/components/calendar/CalendarView";
import { listCalendarConnections, listCalendarEvents } from "@/lib/calendar/queries";

export const metadata = {
  title: "Calendar — Personal Assistant",
};

// Trips don't have start/end dates yet (only a free-text date_window), so
// they can't be placed on the calendar or offered in "Link to trip" until
// that's added — passing an empty list rather than fabricating anything.
export default async function CalendarPage() {
  const [events, connections] = await Promise.all([
    listCalendarEvents(),
    listCalendarConnections(),
  ]);

  return <CalendarView initialEvents={events} initialConnections={connections} trips={[]} />;
}
