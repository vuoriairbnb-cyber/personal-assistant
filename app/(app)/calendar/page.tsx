import { CalendarView } from "@/components/calendar/CalendarView";
import { MOCK_CONNECTIONS, MOCK_EVENTS, MOCK_TRIPS } from "@/lib/calendar/mock-data";

export const metadata = {
  title: "Calendar — Personal Assistant",
};

export default function CalendarPage() {
  return (
    <CalendarView
      initialEvents={MOCK_EVENTS}
      initialConnections={MOCK_CONNECTIONS}
      trips={MOCK_TRIPS}
    />
  );
}
