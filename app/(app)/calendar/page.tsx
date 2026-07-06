import { EmptyState } from "@/components/ui/EmptyState";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-text-primary">Calendar</h1>
        <p className="mt-1 text-text-secondary">
          Bring your calendars together to see free weekends and plan trips around them.
        </p>
      </div>
      <EmptyState
        title="Calendar isn't connected yet"
        description="This module is planned for a future release — work, personal, and travel calendars in one view. No calendar will ever be written to without your approval."
      />
    </div>
  );
}
