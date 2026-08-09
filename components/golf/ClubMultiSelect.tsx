"use client";

import { cn } from "@/lib/utils/cn";
import { KLUBIT } from "@/lib/golf/clubs";

/** Chip multi-select, always keeps at least one club selected. */
export function ClubMultiSelect({
  selected,
  onChange,
}: {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      if (next.size > 1) next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next);
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-text-secondary">Klubit</p>
      <div className="flex flex-wrap gap-2">
        {KLUBIT.map((club) => {
          const isSelected = selected.has(club.id);
          return (
            <button
              key={club.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggle(club.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                isSelected
                  ? "border-accent bg-accent text-white"
                  : "border-border-default bg-card text-text-secondary hover:bg-sand-200 hover:text-text-primary"
              )}
            >
              {club.nimi}
            </button>
          );
        })}
      </div>
    </div>
  );
}
