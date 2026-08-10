// Shapes for the HGK / WiseGolf reservation API. See CLAUDE-golf.md for the
// full API writeup — these types mirror the raw response fields we actually
// use, not the full undocumented payload.

/** One booked player seat. No personal data lives on this shape. */
export interface ReservationRow {
  start: string; // "YYYY-MM-DD HH:MM:SS"
  end: string;
  status: number;
  quantity: number;
}

export interface ReservationsResponse {
  success: boolean;
  rows: ReservationRow[];
  // reservationsGolfPlayers[] and reservationsAdditionalResources[] also
  // exist on the real response but are intentionally not typed here — they
  // must never be read past lib/golf/client.ts, let alone forwarded to the
  // client. See "Henkilötiedot" in CLAUDE-golf.md.
}

export interface ResourceRule {
  ruleName: string;
  startDate: string | null;
  endDate: string | null;
  startTime: string;
  endTime: string;
  /** 7 booleans, index 0 = Monday. null means "every day" within the date range. */
  recurrenceDays: boolean[] | null;
  ruleValue?: {
    comment?: string;
    /** kuumatAjat: this tee time opens this many minutes before its start. */
    minutes?: number;
    inheritToOthers?: boolean;
  };
}

export interface CalendarSettingsResponse {
  success: boolean;
  reservationSettings: {
    startTime: string; // "06:00:00"
    endTime: string; // "21:00:00"
    duration: number; // minutes
    breakTime: number; // minutes
    resources: { quantity: number }[];
  };
  resourceRules: ResourceRule[];
}

/** Clean, privacy-safe output shape — the only thing the client ever sees. */
export interface FreeSlot {
  aika: string; // "HH:MM"
  /** Legacy Finnish name retained for existing consumers. */
  vapaita: number;
  /** Explicit availability independent from whether the time is bookable yet. */
  availablePlayers: number;
  bookableNow: boolean;
  bookingRestriction?: {
    type: "opens_before_start";
    minutesBefore: number;
    /** ISO UTC instant, calculated from the tee time in Europe/Helsinki. */
    opensAt: string;
  };
}

export type ClubDayStatus =
  | "ok"
  /** Requested date falls outside the club's configured season. */
  | "kausi_kiinni"
  /** Requested date is further out than the club's booking calendar reaches. */
  | "liian_kaukana"
  /** The club's own WiseGolf API call failed — doesn't take the rest of a
   * multi-club search down with it. */
  | "virhe";

export interface ClubDayResult {
  /** Legacy aliases retained for the existing result components. */
  club: string;
  nimi: string;
  /** Explicit club/course fields make one course result independently identifiable. */
  clubId: string;
  clubName: string;
  courseId: string;
  courseName: string;
  status: ClubDayStatus;
  vapaat: FreeSlot[];
  /** Set only when status === "liian_kaukana": how far ahead this club's calendar goes. */
  horisonttiPaivia?: number;
}

export interface DayGroup {
  date: string;
  clubs: ClubDayResult[];
}
