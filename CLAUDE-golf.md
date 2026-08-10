# Golf-toiminnallisuus — arkkitehtuurikuvaus

Tämä dokumentti kuvaa koko golf-osa-alueen niin, että sen lukemalla saa täydellisen
käsityksen arkkitehtuurista ilman lisäselityksiä. Päivitetty vastaamaan todellista
koodia elokuussa 2026.

---

## 1. YLEISKUVA

Golf-toiminnallisuus on osa laajempaa **Personal Assistant** -sovellusta
(Next.js 15, TypeScript, Supabase, App Router, Vercel). Muita moduuleja ovat
Trips, Calendar, Inbox, Costs ja Settings.

Golf koostuu kahdesta erillisestä osa-alueesta:

### 1a. Vapaiden aikojen haku (`/golf`-välilehti)
Hakee vapaita lähtöaikoja WiseGolf-pohjaisten suomalaisten golfklubien
julkisista, **autentikoimattomista** API-endpointeista. Käyttäjä syöttää
haun joko luonnollisella suomen kielellä ("ensi keskiviikkona illalla") tai
lomakkeella (pelaajamäärä, päivät, kellonaika). Tulokset ryhmitellään
päivittäin ja klubeittain.

### 1b. Omat varaukset (Calendar-integraatio)
Hakee **kirjautuneen käyttäjän omat** HGK-golfvaraukset autentikoidusta
WiseGolf-endpointista ja näyttää ne osana olemassa olevaa kalenterinäkymää.

### Mitä tämä EI tee — tietoinen ja pysyvä rajaus

**Automaattista varaamista, peruuttamista tai vahvistamista ei toteuteta.**
Tämä on tietoinen arkkitehtuuripäätös:
- Varaaminen on sitova, mahdollisesti maksullinen toimenpide peruutusehtoineen
- Automaattinen varaaminen voisi olla klubi-integraatioehtojen vastaista
- Haku ei häiritse mitään; varaus tehdään aina käsin klubin omaan varauspalveluun

Jokaisessa paikassa jossa toimintoa voisi laajentaa kirjoittavaksi, on
eksplisiittinen kommentti tästä rajoituksesta.

---

## 2. KLUBIT-KONFIGURAATIO

**Tiedosto:** `lib/golf/clubs.ts`

### Tuetut klubit

| id | nimi | domain | productid | kausi (MM-DD) | horisonttiPaivia | omatVarauksetTuettu |
|---|---|---|---|---|---|---|
| `hgk` | Helsingin Golfklubi | api.helsingingolfklubi.fi | 7 | — (ympärivuotinen) | 16 (oletus) | `true` |
| `kullo` | Kullo Golf | api.kullogolf.fi | 7 | 04-09 – 10-19 | 8 | — (= false) |
| `tapiola` | Tapiola Golf | api.tapiolagolf.fi | 7 | — (ympärivuotinen) | 5 | — (= false) |
| `hirsala` | Hirsala Golf | api.hirsalagolf.fi | 7 | — (ympärivuotinen) | 7 | — (= false) |

`horisonttiPaivia: null` HGK:lla tarkoittaa "käytä oletusarvoa 16"
(`DEFAULT_HORISONTTI_PAIVIA`). Kaikki muut klubit asettavat arvon eksplisiittisesti.

Jokaisella klubilla on myös `aliases`-taulukko (pienillä kirjaimilla) joita
NL-parseri käyttää tekstistä tunnistamiseen, sekä `bookingUrl` jota UI näyttää
haun vieressä "varaa aika" -linkkinä.

### Eristysperiaate

Kaikki klubikohtainen tieto (kausi, horisontti, domain, productid) asuu
`KLUBIT`-taulukossa **datana**, ei koodihaaroina. Jaettu logiikka
(`computeFreeSlots`, `fetchReservations`, `fetchCalendarSettings`) ei koskaan
sisällä `if (club.id === 'hgk')` -tyyppisiä haaroja.

Kolme käytännön seurausta:

1. **Cache-avain on `${club.id}:${date}`** — eri klubit eivät koskaan jaa
   välimuistinsa arvoja, vaikka niillä olisi sama productid tai sama päivä.

2. **try/catch on per-klubi** (`getClubDayResult`-funktiossa) — yhden klubin
   API-virhe tuottaa `status: "virhe"` vain kyseiselle klubille, muu
   moniklubihaku jatkuu normaalisti.

3. **Kausi ja horisontti tarkistetaan ennen API-kutsua** — jos päivä on
   kauden ulkopuolella tai liian kaukana, API:a ei kutsuta lainkaan.
   Paluuarvo on `status: "kausi_kiinni"` tai `status: "liian_kaukana"`.

### Uuden klubin lisääminen

Lisää uusi objekti `KLUBIT`-taulukkoon. **Lisää klubi vasta kun sen
`domain` ja `productid` on vahvistettu oikeiksi** suoraan kokeilemalla
(esim. `curl`). Älä koskaan arvaa endpointtia — WiseGolfilla ei ole
julkista API-dokumentaatiota, endpointit on selvitetty selaimen
verkkoliikenteestä jokaiselle klubille erikseen.

Kolme vaihetta:
1. Kirjaudu klubin WiseGolf-palveluun selaimella, avaa DevTools → Network,
   etsi `calendarsettings`- ja `reservations`-kutsut
2. Vahvista `curl`-komennolla että endpointti vastaa oikein ilman
   autentikointia
3. Lisää rivi `KLUBIT`-taulukkoon — muuhun koodiin ei kosketa

---

## 3. VAPAIDEN AIKOJEN HAKU

### Endpoint

```
GET /api/golf
```

**Tiedosto:** `app/api/golf/route.ts`

Vaatii kirjautuneen ja hyväksytyn käyttäjän (`requireApprovedUser()`).

### Parametrit

| parametri | tyyppi | kuvaus |
|---|---|---|
| `club` | string | Pilkuilla erotettu lista klub-id:istä (esim. `hgk,kullo`). Oletus: `hgk` |
| `date` | YYYY-MM-DD | Yksi päivä |
| `from` | YYYY-MM-DD | Aikavälin alku (vaihtoehto `date`-parametrille) |
| `to` | YYYY-MM-DD | Aikavälin loppu (vapaaehtoinen; leikataan leveimmän klubin horisontilla) |
| `min` | integer | Vapaat paikat vähintään N |
| `after` | HH:MM | Vain ajat tämän jälkeen |
| `before` | HH:MM | Vain ajat ennen tätä |

### Palautusrakenne

```ts
{ results: DayGroup[] }

DayGroup = { date: string; clubs: ClubDayResult[] }

ClubDayResult = {
  club: string;         // klub-id
  nimi: string;         // klubin näyttönimi
  status: "ok" | "kausi_kiinni" | "liian_kaukana" | "virhe";
  vapaat: FreeSlot[];   // tyhjä jos status !== "ok"
  horisonttiPaivia?: number; // mukana vain kun status === "liian_kaukana"
}

FreeSlot = { aika: "HH:MM"; vapaita: number }
```

### WiseGolf API -endpointit (julkinen, autentikoimaton)

```
GET https://api.<domain>/api/1.0/reservations/?productid=<id>&date=YYYY-MM-DD&golf=1
GET https://api.<domain>/api/1.0/reservations/calendarsettings/?productid=<id>&date=YYYY-MM-DD
```

`reservations/` palauttaa **varatut** paikat (`rows[]`). Yksi rivi = yksi
varattu pelaajapaikka. Vapaita aikoja ei palauteta suoraan — ne lasketaan.

⚠️ **Henkilötiedot:** `reservationsGolfPlayers[]`-kenttä sisältää muiden
pelaajien nimiä, tasoituksia ja pelaajanumeroita. Tätä kenttää **ei koskaan
lueta, tallenneta eikä välitetä frontendille**. `ReservationsResponse`-tyypissä
sitä ei ole edes tyypitetty, jotta se ei vahingossa päädy käyttöön.

`calendarsettings/` palauttaa:
- `reservationSettings`: aukioloajat (`startTime`/`endTime`), slotin kesto
  (`duration` minuutteina), tauko (`breakTime`), kapasiteetti (`resources[0].quantity`)
- `resourceRules[]`: sulkusäännöt. Merkitsevä on `ruleName === "aikaSulku"`:
  - `startTime`/`endTime` — suljettu aikaväli päivässä
  - `startDate`/`endDate` — voimassaoloaika (null = rajoittamaton)
  - `recurrenceDays[]` — toistuva sulku; **indeksi 0 = maanantai**
  - `ruleValue.comment` — syy (esim. "Erkko scramble by Turkish Airlines")

### computeFreeSlots-algoritmi

**Tiedosto:** `lib/golf/availability.ts`

1. Generoi grid `startTime` → `endTime`, `(duration + breakTime)` minuutin askelein
2. Ohita slotit jotka osuvat aktiiviseen `aikaSulku`-sääntöön
3. Laske `vapaita = quantity - (saman start-ajan rows-rivien määrä)`
4. Palauta slotit joissa `vapaita > 0`

Kaikki parametrit luetaan aina `calendarsettings`-vastauksesta — ei koskaan
kovakoodattu, koska klubi voi muuttaa kestoja tai aukioloaikoja.

Viikonpäivä lasketaan UTC-kello 12:00 (`T12:00:00`) jotta kesä- ja
talviajan vaihdokset eivät voi siirtää päivämäärää.

### Cache

In-process `Map`, avain `${club.id}:${date}`, TTL 15 minuuttia.
Lisäksi HTTP-otsake `Cache-Control: s-maxage=900, stale-while-revalidate=60`.
Sama raakadata palvelee jokaista `min`/`after`/`before`-variaatiota saman
hakupyynnön sisällä ilman uutta API-kutsua.

### WiseGolf-kalenteri aika-avaimen rajoitukset

- **Horisontti:** jokainen klubi avaa kalenteriaan vain tietyn määrän päiviä
  eteenpäin (HGK: 16, Kullo: 8, Tapiola: 5, Hirsala: 7). Jos haetaan
  liian kaukaa, API palauttaa 200 ja tyhjän `rows`-listan — kaikki näyttää
  vapaalta, mikä on harhaanjohtavaa. Siksi horisontti tarkistetaan ennen
  API-kutsua.
- **Uudet päivät aukeavat klo 22:00** (`kalenteriNakyvyysAvaus`-sääntö).

---

## 4. OMAT VARAUKSET -INTEGRAATIO

### Yleinen rakenne

Käyttäjän omat HGK-golfvaraukset haetaan WiseGolfin **autentikoidusta**
endpointista ja esitetään Calendar-moduulin kalenterinäkymässä erillisenä
tapahtumatyyppinä (`source: "golf"`). Tiedot eivät koskaan tallennu
Supabaseen — haetaan aina live-datana sivun latauksen yhteydessä.

### Endpoint (omat varaukset)

```
GET /api/golf/omat-varaukset
```

**Tiedosto:** `app/api/golf/omat-varaukset/route.ts`

Täysin erillinen `/api/golf`-reitistä: eri tiedosto, oma virheenkäsittely,
ei jaettua välimuistia eikä yhteistä tilaa. Vaatii kirjautuneen käyttäjän
(`requireApprovedUser()`).

### Logiikka

**Tiedosto:** `lib/golf/user-reservations.ts` (merkitty `"use server-only"`)

```
GET https://api.helsingingolfklubi.fi/api/1.0/reservations/getusergolfreservations/
Cookie: wisenetwork_session=<arvo>
```

**Paluurakenne WiseGolfilta** (vahvistettu live-logeista):

| kenttä | tyyppi | kuvaus |
|---|---|---|
| `reservationTimeId` | number | Yksilöllinen per rivi (ei per teeaika) |
| `dateTimeStart` | "YYYY-MM-DD HH:MM:SS" | Lähtöajan alkuaika |
| `dateTimeEnd` | "YYYY-MM-DD HH:MM:SS" | Lähtöajan loppuaika |
| `productName` | string | Esim. "Golf Ajanvaraus 18r" |
| `firstName`, `familyName` | string | Käyttäjän oma nimi (ei muiden) |
| `inFuture` | 0 \| 1 | Onko varaus tulevaisuudessa |
| `isOrderOwner` | 0 \| 1 | Onko kyseinen rivi varaaja |
| ... | | Muita kenttiä (hinta, orderId, hash jne.) |

⚠️ **Ryhmävaraukset:** sama teeaika tuottaa yhden rivin per pelaaja.
Deduplikointi tehdään `dateTimeStart`-arvon perusteella (`reservationTimeId`
on per-pelaaja, ei per-teeaika). Ensimmäinen kohdattu rivi per alkuaika
säilytetään.

### Istunnon hallinta

**Env-muuttuja:** `wisenetwork_session` (`.env.local`, server-only)

Arvo on `wisenetwork_session`-cookien arvo sellaisenaan (ei koko
`Cookie:`-headeria). Palvelin rakentaa headerin: `Cookie: wisenetwork_session=<arvo>`.

Cookie on pitkäikäinen (WiseGolf asettaa ~10 vuoden vanhentumisajan).
Vanhenee käytännössä vain jos käyttäjä kirjautuu ulos WiseGolfista tai
vaihtaa salasanan. Päivitys: kirjaudu sisään selaimella → DevTools →
Application → Cookies → `wisenetwork_session` → kopioi arvo Vercelin
ympäristömuuttujiin.

**Tärkeää:** tämä arvo on täyden WiseGolf-tilin sessio. Se ei saa koskaan
päätyä frontendiin, logeihin tai versionhallintaan.

### Statusit

| status | merkitys | kalenterin käyttäytyminen |
|---|---|---|
| `"ok"` | Haku onnistui | Golf-tapahtumat lisätään kalenteriin |
| `"ei_kirjautunut"` | `wisenetwork_session` puuttuu envistä | Ei golf-tapahtumia, ei virhettä |
| `"virhe"` | API-virhe tai odottamaton vastaus | Ei golf-tapahtumia, ei virhettä |

Kalenteri ei koskaan kaadu golf-haun virheeseen: `page.tsx`:ssä on sekä
try/catch `fetchOmatVaraukset`:ssa että `.catch()` kutsussa.

### Kalenteriin yhdistäminen

**Tiedosto:** `app/(app)/calendar/page.tsx`

```ts
const [events, connections, golfResult] = await Promise.all([
  listCalendarEvents(),       // Supabase-tapahtumat
  listCalendarConnections(),  // Airbnb / Google
  fetchOmatVaraukset(),       // WiseGolf HGK (live, no-store)
]);
const allEvents = [...events, ...golfResult.events];
```

Golf-tapahtumat mapitetaan `CalendarEvent`-muotoon:

```ts
{
  id: `golf-hgk-${reservationTimeId}`,
  title: "Golf · HGK",
  start: "YYYY-MM-DDTHH:MM:SS",  // välilyönti korvattu T:llä
  end: "YYYY-MM-DDTHH:MM:SS",
  allDay: false,
  source: "golf",                 // uusi CalendarEventSource-variantti
  notes: productName,             // esim. "Golf Ajanvaraus 18r"
  location: null,
  tripId: null,
}
```

`CalendarEventSource` on laajennettu: `"manual" | "trip" | "google" | "airbnb" | "golf"`.
Golf-tapahtumat ovat read-only (`isEditable()` palauttaa `true` vain `"manual"`-sourcelle).
Visuaalinen tyyli (vihreä): `lib/calendar/source-styles.ts` → `SOURCE_STYLES.golf`.

Golf-tapahtumat eivät koskaan tallennu `calendar_events`-tauluun.
`CalendarEventDbSource` (tietokantatasolla) pysyy `"manual" | "airbnb" | "google"`.

### Rajoitukset

- Omat varaukset toimivat **toistaiseksi vain HGK:lla** (`omatVarauksetTuettu: true`).
  Muille klubeille vaadittaisiin oma `wisenetwork_session` per klubi, ja jokaiselle
  olisi löydettävä oma `getusergolfreservations`-endpointti.
- Ei välimuistia — jokainen sivulataus tekee uuden API-kutsun.

---

## 5. FRONTEND-RAKENNE

### Sivukomponentti

**`app/(app)/golf/page.tsx`** — server component, renderöi `<GolfSearch />`.

### Pääkomponentti

**`components/golf/GolfSearch.tsx`** — client component, omistaa koko
Golf-välilehden tilan. Sisältää:
- `ClubMultiSelect` — monivalintachipit (aina ≥ 1 valittuna)
- `SegmentedControl` — tila "Kirjoita" / "Valitse"
- Tekstitila: vapaatekstikenttä + pikahakupainikkeet
- Lomakätila: `DateFormSearch`
- Tulokset: `DayGroupResults` → `ClubResultSection`

Tekstihaun klubintunnistus: jos hakulauseen teksti sisältää klubin `aliases`-
arvon, käytetään sitä automaattisesti eikä chipvalintaa.

### NL-parseri

**`lib/golf/parse-query.ts`** — regex-pohjainen, ei LLM-kutsua.

Tunnistaa:
- `huomenna`, `tänään`/`tänä`
- Viikonpäivät kaikissa taivutusmuodoissa
- `seuraavan viikon X` (ainoa fraasi joka siirtää tuloksen +1 viikolla)
- `ensi X` = sama kuin pelkkä `X` (ei viikon siirto — vastaa arkikieltä)
- Kellonaikaluokat: `aamu` / `aamupäiv` / `iltapäiv` / `ilta`/`illalla`/`iltana`
- `klo N jälkeen` (tarkka aika, korvaa ylläolevan luokan)
- `N hengelle`

⚠️ **Järjestys ratkaisee:** `"iltapäiv"` tarkistetaan ennen `"illalla|iltana|..."`,
`"aamupäiv"` ennen `"aamu"`. Käytä `else if` -ketjua, ei erillisiä `if`:ejä.

⚠️ **Suomen vokaalisointu:** `"illalla"` (konsonanttigraduaatio `ilta` → `illalla`)
on yleisin iltahakumuoto — tarkista regex erikseen.

---

## 6. TIEDOSTORAKENNE

```
app/
  (app)/
    golf/
      page.tsx                    Golf-sivu (server component)
    calendar/
      page.tsx                    Kalenteri (lisää golfResult.events)
  api/
    golf/
      route.ts                    GET /api/golf (vapaat ajat)
      omat-varaukset/
        route.ts                  GET /api/golf/omat-varaukset

lib/
  golf/
    clubs.ts                      KLUBIT-konfiguraatio + apufunktiot
    client.ts                     WiseGolf-fetch-funktiot (server-only, julkinen API)
    availability.ts               computeFreeSlots-algoritmi
    parse-query.ts                Finnish NL -parseri + toSearchParams
    types.ts                      Kaikki Golf-tyypit (FreeSlot, DayGroup, jne.)
    user-reservations.ts          Omat varaukset (server-only, autentikoitu)

components/
  golf/
    GolfSearch.tsx                Pääkomponentti (client)
    ClubMultiSelect.tsx           Klubichipvalitsin
    DateFormSearch.tsx            Lomakehaku
    DayGroupResults.tsx           Tulosten päivä-ryhmittely
    ClubResultSection.tsx         Klubi-tulos, avautuu/sulkeutuu
    SegmentedControl.tsx          Reusable segmented control

  calendar/
    (kaikki kalenterikomponentit)
    SourceGuideCard.tsx           Lisätty golf-merkintä (Flag-ikoni)
    LegendCard.tsx                Lisätty "Golf (HGK)"-teksti
```

---

## 7. TUNNETUT RAJOITTEET JA AVOIMET KYSYMYKSET

| asia | nykytila | mitä vaatisi |
|---|---|---|
| Omat varaukset muille klubeille | Ei tuettu (omatVarauksetTuettu puuttuu) | Oma session-cookie per klubi + endpointin selvitys |
| WiseGolf API:n muutokset | Ei monitorointia | Manuaalinen tarkistus jos tulokset oudoksuttavat |
| Vahti (ilmoitus kun aikoja vapautuu) | Ei toteutettu | Vercel Cron klo 22:05, Supabase `golf_watches`-taulu |
| Claude API -pohjainen NL | Ei toteutettu | Varausta varten: `{ date|from,to, after, before, min }` JSON-paluumuoto |
| Kalenteri-integraatio muille sourcelle | Vain Google Calendar "Coming soon" | OAuth-tunnukset Googlelta |

---

## HAVAITUT RISTIRIIDAT DOKUMENTAATION JA KOODIN VÄLILLÄ

Nämä löydettiin koodin luvun yhteydessä. Ei ole korjattu automaattisesti.

1. **Vanhat tiedostonimet:** Aiemmassa CLAUDE-golf.md:ssä oli `api/golf.js` ja
   `src/…/GolfTimes.tsx`. Todelliset tiedostot ovat `app/api/golf/route.ts`
   ja `components/golf/GolfSearch.tsx`. Nyt korjattu.

2. **"Toimivat ilman autentikointia" -väite oli osittain vanhentunut:** Se pätee
   edelleen *vapaiden aikojen* hakuun — nämä endpointit eivät vaadi kirjautumista.
   Omien varausten haku (`getusergolfreservations`) kuitenkin vaatii session-cookien.
   Nyt dokumentoitu selkeästi erikseen.

3. **`wisegolf-uuden-klubin-selvitys.md` ei ole olemassa.** Tehtäväkuvauksessa
   siihen viitattiin, mutta tiedostoa ei löydy repositoriosta. Uuden klubin
   lisäysohjeet on kirjoitettu tähän dokumenttiin suoraan.

4. **`from`/`to`-parametrit ja moniklubi puuttuivat vanhasta dokumentaatiosta.**
   Alkuperäinen CLAUDE-golf.md kuvasi vain yksittäisen päivän `date`-parametrin
   ja HGK:n yksinään. Nyt dokumentoitu kaikki parametrit ja kaikki neljä klubia.

5. **Jatkokehitys-osio "useampi klubi" on toteutettu.** Vanha doc listasi
   useamman klubin tuen avoimena kehityskohteena — se on nyt valmis (HGK, Kullo,
   Tapiola, Hirsala). Vahti-toiminto sen sijaan ei ole toteutettu.
