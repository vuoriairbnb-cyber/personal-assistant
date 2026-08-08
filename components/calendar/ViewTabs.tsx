"use client";

import { cn } from "@/lib/utils/cn";
import type { CalendarViewMode } from "@/lib/calendar/types";

const VIEWS: { value: CalendarViewMode; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "agenda", label: "Agenda" },
];

export function ViewTabs({
  value,
  onChange,
  className,
}: {
  value: CalendarViewMode;
  onChange: (view: CalendarViewMode) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Calendar view"
      className={cn(
        "inline-flex items-center gap-1 rounded-[14px] border border-border-default bg-card p-1",
        className
      )}
    >
      {VIEWS.map((view) => {
        const isActive = view.value === value;
        return (
          <button
            key={view.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(view.value)}
            className={cn(
              "rounded-[10px] px-4 py-1.5 text-[13px] font-semibold transition-colors duration-150",
              isActive
                ? "bg-accent text-white"
                : "text-text-secondary hover:bg-border-subtle hover:text-text-primary"
            )}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}
