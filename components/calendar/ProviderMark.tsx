import { cn } from "@/lib/utils/cn";
import type { ConnectionProvider } from "@/lib/calendar/types";

const MARKS: Record<ConnectionProvider, { letter: string; classes: string }> = {
  google: { letter: "G", classes: "bg-[#EBF1FE] text-[#22489E]" },
  airbnb: { letter: "A", classes: "bg-[#FDECF0] text-[#C1365C]" },
};

/**
 * Neutral lettermark placeholder for each provider. Deliberately not the real
 * Google/Airbnb logos — swap these for licensed brand assets if the integrations
 * ship publicly.
 */
export function ProviderMark({
  provider,
  size = 32,
  className,
}: {
  provider: ConnectionProvider;
  size?: number;
  className?: string;
}) {
  const mark = MARKS[provider];
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn(
        "grid shrink-0 place-items-center rounded-[10px] text-[14px] font-bold",
        mark.classes,
        className
      )}
    >
      {mark.letter}
    </span>
  );
}
