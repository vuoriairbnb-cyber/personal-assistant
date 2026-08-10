// WiseGolf club configuration. Only add a club here once its domain +
// productid have been confirmed against the real API (see CLAUDE-golf.md —
// endpoints are undocumented and found via browser network traffic, never
// guessed). Per-club quirks (season, booking horizon, etc.) belong as extra
// fields on the club's own entry here, not as branches in the shared
// fetch/availability code — every club goes through the exact same
// computeFreeSlots().

export interface SeasonWindow {
  /** "MM-DD", inclusive. */
  alkaa: string;
  loppuu: string;
}

export interface GolfClubConfig {
  id: string;
  nimi: string;
  domain: string;
  productid: number;
  /** Lowercase phrases the free-text parser matches to pick this club. */
  aliases: string[];
  /** Manual-booking link shown next to search results — always the club's own, never assumed. */
  bookingUrl: string;
  /** Active season (both ends inclusive). Omit for a year-round club. */
  kausi?: SeasonWindow;
  /** Days ahead the calendar is open. null/omitted = DEFAULT_HORISONTTI_PAIVIA (HGK's value). */
  horisonttiPaivia?: number | null;
  /** True for clubs where fetching the user's own reservations via the
   * authenticated WiseGolf endpoint is supported and configured. */
  omatVarauksetTuettu?: boolean;
}

/** Fallback booking horizon for any club that doesn't set its own (HGK's confirmed value). */
export const DEFAULT_HORISONTTI_PAIVIA = 16;

export const KLUBIT: GolfClubConfig[] = [
  {
    id: "hgk",
    nimi: "Helsingin Golfklubi",
    domain: "api.helsingingolfklubi.fi",
    productid: 7,
    aliases: ["helsingin golfklubi", "hgk"],
    bookingUrl: "https://app.wisegolf.fi/#/golf/reservation/7",
    horisonttiPaivia: null,
    omatVarauksetTuettu: true,
  },
  {
    id: "kullo",
    nimi: "Kullo Golf",
    domain: "api.kullogolf.fi",
    productid: 7,
    aliases: ["kullo golf", "kullo"],
    // No confirmed WiseGolf reservation deep-link for Kullo — their own
    // homepage is a real, safe URL; not guessing the booking app's path.
    bookingUrl: "https://kullogolf.fi",
    kausi: { alkaa: "04-09", loppuu: "10-19" },
    horisonttiPaivia: 8,
  },
  {
    id: "tapiola",
    nimi: "Tapiola Golf",
    domain: "api.tapiolagolf.fi",
    productid: 7,
    aliases: ["tapiola golf", "tapiola"],
    // No confirmed WiseGolf reservation deep-link for Tapiola either —
    // same call as Kullo: their own homepage, not a guessed booking path.
    bookingUrl: "https://tapiolagolf.fi",
    // Verified open 2025-11-01–2026-11-17 — effectively year-round like HGK,
    // no kausi restriction needed.
    horisonttiPaivia: 5,
  },
  {
    id: "hirsala",
    nimi: "Hirsala Golf",
    domain: "api.hirsalagolf.fi",
    productid: 7,
    aliases: ["hirsala golf", "hirsala"],
    // No confirmed WiseGolf reservation deep-link for Hirsala either —
    // same call as Kullo/Tapiola: their own homepage, not a guessed path.
    bookingUrl: "https://hirsalagolf.fi",
    // Verified open 2024-03-29–2026-12-31 — effectively year-round, no
    // kausi restriction needed.
    horisonttiPaivia: 7,
  },
  // <KLUBIT> — lisää tähän vain todennettuja klubeja samassa muodossa.
];

export const DEFAULT_CLUB_ID = KLUBIT[0]!.id;

export function getClub(id: string): GolfClubConfig | undefined {
  return KLUBIT.find((club) => club.id === id);
}

/** Matches a club by name/alias mentioned in free text, e.g. "ensi keskiviikkona Kullossa". */
export function detectClub(text: string): GolfClubConfig | null {
  const lower = text.toLowerCase();
  return KLUBIT.find((club) => club.aliases.some((alias) => lower.includes(alias))) ?? null;
}

/** Is `date` ("YYYY-MM-DD") within the club's season? Always true if no season is set. */
export function isInSeason(club: GolfClubConfig, date: string): boolean {
  if (!club.kausi) return true;
  const mmdd = date.slice(5); // "MM-DD"
  const { alkaa, loppuu } = club.kausi;
  if (alkaa <= loppuu) return mmdd >= alkaa && mmdd <= loppuu;
  return mmdd >= alkaa || mmdd <= loppuu; // season wraps across new year
}

/** How many days ahead this club's calendar actually reaches. */
export function effectiveHorizon(club: GolfClubConfig): number {
  return club.horisonttiPaivia ?? DEFAULT_HORISONTTI_PAIVIA;
}
