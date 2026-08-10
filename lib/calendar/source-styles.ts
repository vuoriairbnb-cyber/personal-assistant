import type { CalendarEventSource } from "@/lib/calendar/types";

/**
 * Single source of truth for how each event source looks and reads. Chips, the
 * legend, the source guide card and the day panel all pull from here — colours
 * must never be re-declared at a call site.
 */
export interface SourceStyle {
  /** Legend / guide card label. */
  label: string;
  /** One-line explanation used by the source guide card. */
  description: string;
  /** Solid colour for legend dots and mobile accent strips. */
  dot: string;
  /** Chip background + text + hairline border, as Tailwind arbitrary values. */
  chip: string;
  /** Slightly stronger fill for multi-day trip bars. */
  bar: string;
  /** Whether this source can be edited from inside the Calendar module. */
  editable: boolean;
  /** Shown as a "synced" badge — the event is owned by an external system. */
  synced: boolean;
}

export const SOURCE_STYLES: Record<CalendarEventSource, SourceStyle> = {
  manual: {
    label: "Manual event",
    description: "Created by you. Editable.",
    dot: "#22A06B",
    chip: "bg-[#EAF7F0] text-[#136F4C] border-[#CDEBDD]",
    bar: "bg-[#DFF3E9] text-[#136F4C] border-[#BFE4D2]",
    editable: true,
    synced: false,
  },
  trip: {
    label: "Trip (from Trips)",
    description: "Imported from your trips. Spans multiple days.",
    dot: "#E8894A",
    chip: "bg-[#FDF1E4] text-[#9A5A1E] border-[#F5DCC1]",
    bar: "bg-[#FDF1E4] text-[#9A5A1E] border-[#F0D2AE]",
    editable: false,
    synced: false,
  },
  google: {
    label: "Google Calendar",
    description: "Synced from Google. Read-only.",
    dot: "#3B6EF5",
    chip: "bg-[#EBF1FE] text-[#22489E] border-[#D3E0FB]",
    bar: "bg-[#EBF1FE] text-[#22489E] border-[#C6D7F9]",
    editable: false,
    synced: true,
  },
  airbnb: {
    label: "Airbnb (iCal)",
    description: "Synced from Airbnb. Read-only.",
    dot: "#28A2BE",
    chip: "bg-[#E7F5F9] text-[#0E6076] border-[#C9E7EF]",
    bar: "bg-[#E7F5F9] text-[#0E6076] border-[#B8DFEA]",
    editable: false,
    synced: true,
  },
  golf: {
    label: "Golf (HGK)",
    description: "Omat golfvaraukset Helsingin Golfklubilta. Vain luku.",
    dot: "#2D7D46",
    chip: "bg-[#E8F5EC] text-[#1B5E30] border-[#C6E6CF]",
    bar: "bg-[#E8F5EC] text-[#1B5E30] border-[#B5DCC0]",
    editable: false,
    synced: false,
  },
};

export const SOURCE_ORDER: CalendarEventSource[] = ["manual", "trip", "google", "airbnb", "golf"];

/**
 * Trips alternate between two warm accents so two overlapping trips stay
 * distinguishable (the reference shows a rose Lisbon bar and an amber Tokyo one).
 */
const TRIP_ACCENTS = [
  "bg-[#FCEBF0] text-[#9B3B5C] border-[#F3CFDA]",
  "bg-[#FDF1E4] text-[#9A5A1E] border-[#F0D2AE]",
];

export function tripBarClasses(tripId: string | null | undefined) {
  if (!tripId) return SOURCE_STYLES.trip.bar;
  let hash = 0;
  for (let i = 0; i < tripId.length; i += 1) {
    hash = (hash * 31 + tripId.charCodeAt(i)) >>> 0;
  }
  return TRIP_ACCENTS[hash % TRIP_ACCENTS.length];
}
