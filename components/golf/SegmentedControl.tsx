"use client";

import { cn } from "@/lib/utils/cn";

/** Small pill-style option switcher, styled like calendar/ViewTabs.tsx. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-[14px] border border-border-default bg-card p-1",
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-[10px] px-4 py-1.5 text-[13px] font-semibold transition-colors duration-150",
              isActive
                ? "bg-accent text-white"
                : "text-text-secondary hover:bg-border-subtle hover:text-text-primary"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
