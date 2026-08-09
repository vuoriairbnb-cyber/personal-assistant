"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { addMonths, endOfMonth, startOfMonth, subMonths } from "date-fns";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { WeekGrid } from "@/components/calendar/WeekGrid";
import { AgendaList } from "@/components/calendar/AgendaList";
import { DayDetailsPanel } from "@/components/calendar/DayDetailsPanel";
import { ConnectedCalendarsPanel } from "@/components/calendar/ConnectedCalendarsPanel";
import { LegendCard } from "@/components/calendar/LegendCard";
import { SourceGuideCard } from "@/components/calendar/SourceGuideCard";
import { NewEventDialog } from "@/components/calendar/NewEventDialog";
import { ConnectionsDialog } from "@/components/calendar/ConnectionsDialog";
import { CalendarEmptyState } from "@/components/calendar/CalendarEmptyState";
import { MobileCalendar } from "@/components/calendar/MobileCalendar";
import { TabletCalendar } from "@/components/calendar/TabletCalendar";
import { deleteCalendarEvent, disconnectAirbnbCalendar, syncAirbnbCalendar } from "@/lib/actions/calendar";
import { eventRange } from "@/lib/calendar/grid";
import type {
  CalendarConnection,
  CalendarEvent,
  CalendarTripRef,
  CalendarViewMode,
  ConnectionProvider,
} from "@/lib/calendar/types";

/**
 * Owns UI-only navigation state (selected day, month, active view, dialog
 * open/closed). `events`/`connections` come straight from props — they're
 * real Supabase data fetched by the server component in
 * app/(app)/calendar/page.tsx, and Server Actions + `revalidatePath("/calendar")`
 * refresh those props automatically after any mutation, the same way editing
 * a trip refreshes /trips/[id]. No client-side copy to keep in sync.
 */
export function CalendarView({
  initialEvents,
  initialConnections,
  trips,
}: {
  initialEvents: CalendarEvent[];
  initialConnections: CalendarConnection[];
  trips: CalendarTripRef[];
}) {
  const [today] = useState(() => new Date());
  const events = initialEvents;
  const connections = initialConnections;

  const [month, setMonth] = useState(() => startOfMonth(today));
  const [view, setView] = useState<CalendarViewMode>("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [connectionsDialogOpen, setConnectionsDialogOpen] = useState(false);

  // Server Actions run synchronously to completion before revalidating, so a
  // connection's DB status never actually passes through the browser as
  // "syncing" — this tracks the in-flight request client-side instead, purely
  // to drive the spinner.
  const [pendingProvider, setPendingProvider] = useState<ConnectionProvider | null>(null);
  const [, startTransition] = useTransition();

  const displayConnections = useMemo(
    () =>
      connections.map((connection) =>
        connection.provider === pendingProvider
          ? { ...connection, status: "syncing" as const }
          : connection
      ),
    [connections, pendingProvider]
  );

  const runAirbnbAction = useCallback((action: () => Promise<unknown>) => {
    setPendingProvider("airbnb");
    startTransition(async () => {
      try {
        await action();
      } catch {
        // The action already persisted the error onto the connection row
        // (see syncAirbnbCalendar) — the refreshed props carry it forward.
      } finally {
        setPendingProvider(null);
      }
    });
  }, []);

  const handleSync = useCallback(
    (id: string) => {
      const connection = connections.find((c) => c.id === id);
      if (connection?.provider !== "airbnb") return;
      runAirbnbAction(syncAirbnbCalendar);
    },
    [connections, runAirbnbAction]
  );

  const handleDisconnect = useCallback(
    (id: string) => {
      const connection = connections.find((c) => c.id === id);
      if (connection?.provider !== "airbnb") return;
      runAirbnbAction(disconnectAirbnbCalendar);
    },
    [connections, runAirbnbAction]
  );

  const handleSelectDay = useCallback((day: Date) => {
    setSelectedDate(day);
    setMonth(startOfMonth(day));
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedDate(eventRange(event).start);
  }, []);

  const handleDeleteEvent = useCallback((id: string) => {
    startTransition(() => {
      deleteCalendarEvent(id);
    });
  }, []);

  // Shared across the desktop, tablet and mobile tiers so all three stay in
  // sync no matter which one is visible at the current viewport width.
  const handlePrevMonth = useCallback(() => setMonth((current) => subMonths(current, 1)), []);
  const handleNextMonth = useCallback(() => setMonth((current) => addMonths(current, 1)), []);
  const handleToday = useCallback(() => {
    setMonth(startOfMonth(today));
    setSelectedDate(today);
  }, [today]);
  const handleNewEvent = useCallback(() => setEventDialogOpen(true), []);
  const handleManageConnections = useCallback(() => setConnectionsDialogOpen(true), []);
  const handleCloseDay = useCallback(() => setSelectedDate(null), []);
  const handleSeeAgenda = useCallback(() => setView("agenda"), []);

  /** Empty state only when there is genuinely nothing to show for this month. */
  const monthIsEmpty = useMemo(() => {
    const from = startOfMonth(month);
    const to = endOfMonth(month);
    return !events.some((event) => {
      const { start, end } = eventRange(event);
      return end >= from && start <= to;
    });
  }, [events, month]);

  const noneConnected = connections.every((connection) => connection.status === "disconnected");
  const showEmptyState = monthIsEmpty && noneConnected;

  const activeDay = selectedDate ?? today;

  return (
    <>
      {/* ---------------------------------------------------------------- desktop */}
      {/*
        Triggers at xl (1280px), not the tighter 1024px this used before the
        Calendar route merged into the shared AppShell: AppShell's sidebar
        already occupies 260px starting at md (768px, same as every other
        page), so the two-column grid + fixed 300px aside below needs the
        extra room xl provides rather than fighting the sidebar for space.
      */}
      <div className="hidden xl:block">
        <CalendarHeader
          month={month}
          view={view}
          onChangeView={setView}
          onPrev={handlePrevMonth}
          onNext={handleNextMonth}
          onToday={handleToday}
          onNewEvent={handleNewEvent}
        />

        <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-5">
          <div className="space-y-5">
            {showEmptyState ? (
              <CalendarEmptyState
                onNewEvent={handleNewEvent}
                onConnect={handleManageConnections}
              />
            ) : view === "month" ? (
              <MonthGrid
                month={month}
                today={today}
                selectedDate={selectedDate}
                events={events}
                onSelectDay={handleSelectDay}
                onSelectEvent={handleSelectEvent}
              />
            ) : view === "week" ? (
              <WeekGrid
                anchor={activeDay}
                today={today}
                selectedDate={selectedDate}
                events={events}
                onSelectDay={handleSelectDay}
                onSelectEvent={handleSelectEvent}
              />
            ) : (
              <AgendaList
                month={month}
                today={today}
                events={events}
                onSelectEvent={handleSelectEvent}
              />
            )}

            <div className="max-w-[420px]">
              <SourceGuideCard />
            </div>
          </div>

          <aside className="space-y-4">
            {selectedDate ? (
              <DayDetailsPanel
                day={selectedDate}
                events={events}
                onClose={handleCloseDay}
                onSeeAgenda={handleSeeAgenda}
                onDeleteEvent={handleDeleteEvent}
              />
            ) : null}

            <ConnectedCalendarsPanel
              connections={displayConnections}
              now={today}
              onSync={handleSync}
              onDisconnect={handleDisconnect}
              onConnect={handleSync}
              onManage={handleManageConnections}
            />

            <LegendCard />
          </aside>
        </div>
      </div>

      {/* ----------------------------------------------------------------- tablet */}
      <TabletCalendar
        month={month}
        view={view}
        today={today}
        selectedDate={selectedDate}
        events={events}
        connections={displayConnections}
        showEmptyState={showEmptyState}
        onChangeView={setView}
        onPrev={handlePrevMonth}
        onNext={handleNextMonth}
        onToday={handleToday}
        onNewEvent={handleNewEvent}
        onSelectDay={handleSelectDay}
        onSelectEvent={handleSelectEvent}
        onDeleteEvent={handleDeleteEvent}
        onCloseDay={handleCloseDay}
        onSeeAgenda={handleSeeAgenda}
        onSync={handleSync}
        onDisconnect={handleDisconnect}
        onConnect={handleSync}
        onManage={handleManageConnections}
      />

      {/* ----------------------------------------------------------------- mobile */}
      <MobileCalendar
        month={month}
        today={today}
        selectedDate={activeDay}
        view={view}
        events={events}
        connections={displayConnections}
        onChangeView={setView}
        onPrev={handlePrevMonth}
        onNext={handleNextMonth}
        onSelectDay={handleSelectDay}
        onSelectEvent={handleSelectEvent}
        onNewEvent={handleNewEvent}
        onManageConnections={handleManageConnections}
      />

      <NewEventDialog
        open={eventDialogOpen}
        onClose={() => setEventDialogOpen(false)}
        trips={trips}
        defaultDate={activeDay}
      />

      <ConnectionsDialog
        open={connectionsDialogOpen}
        onClose={() => setConnectionsDialogOpen(false)}
        connections={displayConnections}
        now={today}
        onSync={handleSync}
        onDisconnect={handleDisconnect}
        onConnect={handleSync}
      />
    </>
  );
}
