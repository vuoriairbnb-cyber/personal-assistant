import { CalendarDays, Plane, Lock, PenLine, Flag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SOURCE_ORDER, SOURCE_STYLES } from "@/lib/calendar/source-styles";
import type { CalendarEventSource } from "@/lib/calendar/types";

const ICONS: Record<CalendarEventSource, LucideIcon> = {
  manual: PenLine,
  trip: Plane,
  google: CalendarDays,
  airbnb: Lock,
  golf: Flag,
};

/** Explains why the four sources look different and which of them you can edit. */
export function SourceGuideCard() {
  return (
    <section className="rounded-lg border border-border-default bg-card p-4 shadow-sm">
      <ul className="space-y-3.5">
        {SOURCE_ORDER.map((source) => {
          const style = SOURCE_STYLES[source];
          const Icon = ICONS[source];
          return (
            <li key={source} className="flex items-start gap-2.5">
              <span
                aria-hidden
                className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[9px]"
                style={{ backgroundColor: `${style.dot}1F`, color: style.dot }}
              >
                <Icon size={14} />
              </span>
              <span>
                <span className="block text-[12px] font-semibold text-text-primary">
                  {style.label}
                </span>
                <span className="block text-[12px] leading-snug text-text-secondary">
                  {style.description}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
