import { format } from "date-fns";
import { fi } from "date-fns/locale";
import { Card } from "@/components/ui/Card";
import type { GolfSearchResult } from "@/lib/golf/types";

/** One day's free tee times. Shared by both search modes (text and form). */
export function DayResults({ day }: { day: GolfSearchResult }) {
  const label = format(new Date(`${day.date}T12:00:00`), "EEEE d.M.", { locale: fi });

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-subtle bg-card-hover px-4 py-2.5">
        <p className="text-sm font-semibold capitalize text-text-primary">{label}</p>
        <p className="text-xs text-text-tertiary">
          {day.yhteensa} {day.yhteensa === 1 ? "vapaa aika" : "vapaata aikaa"}
        </p>
      </div>
      {day.vapaat.length === 0 ? (
        <p className="px-4 py-4 text-sm text-text-secondary">Ei vapaita aikoja tälle päivälle.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4 md:grid-cols-6">
          {day.vapaat.map((slot) => (
            <div
              key={slot.aika}
              className="rounded-md border border-border-default bg-canvas px-2 py-2 text-center"
            >
              <p className="text-sm font-semibold text-text-primary">{slot.aika}</p>
              <p className="text-[11px] text-text-tertiary">
                {slot.vapaita} {slot.vapaita === 1 ? "paikka" : "paikkaa"}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
