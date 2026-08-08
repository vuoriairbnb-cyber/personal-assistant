"use client";

import { eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils/cn";
import { WEEK_OPTIONS, eventsOnDay } from "@/lib/calendar/grid";
import { EventChip } from "@/components/calendar/EventChip";
import type { CalendarEvent } from "@/lib/calendar/types";

/** Seven day columns for the week containing `anchor`. */
export function WeekGrid({
  anchor,
  today,
  selectedDate,
  events,
  onSelectDay,
  onSelectEvent,
}: {
  anchor: Date;
  today: Date;
  selectedDate: Date | null;
  events: CalendarEvent[];
  onSelectDay: (day: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(anchor, WEEK_OPTIONS),
    end: endOfWeek(anchor, WEEK_OPTIONS),
  });

  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-border-default bg-card">
      {days.map((day) => {
        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
        const dayEvents = eventsOnDay(events, day);

        return (
          <div
            key={day.toISOString()}
            onClick={() => onSelectDay(day)}
            className="flex min-h-[420px] flex-col gap-1.5 border-r border-border-subtle p-2 last:border-r-0 hover:bg-card-hover"
          >
            <button
              type="button"
              onClick={() => onSelectDay(day)}
              aria-pressed={isSelected}
              className="mb-1 flex items-center gap-2 self-start rounded-[10px] px-1 py-0.5 text-left"
            >
              <span className="text-[12px] font-semibold text-text-secondary">
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-full text-[12px] font-semibold",
                  isSelected
                    ? "bg-accent text-white"
                    : isSameDay(day, today)
                      ? "text-accent ring-1 ring-accent"
                      : "text-text-primary"
                )}
              >
                {day.getDate()}
              </span>
            </button>

            {dayEvents.length === 0 ? (
              <p className="px-1 text-[11px] text-text-tertiary">—</p>
            ) : (
              dayEvents.map((event) => (
                <EventChip key={event.id} event={event} onSelect={onSelectEvent} />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
