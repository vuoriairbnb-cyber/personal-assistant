"use client";

import { isSameDay, isSameMonth } from "date-fns";
import { cn } from "@/lib/utils/cn";
import {
  WEEKDAY_LABELS,
  buildMonthMatrix,
  laneCount,
  layoutWeekSpans,
  singleDayEventsOnDay,
} from "@/lib/calendar/grid";
import { EventChip } from "@/components/calendar/EventChip";
import { TripBar } from "@/components/calendar/TripBar";
import type { CalendarEvent } from "@/lib/calendar/types";

// Cell geometry. The spanning-bar overlay is positioned against these, so the
// bars line up exactly with the gap reserved inside each day cell.
const CELL_PAD = 8;
const DATE_ROW_HEIGHT = 26;
const LANE_HEIGHT = 22;
const LANE_GAP = 4;

export function MonthGrid({
  month,
  today,
  selectedDate,
  events,
  onSelectDay,
  onSelectEvent,
}: {
  month: Date;
  today: Date;
  selectedDate: Date | null;
  events: CalendarEvent[];
  onSelectDay: (day: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const weeks = buildMonthMatrix(month);

  return (
    <div className="overflow-hidden rounded-lg border border-border-default bg-card">
      <div className="grid grid-cols-7 border-b border-border-default">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-3 py-2.5 text-[12px] font-semibold text-text-secondary"
          >
            {label}
          </div>
        ))}
      </div>

      {weeks.map((week) => {
        const spans = layoutWeekSpans(events, week);
        const lanes = laneCount(spans);
        const laneSpace = lanes * (LANE_HEIGHT + LANE_GAP);

        return (
          <div key={week.key} className="relative border-b border-border-default last:border-b-0">
            <div className="grid grid-cols-7">
              {week.days.map((day) => {
                const inMonth = isSameMonth(day, month);
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const dayEvents = singleDayEventsOnDay(events, day);

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => onSelectDay(day)}
                    className={cn(
                      "flex min-h-[104px] flex-col gap-1 border-r border-border-subtle p-2 transition-colors duration-150 last:border-r-0 hover:bg-card-hover",
                      !inMonth && "bg-card-hover/60"
                    )}
                  >
                    {/* The date is the keyboard-reachable control; chips below are
                        separate buttons, so the cell itself must not be one. */}
                    <button
                      type="button"
                      onClick={() => onSelectDay(day)}
                      aria-pressed={isSelected}
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center self-start rounded-full text-[12px] font-semibold",
                        isSelected
                          ? "bg-accent text-white"
                          : inMonth
                            ? "text-text-primary"
                            : "text-text-tertiary",
                        !isSelected && isSameDay(day, today) && "ring-1 ring-accent"
                      )}
                    >
                      {day.getDate()}
                    </button>

                    {/* Reserve the vertical space the spanning bars occupy. */}
                    <span aria-hidden style={{ height: laneSpace }} />

                    {dayEvents.map((event) => (
                      <EventChip key={event.id} event={event} onSelect={onSelectEvent} />
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Spanning bars sit above the cells so a trip reads as one object. */}
            <div className="pointer-events-none absolute inset-x-0" style={{ top: CELL_PAD + DATE_ROW_HEIGHT }}>
              {spans.map((span) => (
                <div
                  key={`${span.event.id}-${week.key}`}
                  className="absolute px-1"
                  style={{
                    top: span.lane * (LANE_HEIGHT + LANE_GAP),
                    left: `${(span.startCol / 7) * 100}%`,
                    width: `${(span.span / 7) * 100}%`,
                  }}
                >
                  <TripBar span={span} onSelect={onSelectEvent} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
