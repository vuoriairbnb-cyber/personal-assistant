"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils/cn";
import { Dialog } from "@/components/ui/Dialog";
import { createCalendarEvent } from "@/lib/actions/calendar";
import { formatDayRange } from "@/lib/calendar/format";
import type { CalendarTripRef } from "@/lib/calendar/types";

const FIELD_CLASSES =
  "w-full rounded-md border border-border-default bg-card px-3 py-2 text-[13px] text-text-primary outline-none transition-shadow duration-150 placeholder:text-text-tertiary focus:border-accent focus:shadow-focus";

export function NewEventDialog({
  open,
  onClose,
  trips,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  trips: CalendarTripRef[];
  defaultDate: Date;
}) {
  const day = format(defaultDate, "yyyy-MM-dd");

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(day);
  const [startTime, setStartTime] = useState("12:30");
  const [endDate, setEndDate] = useState(day);
  const [endTime, setEndTime] = useState("13:30");
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [tripId, setTripId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    if (!title.trim()) return;

    formData.set("all_day", allDay ? "true" : "false");
    setError(null);
    startTransition(async () => {
      try {
        await createCalendarEvent(formData);
        setTitle("");
        setLocation("");
        setNotes("");
        setTripId("");
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save the event.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New event"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border-default bg-card px-4 py-2 text-[13px] font-semibold text-text-secondary transition-colors duration-150 hover:bg-sand-200 hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-event-form"
            disabled={!title.trim() || isPending}
            className="rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-accent-foreground transition-colors duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save event"}
          </button>
        </>
      }
    >
      {error && (
        <p className="mb-3 text-[13px] text-danger-strong">{error}</p>
      )}
      <form id="new-event-form" action={handleSubmit} className="space-y-3.5">
        <div className="flex items-end gap-3">
          <Field label="Title" className="flex-1">
            <input
              name="title"
              className={FIELD_CLASSES}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Lunch with John"
            />
          </Field>
          <div className="flex items-center gap-2 pb-2">
            <span className="text-[12px] font-medium text-text-secondary">All-day</span>
            <button
              type="button"
              role="switch"
              aria-checked={allDay}
              aria-label="All-day event"
              onClick={() => setAllDay((value) => !value)}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
                allDay ? "bg-accent" : "bg-border-default"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200",
                  allDay ? "left-[22px]" : "left-0.5"
                )}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start">
            <div className="flex gap-2">
              <input
                type="date"
                name="start_date"
                className={FIELD_CLASSES}
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
              {!allDay && (
                <input
                  type="time"
                  name="start_time"
                  className={cn(FIELD_CLASSES, "w-[104px]")}
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              )}
            </div>
          </Field>
          <Field label="End">
            <div className="flex gap-2">
              <input
                type="date"
                name="end_date"
                className={FIELD_CLASSES}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
              {!allDay && (
                <input
                  type="time"
                  name="end_time"
                  className={cn(FIELD_CLASSES, "w-[104px]")}
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                />
              )}
            </div>
          </Field>
        </div>

        <Field label="Location (optional)">
          <input
            name="location"
            className={FIELD_CLASSES}
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Cafe Sophia"
          />
        </Field>

        <Field label="Link to trip (optional)">
          <select
            name="trip_id"
            className={FIELD_CLASSES}
            value={tripId}
            onChange={(event) => setTripId(event.target.value)}
            disabled={trips.length === 0}
          >
            <option value="">
              {trips.length === 0 ? "No trips available yet" : "No linked trip"}
            </option>
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {`${trip.title} (${formatDayRange(trip.start, trip.end)})`}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Notes (optional)">
          <textarea
            name="notes"
            rows={3}
            className={cn(FIELD_CLASSES, "resize-none")}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Catch up on Q2 planning and goals."
          />
        </Field>
      </form>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[11px] font-semibold text-text-secondary">{label}</span>
      {children}
    </label>
  );
}
