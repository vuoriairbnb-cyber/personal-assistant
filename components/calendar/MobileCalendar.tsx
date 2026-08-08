"use client";

import { format, isSameDay, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Lock, Plus, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { WEEKDAY_INITIALS, buildMonthMatrix, eventsOnDay } from "@/lib/calendar/grid";
import { SOURCE_STYLES } from "@/lib/calendar/source-styles";
import { formatDuration, formatTime } from "@/lib/calendar/format";
import { ViewTabs } from "@/components/calendar/ViewTabs";
import { ProviderMark } from "@/components/calendar/ProviderMark";
import { AgendaList } from "@/components/calendar/AgendaList";
import type {
  CalendarConnection,
  CalendarEvent,
  CalendarViewMode,
} from "@/lib/calendar/types";

export function MobileCalendar({
  month,
  today,
  selectedDate,
  view,
  events,
  connections,
  onChangeView,
  onPrev,
  onNext,
  onSelectDay,
  onSelectEvent,
  onNewEvent,
  onManageConnections,
}: {
  month: Date;
  today: Date;
  selectedDate: Date;
  view: CalendarViewMode;
  events: CalendarEvent[];
  connections: CalendarConnection[];
  onChangeView: (view: CalendarViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onSelectDay: (day: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onNewEvent: () => void;
  onManageConnections: () => void;
}) {
  const weeks = buildMonthMatrix(month);
  const dayEvents = eventsOnDay(events, selectedDate);

  return (
    <div className="relative md:hidden">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-[26px] leading-none text-text-primary">Calendar</h1>
        <button
          type="button"
          aria-label="Filter events"
          className="grid h-9 w-9 place-items-center rounded-md border border-border-default bg-card text-text-secondary"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      <ViewTabs value={view} onChange={onChangeView} className="mt-4 w-full justify-between" />

      <div className="mt-4 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous month"
          className="grid h-8 w-8 place-items-center rounded-full text-text-secondary"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-[15px] font-semibold text-text-primary">
          {format(month, "MMMM yyyy")}
        </span>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next month"
          className="grid h-8 w-8 place-items-center rounded-full text-text-secondary"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {view === "agenda" ? (
        <div className="mt-4">
          <AgendaList month={month} today={today} events={events} onSelectEvent={onSelectEvent} />
        </div>
      ) : (
        <>
          <div className="mt-3 rounded-[18px] border border-border-default bg-card p-2">
            <div className="grid grid-cols-7">
              {WEEKDAY_INITIALS.map((initial, index) => (
                <span
                  key={`${initial}-${index}`}
                  className="py-1 text-center text-[11px] font-semibold text-text-tertiary"
                >
                  {initial}
                </span>
              ))}
            </div>

            {weeks.map((week) => (
              <div key={week.key} className="grid grid-cols-7">
                {week.days.map((day) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const inMonth = isSameMonth(day, month);
                  const dots = eventsOnDay(events, day);

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => onSelectDay(day)}
                      aria-pressed={isSelected}
                      className="flex flex-col items-center gap-1 py-1.5"
                    >
                      <span
                        className={cn(
                          "grid h-8 w-8 place-items-center rounded-full text-[13px] font-semibold",
                          isSelected
                            ? "bg-accent text-white"
                            : inMonth
                              ? "text-text-primary"
                              : "text-text-tertiary",
                          !isSelected && isSameDay(day, today) && "ring-1 ring-accent"
                        )}
                      >
                        {day.getDate()}
                      </span>
                      <span className="flex h-1.5 items-center gap-0.5">
                        {dots.slice(0, 3).map((event) => (
                          <span
                            key={event.id}
                            aria-hidden
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: SOURCE_STYLES[event.source].dot }}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold text-text-primary">
              {format(selectedDate, "EEE, MMM d")}
            </h2>
            <span className="text-[12px] text-text-secondary">
              {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
            </span>
          </div>

          <ul className="mt-2.5 space-y-2">
            {dayEvents.length === 0 ? (
              <li className="rounded-lg border border-border-default bg-card px-4 py-8 text-center text-[13px] text-text-secondary">
                Nothing scheduled.
              </li>
            ) : (
              dayEvents.map((event) => {
                const style = SOURCE_STYLES[event.source];
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => onSelectEvent(event)}
                      className="flex w-full items-center gap-3 overflow-hidden rounded-lg border border-border-default bg-card p-3 text-left shadow-sm"
                    >
                      <span
                        aria-hidden
                        className="h-10 w-1 shrink-0 rounded-full"
                        style={{ backgroundColor: style.dot }}
                      />
                      <span className="w-[62px] shrink-0 text-[12px] font-semibold text-text-secondary">
                        {event.allDay ? "All day" : formatTime(event.start)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-semibold text-text-primary">
                            {event.title}
                          </span>
                          {style.synced ? (
                            <Lock size={11} className="shrink-0 text-text-tertiary" aria-label="Synced" />
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-text-secondary">
                          {formatDuration(event)}
                          {event.location ? ` · ${event.location}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <h2 className="mt-6 text-[15px] font-semibold text-text-primary">Connected calendars</h2>
          <ul className="mt-2.5 space-y-2">
            {connections.map((connection) => (
              <li key={connection.id}>
                <button
                  type="button"
                  onClick={onManageConnections}
                  className="flex w-full items-center gap-3 rounded-lg border border-border-default bg-card p-3 text-left"
                >
                  <ProviderMark provider={connection.provider} size={30} />
                  <span className="flex-1 truncate text-[13px] font-semibold text-text-primary">
                    {connection.name}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                      connection.status === "connected"
                        ? "bg-[#EAF7F0] text-[#136F4C]"
                        : connection.status === "error"
                          ? "bg-[#FDECEC] text-[#B23A3A]"
                          : "bg-border-subtle text-text-secondary"
                    )}
                  >
                    {connection.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <button
        type="button"
        onClick={onNewEvent}
        aria-label="New event"
        className="fixed bottom-[84px] right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-lg transition-colors duration-150 hover:bg-accent-hover"
      >
        <Plus size={24} strokeWidth={2.25} />
      </button>
    </div>
  );
}
