"use client";

import { Plane, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SOURCE_STYLES, tripBarClasses } from "@/lib/calendar/source-styles";
import { formatDayRange } from "@/lib/calendar/format";
import type { WeekSpan } from "@/lib/calendar/grid";
import type { CalendarEvent } from "@/lib/calendar/types";

/**
 * A multi-day event drawn as one continuous bar across a week row. Trips get a
 * warm accent and a plane glyph so they never read as an ordinary appointment;
 * multi-day events from other sources reuse their own source colour.
 */
export function TripBar({
  span,
  onSelect,
}: {
  span: WeekSpan;
  onSelect?: (event: CalendarEvent) => void;
}) {
  const { event, continuesLeft, continuesRight } = span;
  const isTrip = event.source === "trip";
  const colors = isTrip ? tripBarClasses(event.tripId) : SOURCE_STYLES[event.source].bar;

  return (
    <button
      type="button"
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
        onSelect?.(event);
      }}
      className={cn(
        "pointer-events-auto flex h-[22px] w-full items-center gap-1.5 border px-2 text-left transition-shadow duration-150 hover:shadow-sm",
        colors,
        continuesLeft ? "rounded-l-none border-l-0 pl-1.5" : "rounded-l-sm",
        continuesRight ? "rounded-r-none border-r-0" : "rounded-r-sm"
      )}
    >
      {!continuesLeft && isTrip ? <Plane size={11} className="shrink-0" aria-hidden /> : null}
      <span className="truncate text-[11px] font-semibold">
        {continuesLeft ? "" : event.title}
      </span>
      {!continuesLeft ? (
        <span className="hidden truncate text-[11px] opacity-70 sm:inline">
          {formatDayRange(event.start, event.end)}
        </span>
      ) : null}
      {continuesRight ? (
        <ChevronRight size={12} className="ml-auto shrink-0 opacity-70" aria-hidden />
      ) : null}
    </button>
  );
}
