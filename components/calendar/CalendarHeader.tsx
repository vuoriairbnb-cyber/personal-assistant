"use client";

import { format } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight, Plus, SlidersHorizontal } from "lucide-react";
import { ViewTabs } from "@/components/calendar/ViewTabs";
import type { CalendarViewMode } from "@/lib/calendar/types";

export function CalendarHeader({
  month,
  view,
  onChangeView,
  onPrev,
  onNext,
  onToday,
  onNewEvent,
}: {
  month: Date;
  view: CalendarViewMode;
  onChangeView: (view: CalendarViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNewEvent: () => void;
}) {
  return (
    <header className="mb-6">
      <h1 className="font-serif text-[34px] leading-none text-text-primary">Calendar</h1>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <ViewTabs value={view} onChange={onChangeView} />

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onToday}
            className="rounded-md border border-border-default bg-card px-4 py-2 text-[13px] font-semibold text-text-primary transition-colors duration-150 hover:bg-border-subtle"
          >
            Today
          </button>
          <NavButton label="Previous month" onClick={onPrev}>
            <ChevronLeft size={16} />
          </NavButton>
          <NavButton label="Next month" onClick={onNext}>
            <ChevronRight size={16} />
          </NavButton>
          <span className="flex items-center gap-1 px-2 text-[15px] font-semibold text-text-primary">
            {format(month, "MMMM yyyy")}
            <ChevronDown size={15} className="text-text-tertiary" aria-hidden />
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNewEvent}
            className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-accent-hover"
          >
            <Plus size={16} strokeWidth={2.25} />
            New event
          </button>
          <NavButton label="Filter events">
            <SlidersHorizontal size={16} />
          </NavButton>
        </div>
      </div>
    </header>
  );
}

function NavButton({
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
      className="grid h-9 w-9 place-items-center rounded-md border border-border-default bg-card text-text-secondary transition-colors duration-150 hover:bg-border-subtle hover:text-text-primary"
    >
      {children}
    </button>
  );
}
