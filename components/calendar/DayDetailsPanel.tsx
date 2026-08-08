"use client";

import { format } from "date-fns";
import { ArrowRight, CalendarDays, Lock, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SOURCE_STYLES } from "@/lib/calendar/source-styles";
import { formatTimeRange } from "@/lib/calendar/format";
import { eventsOnDay } from "@/lib/calendar/grid";
import { isEditable, type CalendarEvent } from "@/lib/calendar/types";

export function DayDetailsPanel({
  day,
  events,
  onClose,
  onSeeAgenda,
  onDeleteEvent,
}: {
  day: Date;
  events: CalendarEvent[];
  onClose: () => void;
  onSeeAgenda: () => void;
  onDeleteEvent: (id: string) => void;
}) {
  const dayEvents = eventsOnDay(events, day);

  return (
    <section className="rounded-lg border border-border-default bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-text-primary">{format(day, "EEE, MMM d")}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close day details"
          className="grid h-7 w-7 place-items-center rounded-full text-text-tertiary transition-colors duration-150 hover:bg-border-subtle hover:text-text-primary"
        >
          <X size={15} />
        </button>
      </div>

      {dayEvents.length === 0 ? (
        <p className="mt-4 rounded-[14px] bg-card-hover px-3 py-6 text-center text-[13px] text-text-secondary">
          Nothing scheduled.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {dayEvents.map((event) => {
            const style = SOURCE_STYLES[event.source];
            return (
              <li
                key={event.id}
                className="rounded-[14px] border border-border-subtle bg-card-hover p-3"
              >
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: style.dot }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-text-secondary">
                      {formatTimeRange(event)}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] font-semibold text-text-primary">
                      {event.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-text-secondary">
                      {event.location ?? (style.synced ? "(Read-only)" : style.label)}
                    </p>
                  </div>

                  {/* Read-only sources get a badge and no controls at all —
                      never a disabled button, which would imply it's editable. */}
                  {isEditable(event) ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <IconAction label={`Edit ${event.title}`}>
                        <Pencil size={13} />
                      </IconAction>
                      <IconAction
                        label={`Delete ${event.title}`}
                        onClick={() => onDeleteEvent(event.id)}
                      >
                        <Trash2 size={13} />
                      </IconAction>
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        style.synced
                          ? "bg-border-subtle text-text-secondary"
                          : "bg-accent-subtle text-accent"
                      )}
                    >
                      {style.synced ? <Lock size={9} aria-hidden /> : <CalendarDays size={9} aria-hidden />}
                      {style.synced ? "Synced" : "Trip"}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={onSeeAgenda}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-border-subtle py-2 text-[13px] font-semibold text-accent transition-colors duration-150 hover:bg-accent-subtle"
      >
        See full agenda
        <ArrowRight size={14} />
      </button>
    </section>
  );
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-6 w-6 place-items-center rounded-sm text-text-tertiary transition-colors duration-150 hover:bg-border-subtle hover:text-text-primary"
    >
      {children}
    </button>
  );
}
