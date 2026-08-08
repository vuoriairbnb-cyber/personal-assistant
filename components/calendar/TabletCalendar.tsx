"use client";

import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { WeekGrid } from "@/components/calendar/WeekGrid";
import { AgendaList } from "@/components/calendar/AgendaList";
import { DayDetailsPanel } from "@/components/calendar/DayDetailsPanel";
import { ConnectedCalendarsPanel } from "@/components/calendar/ConnectedCalendarsPanel";
import { LegendCard } from "@/components/calendar/LegendCard";
import { CalendarEmptyState } from "@/components/calendar/CalendarEmptyState";
import type {
  CalendarConnection,
  CalendarEvent,
  CalendarViewMode,
} from "@/lib/calendar/types";

/**
 * md–xl tier (768–1279px). AppShell's sidebar already occupies 260px from md
 * up, same as every other page, which leaves too little room here for the
 * desktop tier's two-column grid + fixed 300px aside — that one waits for xl
 * (1280px). Below that, this reuses the same full MonthGrid/WeekGrid/AgendaList
 * the desktop uses (already comfortable at this width) and stacks the side
 * panels in a two-column row below instead of a narrow aside column.
 *
 * MobileCalendar's compact dot-grid is tuned for a 375px phone — stretched
 * across a tablet it just reads as the same layout again, which is what
 * originally looked like a duplicate next to the phone view.
 */
export function TabletCalendar({
  month,
  view,
  today,
  selectedDate,
  events,
  connections,
  showEmptyState,
  onChangeView,
  onPrev,
  onNext,
  onToday,
  onNewEvent,
  onSelectDay,
  onSelectEvent,
  onDeleteEvent,
  onCloseDay,
  onSeeAgenda,
  onSync,
  onDisconnect,
  onConnect,
  onManage,
}: {
  month: Date;
  view: CalendarViewMode;
  today: Date;
  selectedDate: Date | null;
  events: CalendarEvent[];
  connections: CalendarConnection[];
  showEmptyState: boolean;
  onChangeView: (view: CalendarViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNewEvent: () => void;
  onSelectDay: (day: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onCloseDay: () => void;
  onSeeAgenda: () => void;
  onSync: (id: string) => void;
  onDisconnect: (id: string) => void;
  onConnect: (id: string) => void;
  onManage: () => void;
}) {
  return (
    <div className="hidden md:block xl:hidden">
      <CalendarHeader
        month={month}
        view={view}
        onChangeView={onChangeView}
        onPrev={onPrev}
        onNext={onNext}
        onToday={onToday}
        onNewEvent={onNewEvent}
      />

      {showEmptyState ? (
        <CalendarEmptyState onNewEvent={onNewEvent} onConnect={onManage} />
      ) : view === "month" ? (
        <MonthGrid
          month={month}
          today={today}
          selectedDate={selectedDate}
          events={events}
          onSelectDay={onSelectDay}
          onSelectEvent={onSelectEvent}
        />
      ) : view === "week" ? (
        <WeekGrid
          anchor={selectedDate ?? today}
          today={today}
          selectedDate={selectedDate}
          events={events}
          onSelectDay={onSelectDay}
          onSelectEvent={onSelectEvent}
        />
      ) : (
        <AgendaList month={month} today={today} events={events} onSelectEvent={onSelectEvent} />
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {selectedDate ? (
          <DayDetailsPanel
            day={selectedDate}
            events={events}
            onClose={onCloseDay}
            onSeeAgenda={onSeeAgenda}
            onDeleteEvent={onDeleteEvent}
          />
        ) : null}

        <ConnectedCalendarsPanel
          connections={connections}
          now={today}
          onSync={onSync}
          onDisconnect={onDisconnect}
          onConnect={onConnect}
          onManage={onManage}
        />

        <LegendCard />
      </div>
    </div>
  );
}
