import { format } from "date-fns";
import { fi } from "date-fns/locale";
import { ClubResultSection } from "@/components/golf/ClubResultSection";
import type { DayGroup } from "@/lib/golf/types";

/** One day's results: a date heading, then one collapsible section per club. */
export function DayGroupResults({ group }: { group: DayGroup }) {
  const label = format(new Date(`${group.date}T12:00:00`), "EEEE d.M.", { locale: fi });

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold capitalize text-text-primary">{label}</h3>
      <div className="space-y-2">
        {group.clubs.map((club) => (
          <ClubResultSection key={club.club} result={club} />
        ))}
      </div>
    </div>
  );
}
