# Golfaikojen haku (HGK / WiseGolf)

Hakee vapaat lähtöajat Helsingin Golfklubilta ja näyttää ne luonnollisen kielen
haulla ("ensi keskiviikkona illalla"). **Vain luku — ei varaustoiminnallisuutta.**

## Miksi read-only

Varaaminen on sitova, maksullinen (99–115 €) toimenpide peruutusehtoineen.
Automaattinen varaaminen olisi myös se kohta, jossa klubi voisi perustellusti
pitää integraatiota ongelmallisena. Haku ei häiritse ketään.
Varaus tehdään käsin: linkki `app.wisegolf.fi/#/golf/reservation/7`.

## Datalähde

WiseGolfilla ei ole julkista APIa. Endpointit on selvitetty selaimen
verkkoliikenteestä. **Ne toimivat ilman autentikointia** — ei tunnuksia,
ei istuntoja, ei tokeneita tallennettavaksi.

```
GET https://api.helsingingolfklubi.fi/api/1.0/reservations/?productid=7&date=YYYY-MM-DD&golf=1
GET https://api.helsingingolfklubi.fi/api/1.0/reservations/calendarsettings/?productid=7&date=YYYY-MM-DD
```

`productid=7` = "Golf Ajanvaraus 18r", HGK. Muilla klubeilla on oma
`api.<klubi>.fi` -domain ja oma productid.

### reservations/ palauttaa

| kenttä | sisältö |
|---|---|
| `rows[]` | **varatut** paikat. Yksi rivi = yksi pelaajapaikka. Kenttä `start`: `"YYYY-MM-DD HH:MM:SS"` |
| `reservationsGolfPlayers[]` | ⚠️ muiden pelaajien nimiä, tasoituksia, playerId:itä |
| `reservationsAdditionalResources[]` | lisäresurssit |

**Vapaita aikoja ei palauteta lainkaan.** Jos aika ei ole `rows`-listassa,
se on vapaa. Frontend generoi gridin itse.

⚠️ **Henkilötiedot:** `reservationsGolfPlayers` sisältää tunnistettavia
henkilöitä. Backend pudottaa sen kokonaan — sitä ei tallenneta eikä välitetä
frontendiin. Ulos menee vain `{ aika, vapaita }`.

### calendarsettings/ palauttaa

`reservationSettings`:
- `startTime` `06:00:00`, `endTime` `21:00:00`
- `duration` `9` (min), `breakTime` `0` → lähtö 9 min välein, 100 slottia/päivä
- `resources[0].quantity` `4` → 4 paikkaa per lähtö

`resourceRules[]` (~43 kpl). Merkitsevä on `ruleName === "aikaSulku"`:
- `startTime`/`endTime` — suljettu aikaväli
- `startDate`/`endDate` — voimassaoloaika (null = rajoittamaton)
- `recurrenceDays[]` — toistuva sulku, **indeksi 0 = maanantai**
- `ruleValue.comment` — syy, esim. "Erkko scramble by Turkish airlines"

Muut säännöt (`kalenteriNakyvyysPaivat`, `kalenteriNakyvyysAvaus`) koskevat
varausoikeuksia, ei näkyvyyttä — ohitetaan.

## Algoritmi

1. Generoi grid `startTime` → `endTime`, `duration + breakTime` minuutin välein
2. Ohita ajat jotka osuvat aktiiviseen `aikaSulku`-sääntöön
   (viikonpäivä: `(new Date(d+'T12:00:00').getDay() + 6) % 7`)
3. `vapaita = quantity − (rows-rivien määrä samalla start-ajalla)`
4. Palauta ne joissa `vapaita > 0`

Arvot luetaan aina `calendarsettings`-vastauksesta, ei kovakoodata —
klubi voi muuttaa slotin pituutta tai aukioloaikoja.

## Rajoitteet

- **Kalenteri auki ~16 päivää eteenpäin.** Kauempaa API palauttaa 200 ja tyhjän
  `rows`-listan, jolloin *kaikki* näyttää vapaalta. Harhaanjohtavaa — rajaa haku.
- **Uudet päivät aukeavat klo 22:00** (`kalenteriNakyvyysAvaus`).
- Rakenne voi muuttua ilman varoitusta. Aja `verify.js` jos tulokset oudoksuttavat.

## Kuormitus

Cache 15 min (muisti + `Cache-Control: s-maxage=900`). Haku enintään kerran
15 min per päivä. Ei tiheämpää pollausta.

## Rakenne

```
api/golf.js          endpoint: haku, suodatus, cache, henkilötietojen pudotus
src/…/GolfTimes.tsx  välilehti: syöte, parseri, tuloslista
verify.js            kertakäyttöinen tarkistusskripti (konsoliin, ei buildiin)
```

### Endpoint

```
GET /api/golf?date=2026-08-12
GET /api/golf?from=2026-08-12&to=2026-08-20
GET /api/golf?date=2026-08-12&min=2&after=16:00&before=20:00
→ { date, yhteensa, vapaat: [{ aika: "18:09", vapaita: 3 }] }
```

`min` = vähintään N paikkaa vapaana.

### Luonnollisen kielen parseri

Regex-pohjainen, **ei LLM-kutsua** — toimii ilman API-avainta ja ilman kuluja.
Tunnistaa: viikonpäivät, "ensi", "huomenna", "aamu/aamupäivä/iltapäivä/ilta",
"klo N jälkeen", "N hengelle".

⚠️ Järjestys ratkaisee: `"iltapäiv"` **ennen** `"ilta"`, `"aamupäiv"` ennen
`"aamu"` — muuten osuu molempiin ja tuottaa mahdottoman aikavälin.
Käytä `else if` -ketjua.

Jos halutaan monimutkaisempia kyselyitä ("jokin aamuaika seuraavan kahden
viikon sisältä"), lisätään Claude API -kerros joka palauttaa JSONina
`{date|from,to, after, before, min}`. Backend tukee jo `from`/`to`.

## Jatkokehitys

**Vahti** — Vercel Cron klo 22:05 (kun uudet päivät aukeavat) tarkistaa
seuratut päivät ja ilmoittaa kun aikoja vapautuu. Supabaseen taulu
`golf_watches (user_id, date, min_slots, after, before, notified_at)`.
Tämä on käytännössä hyödyllisempi kuin hakuruutu.

**Useampi klubi** — `golf/club/` -endpoint listaa klubeja. Vaatii
domain+productid -mäppäyksen per klubi.
