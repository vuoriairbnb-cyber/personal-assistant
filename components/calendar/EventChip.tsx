"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SOURCE_STYLES } from "@/lib/calendar/source-styles";
import { formatTime } from "@/lib/calendar/format";
import type { CalendarEvent } from "@/lib/calendar/types";

/** Single-day event pill inside a month cell. */
export function EventChip({
  event,
  onSelect,
  selected,
}: {
  event: CalendarEvent;
  onSelect?: (event: CalendarEvent) => void;
  selected?: boolean;
}) {
  const style = SOURCE_STYLES[event.source];

  return (
    <button
      type="button"
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
        onSelect?.(event);
      }}
      className={cn(
        "block w-full rounded-sm border px-2 py-1 text-left transition-shadow duration-150 hover:shadow-sm",
        style.chip,
        selected && "ring-2 ring-accent/40"
      )}
    >
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: style.dot }}
        />
        <span className="truncate text-[11px] font-medium opacity-90">
          {event.allDay ? "All day" : formatTime(event.start)}
        </span>
        {style.synced ? <Lock size={10} aria-label="Synced, read-only" className="shrink-0" /> : null}
      </span>
      <span className="mt-0.5 block truncate text-[12px] font-semibold leading-tight">
        {event.title}
      </span>
    </button>
  );
}
