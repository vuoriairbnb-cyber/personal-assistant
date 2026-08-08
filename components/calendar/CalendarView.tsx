"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
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
import { DEMO_NOW } from "@/lib/calendar/mock-data";
import { eventRange } from "@/lib/calendar/grid";
import type {
  CalendarConnection,
  CalendarEvent,
  CalendarTripRef,
  CalendarViewMode,
  ConnectionStatus,
} from "@/lib/calendar/types";

const SYNC_DURATION_MS = 1200;

/**
 * Owns all calendar state. Desktop and mobile render the same data from here, so
 * switching viewport keeps the selected day, month and view in sync.
 *
 * `DEMO_NOW` stands in for the real clock while the module runs on mock data —
 * see lib/calendar/mock-data.ts.
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
  const today = DEMO_NOW;

  const [events, setEvents] = useState(initialEvents);
  const [connections, setConnections] = useState(initialConnections);
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [view, setView] = useState<CalendarViewMode>("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [connectionsDialogOpen, setConnectionsDialogOpen] = useState(false);

  const syncTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    const timers = syncTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const setStatus = useCallback((id: string, patch: Partial<CalendarConnection>) => {
    setConnections((current) =>
      current.map((connection) =>
        connection.id === id ? { ...connection, ...patch } : connection
      )
    );
  }, []);

  const handleSync = useCallback(
    (id: string) => {
      setStatus(id, { status: "syncing", error: null });
      clearTimeout(syncTimers.current[id]);
      syncTimers.current[id] = setTimeout(() => {
        setStatus(id, { status: "connected", lastSyncedAt: today.toISOString(), error: null });
      }, SYNC_DURATION_MS);
    },
    [setStatus, today]
  );

  const handleDisconnect = useCallback(
    (id: string) => setStatus(id, { status: "disconnected", lastSyncedAt: null }),
    [setStatus]
  );

  const handleConnect = useCallback((id: string) => handleSync(id), [handleSync]);

  const handleSetStatus = useCallback(
    (id: string, status: ConnectionStatus) => {
      clearTimeout(syncTimers.current[id]);
      if (status === "syncing") {
        handleSync(id);
        return;
      }
      setStatus(id, {
        status,
        error: status === "error" ? "Authorization expired. Reconnect to resume syncing." : null,
      });
    },
    [handleSync, setStatus]
  );

  const handleSelectDay = useCallback((day: Date) => {
    setSelectedDate(day);
    setMonth(startOfMonth(day));
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedDate(eventRange(event).start);
  }, []);

  const handleSaveEvent = useCallback((event: CalendarEvent) => {
    setEvents((current) => [...current, event]);
    setSelectedDate(eventRange(event).start);
  }, []);

  const handleDeleteEvent = useCallback((id: string) => {
    setEvents((current) => current.filter((event) => event.id !== id));
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
              connections={connections}
              now={today}
              onSync={handleSync}
              onDisconnect={handleDisconnect}
              onConnect={handleConnect}
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
        connections={connections}
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
        onConnect={handleConnect}
        onManage={handleManageConnections}
      />

      {/* ----------------------------------------------------------------- mobile */}
      <MobileCalendar
        month={month}
        today={today}
        selectedDate={activeDay}
        view={view}
        events={events}
        connections={connections}
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
        onSave={handleSaveEvent}
        trips={trips}
        defaultDate={activeDay}
      />

      <ConnectionsDialog
        open={connectionsDialogOpen}
        onClose={() => setConnectionsDialogOpen(false)}
        connections={connections}
        now={today}
        onSync={handleSync}
        onDisconnect={handleDisconnect}
        onConnect={handleConnect}
        onSetStatus={handleSetStatus}
      />
    </>
  );
}
