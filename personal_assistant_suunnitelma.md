# Personal Assistant -sovelluksen suunnitelma

## 1. Tavoite

Rakennetaan sovellusmainen **Personal Assistant** -järjestelmä, jossa on useita moduuleja. Ensimmäisessä vaiheessa keskitytään **Matkaplanneriin**, mutta arkkitehtuuri rakennetaan niin, että myöhemmin mukaan voidaan lisätä kalenterit, sähköposti, muistutukset, dokumentit ja mahdollisesti puhelin/WhatsApp.

Tärkeä periaate: sovellus ei ole pelkkä AI-chat, vaan henkilökohtainen käyttöliittymä, jossa agentti voi auttaa, tallentaa tietoa ja myöhemmin käyttää integraatioita käyttäjän hyväksynnällä.

---

## 2. Päätetty tekninen stack

```text
GitHub
→ koodin säilöntä ja versionhallinta

Claude Code
→ pääasiallinen rakentaminen

Codex
→ code review, bugien etsiminen ja toinen mielipide

Next.js App Router
→ frontend + backend API-routet samassa projektissa

TypeScript
→ turvallisempi ja ylläpidettävämpi koodi

Tailwind CSS
→ nopea ja siisti käyttöliittymä

Supabase
→ Postgres-tietokanta, Auth, myöhemmin Storage

Vercel
→ deploy

Claude API / Sonnet 5
→ AI-toiminnot sovelluksessa
```

---

## 3. Keskeinen käyttötapa

AI-suunnittelua ei ole pakko tehdä aina sovelluksen API:n kautta.

Käyttäjä voi jatkossakin suunnitella matkoja esimerkiksi ChatGPT:ssä tai Claude-chatissa ja käyttää omaa sovellusta enemmän operatiivisena assistenttina.

### Hybridimalli

```text
1. Suunnittelu ja sparraus
   → ChatGPT tai Claude-chat

2. Tallennus, jäsentäminen ja integraatiot
   → oma Personal Assistant -sovellus

3. Sähköpostit, kalenterit ja muistutukset
   → oma sovellus + Claude API
```

Tämä vähentää API-kustannuksia, koska sovellus käyttää Claude API:a vain selkeisiin toimintoihin, kuten:

- matkasuunnitelman jäsentäminen
- sähköpostiluonnoksen tekeminen
- sähköpostivastauksen tiivistäminen
- tarjousten vertailu
- kalenterimerkintöjen luonnostelu
- muistutusten tekeminen

---

## 4. MVP:n moduulit

Ensimmäisessä versiossa rakennetaan sovellusrakenne useille moduuleille, mutta vain Matkaplanneri tehdään oikeasti toimivaksi.

```text
1. Dashboard
2. Matkat / Travel Planner
3. Kalenterit / Calendar placeholder
4. Inbox placeholder
5. AI-kulut
6. Asetukset
```

### MVP-fokus

```text
Toimiva:
- Matkaplanneri
- AI-kustannusloki
- perusasetukset

Placeholder:
- Kalenterit
- Inbox
```

---

## 5. Matkaplanneri v0.1

Matkaplannerin ensimmäinen versio toimii matkaprojektien hallintana ja AI-avusteisena operatiivisena työkaluna.

### Käyttäjän pitää voida

- luoda uusi matkaprojekti
- tallentaa kohde, lähtökaupunki, aikaikkuna, budjetti ja kiinnostukset
- liittää vapaamuotoinen matkasuunnitelma
- pyytää sovellusta jäsentämään suunnitelma
- tehdä sähköpostiluonnos paikalliselle toimijalle
- tehdä budjettiarvio
- tehdä päiväkohtainen matkasuunnitelma
- tallentaa kaikki tuotokset matkaprojektiin
- nähdä AI-kutsujen arvioidut kustannukset

### Ei tehdä vielä

- automaattista sähköpostin lähetystä
- Gmail-yhdistystä
- kalenterin kirjoittamista
- lentojen tai hotellien ostamista
- maksullisia travel API -integraatioita
- puhelin- tai WhatsApp-integraatiota

---

## 6. Matkaprojektin tietosisältö

Matkaprojektilla olisi alkuun seuraavat kentät:

```text
title
destination
departure_city
date_window
duration_days
travelers
budget_min
budget_max
interests
travel_style
notes
status
```

Esimerkki:

```text
Title: Madeira 2027
Destination: Madeira
Departure city: Helsinki
Date window: March 2027
Duration: 8 days
Travelers: 2
Budget: 1800–2500 €
Interests: hiking, golf, food, sea views
Travel style: active, comfortable, local experiences
```

---

## 7. Matkan detail-näkymä

Yksittäisen matkan sivulla olisi seuraavat osiot:

```text
Overview
Brief
Itinerary
Budget
Email drafts
Activities
Accommodation
Flights notes
Notes
```

AI-napit esimerkiksi:

```text
- Jäsennä suunnitelma
- Luo trip brief
- Luo päiväkohtainen itinerary
- Luo budjettiarvio
- Luo sähköpostiluonnos paikalliselle toimijalle
- Tee viestistä englanninkielinen
- Tee viestistä rennompi
- Tee viestistä ammattimaisempi
```

---

## 8. Sähköpostilogiikka myöhemmin

Ensimmäisessä versiossa sovellus tekee vain sähköpostiluonnoksia.

Myöhemmässä versiossa lisätään Gmail-integraatio:

```text
Vaihe 1:
- agentti tekee sähköpostiluonnoksen sovelluksessa
- käyttäjä kopioi ja lähettää itse

Vaihe 2:
- agentti luo Gmail-draftin
- käyttäjä tarkistaa ja lähettää

Vaihe 3:
- agentti lukee vastaukset
- tiivistää tarjoukset
- vertaa vaihtoehdot
- ehdottaa jatkokysymyksiä

Vaihe 4:
- agentti voi lähettää hyväksytyn viestin
- ei koskaan ilman käyttäjän hyväksyntää
```

Turvaperiaate:

```text
Agentti saa luonnostella vapaasti.
Agentti ei saa lähettää mitään ilman hyväksyntää.
Agentti ei saa ostaa, varata tai maksaa mitään ilman hyväksyntää.
```

---

## 9. Kalenterimoduuli myöhemmin

Kalenterimoduuli rakennetaan aluksi placeholderiksi, mutta arkkitehtuuri tehdään niin, että myöhemmin voidaan yhdistää useita kalentereita.

Tavoite myöhemmin:

```text
- työkalenteri
- henkilökohtainen kalenteri
- Airbnb-kalenteri
- matkakalenteri
- muistutukset
```

Mahdollisia toimintoja:

- näytä vapaat viikonloput
- ehdota sopivia matkaikkunoita
- yhdistä usean kalenterin varaukset yhteen näkymään
- tee muistutus passista, vakuutuksesta, check-inistä ja rokotuksista
- lisää alustava matkatapahtuma kalenteriin
- luo kaverille ehdotettu tapaamisaika

Ensimmäisessä versiossa kalenteriin ei vielä kirjoiteta mitään.

---

## 10. Supabase-rakenne

Ensimmäiseen versioon tarvitaan ainakin nämä taulut:

```text
profiles
trips
trip_ai_outputs
ai_cost_logs
app_settings
```

Myöhemmin lisättäviä tauluja:

```text
email_drafts
email_threads
calendar_connections
calendar_events_cache
documents
operator_contacts
supplier_quotes
reminders
```

---

## 11. Alustava tietokantamalli

### profiles

```text
id
email
full_name
created_at
updated_at
```

### trips

```text
id
user_id
title
destination
departure_city
date_window
duration_days
travelers
budget_min
budget_max
interests
travel_style
notes
status
created_at
updated_at
```

### trip_ai_outputs

```text
id
trip_id
user_id
type
title
content
metadata
created_at
updated_at
```

`type` voi olla esimerkiksi:

```text
brief
itinerary
budget
email_draft
accommodation_ideas
activity_ideas
flight_notes
structured_plan
```

### ai_cost_logs

```text
id
user_id
trip_id
feature
model
input_tokens
output_tokens
estimated_cost_usd
created_at
```

### app_settings

```text
id
user_id
default_model
currency
language
created_at
updated_at
```

---

## 12. Auth ja turvallisuus

Käytetään Supabase Authia.

Alussa voi riittää yksinkertainen sähköpostikirjautuminen, mutta rakenne jätetään valmiiksi Google OAuthille.

Tärkeät säännöt:

```text
- kaikessa käyttäjän datassa on user_id
- RLS eli Row Level Security päälle
- käyttäjä näkee vain oman datansa
- service role -avainta ei koskaan käytetä client-puolella
- ulkoiset toimet vaativat hyväksynnän
```

---

## 13. AI-kustannusten seuranta

Jokaisesta Claude API -kutsusta tallennetaan kustannusloki.

Tallennettavat tiedot:

```text
- user_id
- trip_id, jos liittyy matkaan
- feature
- model
- input_tokens
- output_tokens
- estimated_cost_usd
- created_at
```

AI Costs -sivulla näytetään:

```text
- tämän päivän arvioitu kustannus
- tämän kuun arvioitu kustannus
- kokonaiskustannus
- viimeisimmät AI-kutsut
- kustannus per toiminto
```

---

## 14. Käyttökustannusarvio

Alkuvaiheen MVP:

```text
GitHub: 0 €
Vercel Hobby: 0 €
Supabase Free: 0 €
Claude API: noin 5–30 €/kk käytöstä riippuen
Domain: noin 10–20 €/vuosi, jos halutaan oma domain
```

Todennäköinen alkuvaiheen kokonaiskustannus:

```text
0–10 €/kk infra
+
5–30 €/kk Claude API
```

Jos mukaan tulee paljon dokumenttien lukua, sähköpostiketjujen analyysia ja automaatioita:

```text
30–150 €/kk käyttömäärästä riippuen
```

Kustannusten hallintaperiaate:

```text
- käytetään Claude API:a vain operatiivisiin toimintoihin
- suunnittelusparraus voidaan tehdä ChatGPT:ssä tai Claude-chatissa
- sovellus näyttää aina kustannusarvion
- myöhemmin voidaan lisätä halvempi malli kevyisiin tehtäviin
```

---

## 15. Käyttöliittymä

Tavoitteena on sovellusmainen käyttöliittymä, ei pelkkä chatbot.

Desktop:

```text
- vasen sidebar
- moduulit selkeästi näkyvillä
- matkan detail-sivu pääsisältönä
```

Mobiili:

```text
- bottom navigation
- appimainen näkymä
- nopeat AI-toimintopainikkeet
```

Päänavigaatio:

```text
Dashboard
Trips
Calendar
Inbox
Costs
Settings
```

---

## 16. Projektin kansiorakenne

Alustava rakenne:

```text
personal-assistant/
├─ app/
│  ├─ dashboard/
│  ├─ trips/
│  ├─ calendar/
│  ├─ inbox/
│  ├─ costs/
│  ├─ settings/
│  └─ api/
├─ components/
│  ├─ layout/
│  ├─ trips/
│  ├─ ai/
│  └─ ui/
├─ lib/
│  ├─ supabase/
│  ├─ claude/
│  ├─ agent/
│  ├─ cost/
│  └─ utils/
├─ db/
│  └─ migrations/
├─ types/
├─ .env.example
└─ README.md
```

---

## 17. Kehitysvaiheet

### Vaihe 1: Perusrunko

```text
- GitHub-repo
- Next.js app
- Tailwind
- Supabase-yhteys
- auth
- peruslayout
- dashboard
```

### Vaihe 2: Matkaprojektit

```text
- trips-taulu
- luo matka
- listaa matkat
- avaa matkan detail-sivu
- muokkaa matkan perustietoja
```

### Vaihe 3: Claude API

```text
- Claude client
- AI action endpointit
- generate brief
- generate itinerary
- generate budget
- generate email draft
```

### Vaihe 4: Tallennus ja kustannukset

```text
- trip_ai_outputs
- ai_cost_logs
- kustannusten näyttö
- AI Costs -sivu
```

### Vaihe 5: UI-parannukset

```text
- appimainen layout
- mobiilinäkymä
- loading-tilat
- virheilmoitukset
- paremmat empty states
```

### Vaihe 6: Codex review

```text
- security review
- tietokantamallin tarkistus
- RLS-politiikat
- API-routejen tarkistus
- refaktorointiehdotukset
```

---

## 18. Ensimmäinen Claude Code -prompti

Tämä prompti annetaan Claude Codelle projektin aloitukseen.

```text
Create a production-ready MVP for a modular personal assistant web app.

Stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- Supabase Auth
- Supabase Postgres
- Vercel deployment
- Anthropic Claude API
- Claude Sonnet 5 as default model

Core concept:
This is a personal assistant app with multiple modules. The MVP should focus on the Travel Planner module, while Calendar and Inbox should exist as placeholder modules for future expansion.

Important product direction:
The app should not be just an AI chat. It should feel like an app with structured modules, saved projects, clear actions, and stored outputs. The user may do broad travel planning in ChatGPT or Claude chat and then paste or import the plan into this app. The app should use Claude API mainly for operational tasks such as structuring the plan, creating email drafts, summarizing replies later, and preparing calendar/reminder actions.

Modules:
1. Dashboard
2. Travel Planner
3. Calendar placeholder
4. Inbox placeholder
5. AI Costs
6. Settings

Travel Planner requirements:
- User can create a trip project
- User can view all trips
- User can open a trip detail page
- User can edit trip details
- Trip fields:
  - title
  - destination
  - departure_city
  - date_window
  - duration_days
  - travelers
  - budget_min
  - budget_max
  - interests
  - travel_style
  - notes
  - status
- Trip detail page sections:
  - Overview
  - Brief
  - Itinerary
  - Budget
  - Email drafts
  - Activities
  - Accommodation
  - Flights notes
  - Notes

AI features:
- Structure pasted travel plan into a clean trip brief
- Generate trip brief
- Generate day-by-day itinerary
- Generate budget estimate
- Generate local operator email draft
- Save every AI output to Supabase
- Never send email automatically
- Never make purchases or bookings
- Never write to calendar yet
- All future external actions must require user approval

AI cost tracking:
For every Claude API call, save:
- user_id
- trip_id if relevant
- feature
- model
- input_tokens
- output_tokens
- estimated_cost_usd
- created_at

Database:
Create SQL migrations or Supabase schema for:
- profiles
- trips
- trip_ai_outputs
- ai_cost_logs
- app_settings

Auth:
- Use Supabase Auth
- Support email login
- Keep the structure ready for Google OAuth later
- Add user_id to all user-owned data
- Add Row Level Security policies

UI:
- App-like design
- Sidebar on desktop
- Bottom navigation on mobile
- Clean dashboard
- Responsive layout
- Make the app feel like a real product, not a demo

Environment variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- ANTHROPIC_API_KEY

Deliverables:
- Full working code
- Database schema
- Supabase setup instructions
- Local development instructions
- Vercel deploy instructions
- README
- .env.example
```

---

## 19. Ensimmäinen Codex review -prompti

Kun Claude Code on rakentanut ensimmäisen version, Codexille voidaan antaa tämä:

```text
Review this Next.js + Supabase + Claude API personal assistant MVP.

Focus on:
- security issues
- Supabase RLS correctness
- API route safety
- whether service role key is only used server-side
- database schema quality
- AI cost logging correctness
- whether user-owned data is properly isolated
- UX issues in the Travel Planner flow
- unnecessary complexity
- missing error handling

Do not rewrite everything. Give concrete prioritized fixes.
```

---

## 20. Tämänhetkinen päätös

Lukittu suunnitelma:

```text
Rakennetaan sovellusmainen Personal Assistant.
Käytetään Supabasea backendinä.
Deploy Verceliin.
Koodi GitHubiin.
Rakennetaan Claude Codella.
Codex toimii review-työkaluna.
AI: Claude API / Sonnet 5.
Ensimmäinen oikea moduuli: Matkaplanneri.
Kalenteri ja Inbox tehdään placeholderina.
API:a käytetään ensisijaisesti operatiivisiin toimintoihin, ei kaikkeen suunnitteluun.
```

Seuraava askel:

```text
1. Luo GitHub-repo
2. Luo Supabase-projekti
3. Luo paikallinen Next.js-projekti Claude Codella
4. Aja ensimmäinen Claude Code -prompti
5. Tee ensimmäinen toimiva Matkaplanneri
```
