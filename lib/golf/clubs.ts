// WiseGolf club configuration. Only add a club here once its domain +
// productid have been confirmed against the real API (see CLAUDE-golf.md —
// endpoints are undocumented and found via browser network traffic, never
// guessed). Per-club quirks (different advance-booking window, odd
// calendarsettings fields, etc.) belong as extra fields on the club's own
// entry here, not as branches in the shared fetch/availability code.
export interface GolfClubConfig {
  id: string;
  nimi: string;
  domain: string;
  productid: number;
  /** Lowercase phrases the free-text parser matches to pick this club. */
  aliases: string[];
  /** Manual-booking link shown next to search results — always the club's own, never assumed. */
  bookingUrl: string;
  /** How many days ahead the club's calendar is open. Defaults to 16 (HGK's value) if omitted. */
  maxDaysAhead?: number;
}

export const KLUBIT: GolfClubConfig[] = [
  {
    id: "hgk",
    nimi: "Helsingin Golfklubi",
    domain: "api.helsingingolfklubi.fi",
    productid: 7,
    aliases: ["helsingin golfklubi", "hgk"],
    bookingUrl: "https://app.wisegolf.fi/#/golf/reservation/7",
  },
  // <KLUBIT> — lisää tähän vain todennettuja klubeja samassa muodossa.
];

export const DEFAULT_CLUB_ID = KLUBIT[0]!.id;

export function getClub(id: string): GolfClubConfig | undefined {
  return KLUBIT.find((club) => club.id === id);
}

/** Matches a club by name/alias mentioned in free text, e.g. "ensi keskiviikkona HGK:lla". */
export function detectClub(text: string): GolfClubConfig | null {
  const lower = text.toLowerCase();
  return KLUBIT.find((club) => club.aliases.some((alias) => lower.includes(alias))) ?? null;
}
