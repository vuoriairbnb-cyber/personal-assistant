import { SOURCE_ORDER, SOURCE_STYLES } from "@/lib/calendar/source-styles";

const SHORT_LABELS: Record<string, string> = {
  manual: "Manual",
  trip: "Trip",
  google: "Google",
  airbnb: "Airbnb",
};

export function LegendCard() {
  return (
    <section className="rounded-lg border border-border-default bg-card p-4 shadow-sm">
      <h2 className="text-[14px] font-semibold text-text-primary">Legend</h2>
      <ul className="mt-3 grid grid-cols-2 gap-y-2.5">
        {SOURCE_ORDER.map((source) => (
          <li key={source} className="flex items-center gap-2 text-[12px] text-text-secondary">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: SOURCE_STYLES[source].dot }}
            />
            {SHORT_LABELS[source]}
          </li>
        ))}
      </ul>
    </section>
  );
}
