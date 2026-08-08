import { CalendarPlus, Link2 } from "lucide-react";

export function CalendarEmptyState({
  onNewEvent,
  onConnect,
}: {
  onNewEvent: () => void;
  onConnect: () => void;
}) {
  return (
    <div className="rounded-lg border border-border-default bg-card px-6 py-14 text-center shadow-sm">
      <span
        aria-hidden
        className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-subtle text-accent"
      >
        <CalendarPlus size={22} />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-text-primary">Nothing here yet</p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] leading-snug text-text-secondary">
        Add an event of your own, or connect Google Calendar and your Airbnb feed to pull
        everything into one view.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        <button
          type="button"
          onClick={onNewEvent}
          className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-accent-hover"
        >
          <CalendarPlus size={15} />
          Add your first event
        </button>
        <button
          type="button"
          onClick={onConnect}
          className="flex items-center gap-2 rounded-md border border-border-default bg-card px-4 py-2 text-[13px] font-semibold text-text-primary transition-colors duration-150 hover:bg-border-subtle"
        >
          <Link2 size={15} />
          Connect a calendar
        </button>
      </div>
    </div>
  );
}
