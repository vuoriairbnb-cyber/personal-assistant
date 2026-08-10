"use client";

import { cn } from "@/lib/utils/cn";
import { KLUBIT } from "@/lib/golf/clubs";

/** Course chips are shown only for selected clubs that actually have a choice. */
export function CourseMultiSelect({
  selectedClubs,
  selectedCourses,
  onChange,
}: {
  selectedClubs: Set<string>;
  selectedCourses: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const multiCourseClubs = KLUBIT.filter(
    (club) => selectedClubs.has(club.id) && club.kentat.length > 1
  );
  if (multiCourseClubs.length === 0) return null;

  function toggle(clubId: string, courseId: string, courseIds: string[]) {
    const key = `${clubId}:${courseId}`;
    const next = new Set(selectedCourses);
    const selectedForClub = courseIds.filter((id) => next.has(`${clubId}:${id}`));

    // Keep at least one course selected for every displayed multi-course club.
    if (next.has(key)) {
      if (selectedForClub.length > 1) next.delete(key);
    } else {
      next.add(key);
    }
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {multiCourseClubs.map((club) => {
        const courseIds = club.kentat.map((course) => course.id);
        return (
          <div key={club.id}>
            <p className="mb-1.5 text-xs font-semibold text-text-secondary">{club.nimi} — kentät</p>
            <div className="flex flex-wrap gap-2">
              {club.kentat.map((course) => {
                const isSelected = selectedCourses.has(`${club.id}:${course.id}`);
                return (
                  <button
                    key={course.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggle(club.id, course.id, courseIds)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                      isSelected
                        ? "border-accent bg-accent text-white"
                        : "border-border-default bg-card text-text-secondary hover:bg-sand-200 hover:text-text-primary"
                    )}
                  >
                    {course.nimi}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
