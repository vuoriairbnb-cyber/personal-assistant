// Shapes for the HGK / WiseGolf reservation API. See CLAUDE-golf.md for the
// full API writeup — these types mirror the raw response fields we actually
// use, not the full undocumented payload.

/** One booked player seat. No personal data lives on this shape. */
export interface ReservationRow {
  start: string; // "YYYY-MM-DD HH:MM:SS"
  end: string;
  status: number;
  quantity: number;
  /** Legacy resource location used by some WiseGolf products. */
  resourceId?: number | null;
  /**
   * Resource allocation for this capacity row. Multi-resource products put
   * the course ID here rather than on `row.resourceId`.
   */
  resources?: {
    resourceId?: number | string | null;
    quantity?: number | string | null;
  }[] | null;
}

export interface ReservationsResponse {
  success: boolean;
  rows: ReservationRow[];
  /** Server-only raw public-player records. Never forward this payload to clients. */
  reservationsGolfPlayers?: unknown;
  // reservationsGolfPlayers[] and reservationsAdditionalResources[] also
  // exist on the real response but are intentionally not typed here — they
  // must never be read past lib/golf/client.ts, let alone forwarded to the
  // client. See "Henkilötiedot" in CLAUDE-golf.md.
}

export interface WiseGolfRuleValueObject {
  comment?: string;
  /** kuumatAjat: this tee time opens this many minutes before its start. */
  minutes?: number;
  inheritToOthers?: boolean;
  message?: string;
  /** Calendar visibility rules may use either of these fields. */
  days?: number;
  value?: number;
  localTime?: string;
}

/** WiseGolf returns rule values either as an object or, for some rules, a number. */
export type WiseGolfRuleValue = WiseGolfRuleValueObject | number;

export interface ResourceRule {
  resourceId?: number | null;
  ruleName: string;
  startDate: string | null;
  endDate: string | null;
  startTime: string;
  endTime: string;
  /** 7 booleans, index 0 = Monday. null means "every day" within the date range. */
  recurrenceDays: boolean[] | null;
  ruleValue?: WiseGolfRuleValue;
}

export interface CalendarSettingsResponse {
  success: boolean;
  reservationSettings: {
    startTime: string; // "06:00:00"
    endTime: string; // "21:00:00"
    duration: number; // minutes
    breakTime: number; // minutes
    limitFutureReservations?: number | null;
    resources: { id?: number; resourceId?: number; quantity: number }[];
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
    /** ISO instant with the Europe/Helsinki offset, calculated from the tee time. */
    opensAt: string;
    message?: string;
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
  courseCount: number;
  status: ClubDayStatus;
  vapaat: FreeSlot[];
  /** Set only when status === "liian_kaukana": how far ahead this club's calendar goes. */
  horisonttiPaivia?: number;
}

export interface DayGroup {
  date: string;
  clubs: ClubDayResult[];
}
