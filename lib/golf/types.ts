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
  ruleValue?: { comment?: string };
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
  vapaita: number;
}

export interface GolfSearchResult {
  date: string;
  yhteensa: number;
  vapaat: FreeSlot[];
}
