// WiseGolf configuration is deliberately data-first: a club contains one or
// more independently searchable courses. Shared request and availability code
// receives a club/course pair, so adding a multi-course club never requires a
// club-specific branch.

export interface SeasonWindow {
  /** "MM-DD", inclusive. */
  alkaa: string;
  loppuu: string;
}

export interface GolfCourse {
  id: string;
  nimi: string;
  productid: number;
  /** Lowercase phrases that select this course in a free-text search. */
  aliases?: string[];
  kausi?: SeasonWindow;
  /** Days ahead the booking calendar reaches. */
  horisonttiPaivia?: number | null;
  /** Helsinki time at which the furthest booking day becomes visible. */
  horisonttiAukeaa?: string;
  /** Informational course metadata; live calendar settings remain authoritative. */
  paikkoja?: number;
  lahtovaliMin?: number;
}

export interface GolfClub {
  id: string;
  nimi: string;
  domain: string;
  aliases: string[];
  bookingUrl: string;
  kentat: GolfCourse[];
  omatVarauksetTuettu?: boolean;
}

/** Compatibility name for consumers that previously imported GolfClubConfig. */
export type GolfClubConfig = GolfClub;

/** Fallback booking horizon for a course without its own value (HGK's confirmed value). */
export const DEFAULT_HORISONTTI_PAIVIA = 16;

const yhdenKentanSeura = (
  club: Omit<GolfClub, "kentat">,
  course: Omit<GolfCourse, "id" | "nimi">
): GolfClub => ({
  ...club,
  kentat: [{ id: "main", nimi: club.nimi, ...course }],
});

export const KLUBIT: GolfClub[] = [
  yhdenKentanSeura(
    {
      id: "hgk",
      nimi: "Helsingin Golfklubi",
      domain: "api.helsingingolfklubi.fi",
      aliases: ["helsingin golfklubi", "hgk"],
      bookingUrl: "https://app.wisegolf.fi/#/golf/reservation/7",
      omatVarauksetTuettu: true,
    },
    { productid: 7, horisonttiPaivia: null }
  ),
  yhdenKentanSeura(
    {
      id: "kullo",
      nimi: "Kullo Golf",
      domain: "api.kullogolf.fi",
      aliases: ["kullo golf", "kullo"],
      bookingUrl: "https://kullogolf.fi",
    },
    { productid: 7, kausi: { alkaa: "04-09", loppuu: "10-19" }, horisonttiPaivia: 8 }
  ),
  yhdenKentanSeura(
    {
      id: "tapiola",
      nimi: "Tapiola Golf",
      domain: "api.tapiolagolf.fi",
      aliases: ["tapiola golf", "tapiola"],
      bookingUrl: "https://tapiolagolf.fi",
    },
    { productid: 7, horisonttiPaivia: 5 }
  ),
  yhdenKentanSeura(
    {
      id: "hirsala",
      nimi: "Hirsala Golf",
      domain: "api.hirsalagolf.fi",
      aliases: ["hirsala golf", "hirsala"],
      bookingUrl: "https://hirsalagolf.fi",
    },
    { productid: 7, horisonttiPaivia: 7 }
  ),
  {
    id: "pickala",
    nimi: "Pickala Golf",
    domain: "api.pickalagolf.fi",
    aliases: ["pickala golf", "pickala"],
    bookingUrl: "https://pickalagolf.fi",
    kentat: [
      {
        id: "forest",
        nimi: "Forest",
        productid: 94,
        aliases: ["pickala forest", "forest"],
        kausi: { alkaa: "04-03", loppuu: "12-31" },
        horisonttiPaivia: 4,
        horisonttiAukeaa: "21:00",
        paikkoja: 4,
        lahtovaliMin: 10,
      },
      {
        id: "seaside",
        nimi: "Seaside",
        productid: 95,
        aliases: ["pickala seaside", "seaside"],
        kausi: { alkaa: "02-01", loppuu: "12-31" },
        horisonttiPaivia: 4,
        horisonttiAukeaa: "21:00",
        paikkoja: 4,
        lahtovaliMin: 10,
      },
      {
        id: "park",
        nimi: "Park",
        productid: 7,
        aliases: ["pickala park", "park"],
        kausi: { alkaa: "02-01", loppuu: "08-31" },
        horisonttiPaivia: 4,
        horisonttiAukeaa: "21:00",
        paikkoja: 4,
        lahtovaliMin: 10,
      },
    ],
  },
];

export const DEFAULT_CLUB_ID = KLUBIT[0]!.id;

export function getClub(id: string): GolfClub | undefined {
  return KLUBIT.find((club) => club.id === id);
}

export function getCourse(club: GolfClub, courseId: string): GolfCourse | undefined {
  return club.kentat.find((course) => course.id === courseId);
}

export function detectClub(text: string): GolfClub | null {
  const lower = text.toLowerCase();
  return KLUBIT.find((club) => club.aliases.some((alias) => lower.includes(alias))) ?? null;
}

/** Finds a course only when its alias identifies exactly one configured course. */
export function detectCourse(text: string, withinClub?: GolfClub | null) {
  const lower = text.toLowerCase();
  const candidates = (withinClub ? [withinClub] : KLUBIT).flatMap((club) =>
    club.kentat
      .filter((course) => course.aliases?.some((alias) => lower.includes(alias)))
      .map((course) => ({ club, course }))
  );
  return candidates.length === 1 ? candidates[0] : null;
}

export function isInSeason(course: GolfCourse, date: string): boolean {
  if (!course.kausi) return true;
  const mmdd = date.slice(5);
  const { alkaa, loppuu } = course.kausi;
  if (alkaa <= loppuu) return mmdd >= alkaa && mmdd <= loppuu;
  return mmdd >= alkaa || mmdd <= loppuu;
}

export function effectiveHorizon(course: GolfCourse): number {
  return course.horisonttiPaivia ?? DEFAULT_HORISONTTI_PAIVIA;
}

/** The current Helsinki clock decides whether a course's newest horizon day is open yet. */
export function visibleHorizon(course: GolfCourse, helsinkiTime: string): number {
  const horizon = effectiveHorizon(course);
  return course.horisonttiAukeaa && helsinkiTime < course.horisonttiAukeaa
    ? Math.max(0, horizon - 1)
    : horizon;
}
