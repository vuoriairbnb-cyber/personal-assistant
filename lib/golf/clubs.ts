// WiseGolf configuration is deliberately data-first: a club contains one or
// more independently searchable courses. Shared request and availability code
// receives a club/course pair, so adding a multi-course club never requires a
// club-specific branch.

export interface SeasonWindow {
  /** "MM-DD", inclusive. */
  alkaa: string;
  /** Omit or set null when WiseGolf has no configured end date. */
  loppuu?: string | null;
}

/** A non-recurring, API-confirmed season window with full calendar dates. */
export interface ExactSeasonWindow {
  alkaa: string;
  loppuu?: string | null;
}

export interface GolfCourse {
  id: string;
  nimi: string;
  productid: number;
  /** Optional WiseGolf resource inside a shared product. */
  resourceId?: number;
  /** Lowercase phrases that select this course in a free-text search. */
  aliases?: string[];
  kausi?: SeasonWindow;
  tarkkaKausi?: ExactSeasonWindow;
  /** Days ahead the booking calendar reaches. */
  horisonttiPaivia?: number | null;
  /** Helsinki time at which the furthest booking day becomes visible. */
  horisonttiAukeaa?: string;
  /** Read calendar visibility rules at runtime, falling back to the configured horizon. */
  horisonttiCalendarista?: boolean;
  /** Informational course metadata; live calendar settings remain authoritative. */
  paikkoja?: number;
  lahtovaliMin?: number;
  paivanAlku?: string;
  paivanLoppu?: string;
}

export interface GolfClub {
  id: string;
  nimi: string;
  domain: string;
  aliases: string[];
  bookingUrl: string;
  kentat: GolfCourse[];
  omatVarauksetTuettu?: boolean;
  /** Enables live public-name reservation searches for this club. */
  playerSearch?: { enabled: boolean; auth: { type: "wisegolf-access-token"; envVar: string; sessionType: string } };
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
      playerSearch: { enabled: true, auth: { type: "wisegolf-access-token", envVar: "HGK_WISEGOLF_ACCESS_TOKEN", sessionType: "wisegolf" } },
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
      playerSearch: { enabled: true, auth: { type: "wisegolf-access-token", envVar: "KULLO_WISEGOLF_ACCESS_TOKEN", sessionType: "wisegolf" } },
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
      playerSearch: { enabled: true, auth: { type: "wisegolf-access-token", envVar: "TAPIOLA_WISEGOLF_ACCESS_TOKEN", sessionType: "wisegolf" } },
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
      playerSearch: { enabled: true, auth: { type: "wisegolf-access-token", envVar: "HIRSALA_WISEGOLF_ACCESS_TOKEN", sessionType: "wisegolf" } },
    },
    { productid: 7, horisonttiPaivia: 7 }
  ),
  {
    id: "pickala",
    nimi: "Pickala Golf",
    domain: "api.pickalagolf.fi",
    aliases: ["pickala golf", "pickala"],
    bookingUrl: "https://pickalagolf.fi",
    playerSearch: { enabled: true, auth: { type: "wisegolf-access-token", envVar: "PICKALA_WISEGOLF_ACCESS_TOKEN", sessionType: "wisegolf" } },
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
  {
    id: "mastergolf",
    nimi: "Master Golf",
    domain: "api.mastergolf.fi",
    aliases: ["master golf"],
    bookingUrl: "https://mastergolf.fi",
    playerSearch: { enabled: true, auth: { type: "wisegolf-access-token", envVar: "MASTER_WISEGOLF_ACCESS_TOKEN", sessionType: "wisegolf" } },
    kentat: [
      {
        id: "master",
        nimi: "Master",
        productid: 7,
        aliases: ["master"],
        kausi: { alkaa: "04-10", loppuu: null },
        horisonttiPaivia: 3,
        horisonttiAukeaa: "06:00",
        paikkoja: 4,
        lahtovaliMin: 10,
        paivanAlku: "06:00",
        paivanLoppu: "20:10",
      },
      {
        id: "forest",
        nimi: "Forest",
        productid: 65,
        aliases: ["master golf forest", "master forest", "forest"],
        kausi: { alkaa: "04-17", loppuu: null },
        horisonttiPaivia: 3,
        horisonttiAukeaa: "06:00",
        paikkoja: 4,
        lahtovaliMin: 10,
        paivanAlku: "06:00",
        paivanLoppu: "20:10",
      },
    ],
  },
  {
    id: "keimola",
    nimi: "Keimola Golf",
    domain: "api.keimolagolf.com",
    aliases: ["keimola golf", "keimola"],
    bookingUrl: "https://keimolagolf.com",
    playerSearch: { enabled: true, auth: { type: "wisegolf-access-token", envVar: "KEIMOLA_WISEGOLF_ACCESS_TOKEN", sessionType: "wisegolf" } },
    // Saras is intentionally the only configured/searchable Keimola course.
    // Kirkka and its internal ball-run views are not user-facing courses and
    // therefore have no entry here.
    kentat: [
      {
        id: "saras",
        nimi: "Saras",
        productid: 166,
        aliases: ["keimola saras", "saras"],
        horisonttiPaivia: 5,
        horisonttiAukeaa: "21:00",
        paikkoja: 4,
        lahtovaliMin: 10,
        paivanAlku: "05:00",
        paivanLoppu: "22:00",
      },
    ],
  },
  {
    id: "aulanko-golf",
    nimi: "Aulanko Golf",
    domain: "api.aulankogolf.fi",
    aliases: ["aulanko golf", "aulanko"],
    bookingUrl: "https://aulankogolf.fi",
    kentat: [
      {
        id: "eversti",
        nimi: "Eversti",
        productid: 7,
        resourceId: 1,
        aliases: ["aulanko eversti", "eversti"],
        horisonttiPaivia: 5,
        horisonttiAukeaa: "07:00",
        horisonttiCalendarista: true,
        paikkoja: 4,
        lahtovaliMin: 10,
        paivanAlku: "07:00",
        paivanLoppu: "21:00",
      },
    ],
  },
  {
    id: "st-laurence",
    nimi: "St. Laurence Golf",
    domain: "api.stlg.fi",
    aliases: ["st. laurence golf", "st laurence golf", "st. laurence", "st laurence", "stlg"],
    bookingUrl: "https://stlg.fi",
    kentat: [
      { id: "pyha-lauri", nimi: "Pyhä Lauri", productid: 7, resourceId: 1, aliases: ["pyhä lauri", "pyha lauri"], horisonttiPaivia: 4, horisonttiAukeaa: "21:00", horisonttiCalendarista: true, paikkoja: 4, lahtovaliMin: 10, paivanAlku: "06:00", paivanLoppu: "23:00" },
      { id: "kalkki-petteri", nimi: "Kalkki-Petteri", productid: 8, resourceId: 2, aliases: ["kalkki-petteri", "kalkki petteri"], horisonttiPaivia: 4, horisonttiAukeaa: "21:00", horisonttiCalendarista: true, paikkoja: 4, lahtovaliMin: 10, paivanAlku: "06:05", paivanLoppu: "23:05" },
    ],
  },
  {
    id: "nordcenter",
    nimi: "Nordcenter",
    domain: "api.nordcenter.fi",
    aliases: ["nordcenter"],
    bookingUrl: "https://nordcenter.fi",
    playerSearch: { enabled: true, auth: { type: "wisegolf-access-token", envVar: "NORDCENTER_WISEGOLF_ACCESS_TOKEN", sessionType: "wisegolf" } },
    kentat: [
      {
        id: "benz",
        nimi: "Benz",
        productid: 462,
        resourceId: 49,
        aliases: ["nordcenter benz", "benz"],
        tarkkaKausi: { alkaa: "2026-03-27", loppuu: "2026-11-13" },
        // calendarsettings.limitFutureReservations currently returns 2;
        // no unverified opening time is configured.
        horisonttiPaivia: 2,
        paikkoja: 4,
        lahtovaliMin: 10,
        paivanAlku: "07:00",
        paivanLoppu: "21:00",
      },
      {
        id: "fream",
        nimi: "Fream",
        productid: 462,
        resourceId: 51,
        aliases: ["nordcenter fream", "fream"],
        tarkkaKausi: { alkaa: "2026-03-27", loppuu: "2026-11-13" },
        horisonttiPaivia: 2,
        paikkoja: 4,
        lahtovaliMin: 10,
        paivanAlku: "07:00",
        paivanLoppu: "21:00",
      },
    ],
  },
  {
    id: "shg",
    nimi: "Suur-Helsingin Golf",
    domain: "api.shg.fi",
    aliases: ["suur-helsingin golf", "suur helsingin golfseura", "suur helsingin golf", "shg"],
    bookingUrl: "https://shg.fi",
    kentat: [
      {
        id: "luukki",
        nimi: "Luukki",
        productid: 53,
        resourceId: 1,
        aliases: ["shg luukki", "luukki"],
        // limitFutureReservations currently returns 3; product startDate
        // (2022) is deliberately not treated as a recurring season boundary.
        horisonttiPaivia: 3,
        paikkoja: 4,
        lahtovaliMin: 10,
        paivanAlku: "06:00",
        paivanLoppu: "21:00",
      },
      {
        id: "lakisto",
        nimi: "Lakisto",
        productid: 53,
        resourceId: 2,
        aliases: ["shg lakisto", "lakisto"],
        horisonttiPaivia: 3,
        paikkoja: 4,
        lahtovaliMin: 10,
        paivanAlku: "06:00",
        paivanLoppu: "21:00",
      },
    ],
  },
  {
    id: "vuosaari",
    nimi: "Vuosaari Golf",
    domain: "api.vuosaarigolf.fi",
    aliases: ["vuosaari golf", "vuosaarigolf", "vuosaari"],
    bookingUrl: "https://vuosaarigolf.fi",
    playerSearch: { enabled: true, auth: { type: "wisegolf-access-token", envVar: "VUOSAARI_WISEGOLF_ACCESS_TOKEN", sessionType: "wisegolf" } },
    kentat: [
      {
        id: "vuosaari",
        nimi: "Vuosaari Golf",
        productid: 7,
        resourceId: 1,
        aliases: ["vuosaari golf", "vuosaarigolf", "vuosaari"],
        // Current-year product startDate is safe as an exact availability
        // boundary; endDate is null and intentionally remains open-ended.
        tarkkaKausi: { alkaa: "2026-03-01", loppuu: null },
        // API calendar visibility (7 days, opens 09:00) overrides this
        // fallback when present; limitFutureReservations=0 must not win.
        horisonttiPaivia: 7,
        horisonttiAukeaa: "09:00",
        horisonttiCalendarista: true,
        paikkoja: 4,
        lahtovaliMin: 10,
        paivanAlku: "06:00",
        paivanLoppu: "21:00",
      },
    ],
  },
  {
    id: "kytaja",
    nimi: "Kytäjä Golf",
    domain: "api.kytajagolf.fi",
    aliases: ["kytäjä golf", "kytäjä", "kytaja golf", "kytaja"],
    bookingUrl: "https://kytajagolf.fi",
    kentat: [
      {
        id: "north-west",
        nimi: "North West",
        productid: 22,
        resourceId: 1,
        aliases: ["kytäjä north west", "kytäjä nw", "kytaja north west", "kytaja nw", "north west", "nw"],
        tarkkaKausi: { alkaa: "2025-04-01", loppuu: "2026-10-31" },
        // The API supplies calendar visibility (currently 7 days) but no
        // opening clock, so no time is inferred here.
        horisonttiPaivia: 7,
        horisonttiCalendarista: true,
        paikkoja: 4,
        lahtovaliMin: 10,
        paivanAlku: "07:05",
        paivanLoppu: "20:05",
      },
      {
        id: "south-east",
        nimi: "South East",
        productid: 70,
        resourceId: 2,
        aliases: ["kytäjä south east", "kytäjä se", "kytaja south east", "kytaja se", "south east", "se"],
        tarkkaKausi: { alkaa: "2025-04-01", loppuu: "2026-09-27" },
        horisonttiPaivia: 7,
        horisonttiCalendarista: true,
        paikkoja: 4,
        lahtovaliMin: 10,
        paivanAlku: "07:00",
        paivanLoppu: "20:00",
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

/**
 * Finds a course only when the best matching alias identifies it uniquely.
 * Longer aliases let qualified input ("Master Forest") resolve safely while
 * a bare ambiguous name ("Forest") deliberately remains unresolved.
 */
export function detectCourse(text: string, withinClub?: GolfClub | null) {
  const lower = text.toLowerCase();
  // A course name can be part of its club name ("Master" / "Master Golf").
  // When a club has already been identified, remove its longest aliases first
  // before looking for a course. This is configuration-driven and works for
  // any future club/course naming overlap.
  const courseText = withinClub
    ? [...withinClub.aliases]
        .sort((a, b) => b.length - a.length)
        .reduce((remaining, alias) => remaining.replaceAll(alias, " "), lower)
    : lower;
  const candidates = (withinClub ? [withinClub] : KLUBIT).flatMap((club) =>
    club.kentat.flatMap((course) => {
      const longestMatch = Math.max(
        0,
        ...(course.aliases ?? []).filter((alias) => courseText.includes(alias)).map((alias) => alias.length)
      );
      return longestMatch > 0 ? [{ club, course, longestMatch }] : [];
    })
  );
  const bestLength = Math.max(0, ...candidates.map((candidate) => candidate.longestMatch));
  const best = candidates.filter((candidate) => candidate.longestMatch === bestLength);
  return best.length === 1 ? best[0] : null;
}

export function isInSeason(course: GolfCourse, date: string): boolean {
  if (course.tarkkaKausi) {
    return date >= course.tarkkaKausi.alkaa &&
      (!course.tarkkaKausi.loppuu || date <= course.tarkkaKausi.loppuu);
  }
  if (!course.kausi) return true;
  const mmdd = date.slice(5);
  const { alkaa, loppuu } = course.kausi;
  if (!loppuu) return mmdd >= alkaa;
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
