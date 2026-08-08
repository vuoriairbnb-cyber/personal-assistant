"use client";

import { endOfMonth, format, isSameDay, startOfMonth } from "date-fns";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SOURCE_STYLES } from "@/lib/calendar/source-styles";
import { formatTimeRange } from "@/lib/calendar/format";
import { eventRange } from "@/lib/calendar/grid";
import type { CalendarEvent } from "@/lib/calendar/types";

/** Flat, chronological list of everything in the visible month. */
export function AgendaList({
  month,
  today,
  events,
  onSelectEvent,
}: {
  month: Date;
  today: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const from = startOfMonth(month);
  const to = endOfMonth(month);

  const visible = events
    .filter((event) => {
      const { start, end } = eventRange(event);
      return end >= from && start <= to;
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  if (visible.length === 0) {
    return (
      <div className="rounded-lg border border-border-default bg-card p-10 text-center">
        <p className="text-[14px] font-semibold text-text-primary">Nothing scheduled</p>
        <p className="mt-1 text-[13px] text-text-secondary">
          {format(month, "MMMM yyyy")} is completely free.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border-default bg-card">
      {visible.map((event) => {
        const style = SOURCE_STYLES[event.source];
        const start = new Date(event.start);

        return (
          <button
            key={event.id}
            type="button"
            onClick={() => onSelectEvent(event)}
            className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors duration-150 hover:bg-card-hover"
          >
            <span
              className={cn(
                "grid w-14 shrink-0 place-items-center rounded-[10px] py-1.5",
                isSameDay(start, today) ? "bg-accent-subtle" : "bg-border-subtle"
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                {format(start, "MMM")}
              </span>
              <span className="text-[16px] font-semibold text-text-primary">{start.getDate()}</span>
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: style.dot }}
                />
                <span className="truncate text-[14px] font-semibold text-text-primary">
                  {event.title}
                </span>
                {style.synced ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-border-subtle px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                    <Lock size={9} aria-hidden />
                    Synced
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-text-secondary">
                {formatTimeRange(event)}
                {event.location ? ` · ${event.location}` : ""}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
