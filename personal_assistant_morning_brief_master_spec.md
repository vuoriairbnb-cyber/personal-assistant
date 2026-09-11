# Personal Assistant — Morning Brief
## Product specification, ranking algorithm, data model, learning system, UI architecture and Codex implementation plan

**Document status:** Master specification v1
**Purpose:** This document is the working source of truth for implementing a new, isolated **Morning Brief** feature inside the existing Personal Assistant application.
**Core constraint:** The feature must be added without breaking, rewriting, or unnecessarily coupling to existing Personal Assistant features. Existing features such as golf watches, notifications, dashboards, authentication, navigation, cron jobs, integrations, and other pages must continue to behave as before.

---

# 0. Executive summary

Morning Brief is a personalized daily news and investment-intelligence page inside Personal Assistant.

It is not intended to be:

- a generic RSS reader;
- a copy of a newspaper homepage;
- a Bloomberg-style terminal full of numbers;
- a feed with hundreds of headlines;
- an AI chatbot that freely decides what the user should read;
- or a scraper that blindly copies paywalled articles.

It is intended to answer:

> **What happened in the last 12–24 hours that is most relevant to me, my investments, my professional interests and the world I should understand — and why does it matter?**

The system should ingest a much larger candidate pool than it displays, classify and deduplicate stories, compute transparent scores, select a diverse set of stories, and show only a small number on the Morning Brief dashboard.

The main dashboard should stay compact. Every major section gets a **“Show more” / “Näytä lisää”** action that opens a deeper, ranked intelligence feed.

The system must also learn over time from explicit feedback:

- heart / like;
- not relevant;
- show fewer like this;
- article opened;
- saved;
- manually imported article;
- optionally dwell/read time later.

Explicit likes and imported articles should influence future recommendations. Learning should update a user preference profile and semantic similarity model rather than “fine-tuning the LLM” after every click.

The system should always preserve some exploration so the user does not get trapped in a filter bubble.

---

# 1. User-specific investment profile

The initial portfolio/intelligence profile is centered on four major investment lenses.

## 1.1 PYN Elite

**Primary exposure:** Vietnam

Priority: **very high**

Important topics:

- Vietnam macroeconomy
- GDP
- CPI/inflation
- central bank policy
- State Bank of Vietnam
- interest rates
- credit growth
- banking
- consumer demand
- real estate/property
- industrials
- exports
- manufacturing
- FDI
- foreign flows
- VN-Index
- market liquidity
- market regulation
- stock market reform
- FTSE/MSCI classification
- currency / VND
- fiscal policy
- infrastructure
- domestic politics when it affects markets
- major Vietnamese listed companies
- sectors held by or relevant to PYN Elite
- fund-specific news when available

The engine must understand that a story about Vietnam can be highly personally relevant even if it is not globally important.

---

## 1.2 Evli Emerging Frontier

Priority: **very high**

Important topics:

- emerging markets
- frontier markets
- country classification changes
- local equity markets
- local interest rates
- currencies
- political and regulatory shifts
- market accessibility
- capital flows
- foreign investor flows
- banking
- consumer
- industrials
- energy
- telecom
- infrastructure
- local company news
- country-specific macro
- geopolitical events affecting portfolio countries
- MSCI / FTSE Russell classifications
- index inclusion/exclusion
- fund holdings and country weights when obtainable

The exact country and company exposure should not be hard-coded forever. The data model should support periodically updating fund holdings, country weights and sector exposures.

---

## 1.3 European and Nordic High Yield

Priority: **high**

Important topics:

- European high-yield credit
- Nordic high yield
- credit spreads
- spread widening/tightening
- refinancing
- maturity walls
- defaults
- restructuring
- distressed debt
- recoveries
- ratings upgrades/downgrades
- bond issuance
- primary market activity
- secondary market liquidity
- leveraged finance
- covenant changes
- ECB policy
- European interest rates
- Euribor
- funding costs
- credit conditions
- property debt
- shipping
- energy
- industrial issuers
- telecom issuers
- Nordic issuers
- Swedish/Norwegian/Finnish/Danish credit markets
- risk appetite
- loan-to-value
- private credit where related
- sponsor-backed borrowers
- debt service and interest coverage

The engine must understand causal relevance. Example:

> ECB policy → borrowing costs → refinancing conditions → high-yield credit relevance.

An article does not need to contain the words “high yield” to be relevant.

---

## 1.4 Evli Nordic Secured Loan

Priority: **high**

Important topics:

- Nordic secured lending
- syndicated loans
- leveraged loans
- senior secured loans
- private credit
- corporate lending
- covenants
- collateral
- restructurings
- defaults
- recoveries
- refinancing
- sponsor-backed loans
- leveraged buyouts
- loan pricing
- loan spreads
- floating-rate debt
- Euribor
- credit quality
- Nordic corporate borrowers
- Nordic property finance
- syndicated loan market activity
- lender protections
- amendments and extensions
- maturity extensions
- debt exchanges
- covenant resets
- distressed situations

---

# 2. Non-investment interests

Morning Brief is not only an investment dashboard.

The initial non-investment lenses are:

## 2.1 Finland

### Finnish politics
High priority.

Relevant:

- government decisions
- Parliament
- fiscal policy
- taxation
- employment policy
- pensions
- budget
- public finances
- debt
- EU decisions materially affecting Finland
- regulation
- major political reforms
- elections and major party developments
- security policy
- industrial policy
- energy policy

Avoid filling the brief with routine political theater unless it is genuinely important.

### Finnish business and economy
Very high priority.

Relevant:

- listed companies
- large private companies
- M&A
- restructuring
- bankruptcies
- industrial investment
- exports
- labor market
- construction
- property
- consumer
- Finnish VC
- startup funding
- Finnish private equity
- economic indicators
- Bank of Finland
- Statistics Finland
- major corporate results

---

## 2.2 Venture Capital

High priority.

Relevant:

- meaningful funding rounds
- new VC funds
- European VC
- Nordic VC
- Finnish VC
- exits
- IPOs
- acquisitions
- AI / technology funding
- fund strategy shifts
- fundraising environment
- LP market
- secondary transactions
- startup ecosystem trends

Avoid flooding the feed with tiny seed rounds unless they are unusually relevant.

---

## 2.3 Private Equity

High priority.

Relevant:

- buyouts
- exits
- continuation funds
- secondaries
- fundraising
- sponsor-backed refinancing
- leveraged finance
- European PE
- Nordic PE
- Finnish PE
- large strategic transactions
- private credit interaction
- debt packages
- portfolio company distress
- valuation trends

---

## 2.4 Global news and geopolitics

Medium-to-high priority.

Relevant when:

- globally important;
- economically important;
- geopolitically significant;
- affects markets;
- affects Europe/Finland;
- affects portfolio countries;
- affects energy/commodities/rates/trade.

The user should never miss a truly major event simply because it does not match a personalized interest tag.

---

## 2.5 Markets and macro

High priority.

Relevant:

- central banks
- Fed
- ECB
- inflation
- employment
- rates
- FX
- commodities
- oil
- major equity moves
- risk sentiment
- credit markets
- economic surprises
- major macro releases

---

## 2.6 Deep reading

Sources such as FT, Economist, Talouselämä and other analysis-heavy publications may be more useful as a separate **Worth Reading** layer than as breaking-news candidates.

The system should distinguish:

- breaking news;
- analysis;
- opinion;
- explainers;
- long reads.

---

# 3. Initial source universe

The user currently has access to or wants to use sources such as:

- Kauppalehti
- Talouselämä
- Financial Times
- The Economist
- Yle
- BBC
- Reuters

Potential later sources:

- local Vietnam business/economic sources
- official Vietnamese institutions
- country-specific emerging/frontier sources
- central banks
- stock exchanges
- ministries/statistical offices
- MSCI
- FTSE Russell
- fund manager publications
- ratings agencies where accessible
- Nordic credit-market sources
- private equity / venture capital specialist media

## 3.1 Source principle

Do **not** hard-code the product around a single provider.

All sources should map to a normalized internal article/story model.

The ranking engine must not care whether a story came from Reuters, Yle, FT or another source.

## 3.2 Paywall and content rights

A personal subscription does not automatically grant the application permission to scrape or reproduce an entire publication programmatically.

Therefore:

- keep source integrations modular;
- store only content that is legally/technically permitted;
- prefer metadata, title, excerpt, canonical URL and permitted summaries;
- deep-link to the original publication;
- never build the architecture around bypassing a paywall;
- do not reproduce entire copyrighted articles;
- allow the user to open the original article using their own subscription.

---

# 4. Product UX

## 4.1 New page

Add a new first-class page to Personal Assistant:

**Morning Brief**

Suggested route:

`/morning-brief`

Adapt this to the existing route conventions if the repository uses a different routing structure.

## 4.2 Navigation

Add one navigation entry to the existing Personal Assistant navigation.

Do not redesign the global navigation.

Do not break existing routes.

Do not change unrelated page layouts.

The Morning Brief feature should be isolated from existing modules.

---

# 5. Dashboard information architecture

The main Morning Brief screen should be optimized for roughly 5–10 minutes of morning reading.

Suggested order:

1. Header
2. Today in 30 seconds
3. What Matters Today
4. Markets at a Glance
5. Vietnam / PYN Elite
6. Emerging & Frontier
7. Credit & High Yield
8. Finland
9. VC & Private Equity
10. World / Politics
11. Worth Reading
12. optional Daily Extras later

---

# 6. Header

Example:

**Good morning**
Tuesday, 8 September
Updated 07:15
8 min read

Optional later:

- Helsinki weather
- calendar
- brief status
- refresh button

Do not let utility widgets overwhelm the intelligence product.

---

# 7. Today in 30 seconds

AI-generated, but grounded only in selected stories.

3–6 concise bullet points or a short paragraph.

Example:

- Oil rose after geopolitical tensions intensified.
- Vietnam market reform remains a major local-market catalyst.
- Nordic credit spreads tightened while refinancing activity picked up.
- Finnish fiscal-policy news is likely to dominate the domestic agenda.

The model may summarize selected stories but must not invent unsupported developments.

---

# 8. What Matters Today

The highest-value section.

Show approximately 3–5 story clusters.

Each card should include:

- headline
- source
- time
- 1–3 sentence summary
- relevance tags
- optional score/debug info in development
- “Why it matters to you”
- heart
- open source
- optional more menu
- perhaps related sources count

Example:

**Vietnam credit growth accelerates**

Reuters · 2h

Vietnamese bank lending accelerated...

Tags:

`Vietnam` `PYN Elite` `Banking` `Macro`

Why you care:

> Directly relevant to Vietnam exposure and the banking/credit cycle.

♡ / ♥

---

# 9. Section cards on the dashboard

Each section should show only the strongest few stories.

Recommended initial limits:

| Section | Dashboard stories |
|---|---:|
| What Matters Today | 5 |
| Vietnam / PYN Elite | 2 |
| Emerging & Frontier | 2 |
| Credit & High Yield | 2 |
| Finland | 2 |
| VC & PE | 2 |
| World / Politics | 2 |
| Worth Reading | 3 |

Avoid duplicate stories across the page where possible.

A major story may appear in What Matters Today and be referenced by its native section, but the UI should avoid fully duplicating the same card.

---

# 10. Show more / Näytä lisää

Every important section should provide:

**Näytä lisää →**

This opens a deeper section view, for example:

`/morning-brief/vietnam`

or an existing routing convention such as:

`/morning-brief?section=vietnam`

Prefer actual routes if the application supports them cleanly.

Deep views can show approximately 20–60 ranked stories depending on available candidates.

Example Vietnam deep view:

- Must Know
- Markets
- Macro & Policy
- Companies
- Banking
- Property
- FDI / Manufacturing
- Long Reads

Example Credit deep view:

- Must Know
- European HY
- Nordic HY
- Leveraged Loans
- Syndicated Loans
- Refinancing
- Defaults / Distress
- Issuance
- ECB / Rates
- Long Reads

---

# 11. Article feedback UX

Each article/story should have a heart action.

Default:

`♡`

Liked:

`♥`

Meaning:

> I found this useful / interesting. Show me more articles with similar subject matter, characteristics and analytical style.

Do not interpret the heart as an endorsement of the article’s opinion.

## 11.1 Additional feedback

Via an overflow menu:

- Not relevant to me
- Show fewer like this
- Save
- Open original
- optional “Why was this shown?”

The negative feedback is important because otherwise the recommender only receives positive labels.

---

# 12. Import article feature

Add:

**+ Add article**

The user can paste a URL for an article they personally found useful.

The system should:

1. normalize URL;
2. retrieve legally accessible metadata/content;
3. store the source URL;
4. classify the article;
5. compute tags/features;
6. create an embedding if embeddings are enabled;
7. mark it as a strong positive preference signal;
8. add it to My Library;
9. use it to influence future recommendations.

A manually imported article should normally be a stronger learning signal than a simple heart.

Do not circumvent paywalls.

If full content cannot be retrieved, store and learn from whatever authorized metadata / user-provided content is available.

---

# 13. My Library

Create a later or initial sub-view:

`/morning-brief/library`

Contains:

- liked articles
- imported articles
- saved articles
- optionally recently opened articles

Useful filters:

- Vietnam
- Nordic Credit
- European HY
- Emerging / Frontier
- VC
- PE
- Finland
- Politics
- Markets
- Source
- Date

Optional insight card:

**What the system has learned**

Examples:

- Vietnam banking
- Nordic credit
- European refinancing
- private equity transactions
- Finnish fiscal policy

The user should eventually be able to correct or down-weight learned topics.

---

# 14. Core architecture principle

Separate the pipeline into five distinct responsibilities:

```text
INGESTION
    ↓
NORMALIZATION
    ↓
CLASSIFICATION
    ↓
SCORING / LEARNING
    ↓
PRESENTATION
```

Do not put scraping logic in UI components.

Do not put scoring formulas in React components.

Do not put LLM prompts inside random API routes.

Do not couple a source adapter directly to a page.

---

# 15. Recommended feature module

Codex must inspect existing project conventions first.

If compatible, prefer an isolated module concept similar to:

```text
src/
  features/
    morning-brief/
      domain/
      scoring/
      classification/
      deduplication/
      learning/
      sources/
      services/
      components/
      hooks/
      types/
      tests/
```

If the existing repository uses a different convention, conform to it rather than imposing this directory layout.

The important thing is conceptual isolation.

---

# 16. Canonical article model

A normalized article should support fields similar to:

```ts
export type NewsArticle = {
  id: string
  sourceId: string

  title: string
  subtitle?: string | null
  excerpt?: string | null
  bodyText?: string | null

  canonicalUrl: string
  imageUrl?: string | null

  author?: string | null

  publishedAt: string
  fetchedAt: string

  language: string

  sourceArticleId?: string | null

  contentType:
    | "breaking_news"
    | "news"
    | "analysis"
    | "opinion"
    | "explainer"
    | "long_read"

  accessType?:
    | "public"
    | "subscription"
    | "unknown"

  rawMetadata?: Record<string, unknown>
}
```

The actual TypeScript must match repository conventions.

---

# 17. Classification model

Each article/story should receive structured classification.

Suggested schema:

```ts
export type ArticleClassification = {
  countries: string[]
  regions: string[]

  categories: NewsCategory[]
  topics: string[]

  sectors: string[]
  companies: string[]
  people: string[]

  assetClasses: string[]
  funds: string[]

  eventType: string

  significance: number
  consequence: number
  scope: number

  primarySection: BriefSection

  portfolioLinks: PortfolioLink[]

  summary: string
  whyItMatters?: string | null

  confidence: number
}
```

All 0–100 numeric values should be validated and clamped.

---

# 18. Initial category taxonomy

Suggested enums or controlled values:

```text
finland_politics
finland_business
finland_economy

global_politics
geopolitics

markets_macro
rates
fx
commodities

venture_capital
private_equity

emerging_markets
frontier_markets
emerging_frontier

vietnam

european_high_yield
nordic_high_yield
credit
leveraged_finance
syndicated_loans
private_credit

technology
energy
property
banking
consumer
industrials
shipping
telecom
```

Use a normalized controlled taxonomy where possible, with flexible `topics` for more specific concepts.

---

# 19. Portfolio exposure model

Do not encode portfolio relevance only as text prompts.

Create explicit portfolio/exposure data.

Conceptually:

```ts
type PortfolioAsset = {
  id: string
  name: string
  assetType:
    | "fund"
    | "equity"
    | "bond"
    | "loan_fund"
    | "other"

  priority: number
  active: boolean
}
```

Exposure:

```ts
type PortfolioExposure = {
  portfolioAssetId: string

  exposureType:
    | "country"
    | "company"
    | "sector"
    | "asset_class"
    | "topic"

  key: string
  weight?: number | null

  relevanceStrength: number
  validFrom?: string | null
  validTo?: string | null
}
```

This supports future holdings updates.

---

# 20. Initial portfolio records

Seed or create user configuration supporting:

### PYN Elite

High-priority relationships to:

- Vietnam
- Vietnam equities
- Vietnam macro
- banking
- consumer
- property
- industrials
- market regulation
- FDI
- currency
- local equity market

### Evli Emerging Frontier

High-priority relationships to:

- emerging markets
- frontier markets
- relevant countries
- relevant companies
- relevant sectors

Country/company exposure should later be importable rather than permanently hard-coded.

### European High Yield

Relations to:

- European HY
- credit
- refinancing
- defaults
- issuance
- ECB/rates
- ratings
- spread moves
- leveraged finance

### Nordic High Yield

Relations to:

- Nordic credit
- Sweden
- Norway
- Finland
- Denmark
- refinancing
- defaults
- issuance
- property
- shipping
- energy
- sponsor-backed borrowers

### Evli Nordic Secured Loan

Relations to:

- syndicated loans
- senior secured loans
- leveraged loans
- private credit
- covenants
- collateral
- restructuring
- Nordic corporate credit

---

# 21. Candidate pipeline

The system should ingest far more articles than it displays.

Illustrative daily pipeline:

```text
300–800 raw source items
↓
URL/title normalization
↓
250–600 valid candidate articles
↓
duplicate removal
↓
100–300 story clusters
↓
classification
↓
scores
↓
section allocation
↓
~15 dashboard stories
↓
20–60 stories per deep feed
```

Exact volume depends on sources.

Do not optimize for massive scale prematurely.

---

# 22. Deduplication

Duplicate handling is mandatory.

A single Fed decision reported by Reuters, FT, BBC and Kauppalehti is one event, not four independent stories.

## 22.1 Step 1 — canonical URL

Same canonical URL → duplicate.

## 22.2 Step 2 — normalized title

Normalize:

- lowercase
- punctuation
- whitespace
- common source suffixes
- tracking text

Near-identical title → probable duplicate.

## 22.3 Step 3 — semantic similarity

Later or in v1 if pgvector is available:

- embedding similarity
- same time window
- overlapping countries/entities/event type

Potential logic:

```text
similarity >= threshold
AND published within e.g. 36h
AND overlapping entity/event evidence
→ same story cluster
```

Do not rely on a similarity threshold alone.

## 22.4 Story cluster

```ts
type StoryCluster = {
  id: string
  primaryArticleId: string

  eventKey?: string | null

  firstPublishedAt: string
  latestPublishedAt: string

  countries: string[]
  topics: string[]

  sourceCount: number

  articleIds: string[]
}
```

---

# 23. Primary-source selection inside a cluster

Choose the best article for display based on:

- source fit for topic
- completeness
- freshness
- directness
- original reporting if known
- accessibility
- analysis value

Related sources can remain visible:

> Reuters · also covered by FT and BBC

A later version can show separate “News” and “Analysis” links for the same event.

---

# 24. AI's role

Use AI for tasks where semantic interpretation helps:

- article classification
- entity extraction
- topic extraction
- event type
- short summary
- significance/consequence/scope estimates
- causal relevance extraction
- “why this matters”
- imported article understanding

AI should return structured data.

AI should **not** be the sole final ranking engine.

---

# 25. Deterministic ranking

The final score must be computed in application code.

Reasons:

- reproducibility
- observability
- explainability
- easier tuning
- unit testing
- reduced model drift
- lower cost
- safer debugging

---

# 26. Personal relevance model

Personal relevance should combine multiple signals.

Potential input signals:

- portfolio relevance
- explicit interest relevance
- learned preference relevance
- geography
- sector
- watchlist
- semantic similarity to liked/imported articles

A strong direct signal should be capable of making a story personally important even if not every field matches.

---

# 27. Portfolio relevance

Suggested conceptual levels:

## Direct holding or direct fund/company event
Score near: **100**

## Fund look-through company/sector exposure
Score near: **85–95**

## Country exposure
Score near: **70–90**, depending on event

## Asset-class causal relevance
Example ECB → European HY.
Score determined by causal strength.

The engine should store `scoreReason` details.

---

# 28. Global Importance

Keep this separate from personal relevance.

Inputs:

```text
significance
consequence
scope
corroboration
```

Suggested formula v1:

```ts
importanceScore =
  significance * 0.35 +
  consequence * 0.30 +
  scope * 0.20 +
  corroboration * 0.15
```

All values 0–100.

---

# 29. Corroboration score

Possible simple v1:

- 1 credible source → 45
- 2 credible sources → 65
- 3 → 80
- 4+ → 90–100

Do not equate virality with truth.

Source authority and actual independent confirmation matter.

---

# 30. Freshness score

Suggested exponential decay:

```ts
freshness =
  100 * Math.pow(0.5, ageHours / halfLifeHours)
```

Suggested half lives:

| Content | Half-life |
|---|---:|
| breaking news | 12–18h |
| normal news | 18–24h |
| business analysis | 36h |
| long read | 72h |

This means older high-quality analyses can still appear in Worth Reading.

---

# 31. Source fit

Source quality should be contextual rather than universal.

Example concept only:

| Source | Finland | Markets | World | VC/PE | Deep |
|---|---:|---:|---:|---:|---:|
| Yle | 100 | 65 | 80 | 40 | 70 |
| Kauppalehti | 95 | 90 | 60 | 80 | 75 |
| Talouselämä | 90 | 85 | 65 | 90 | 85 |
| Reuters | 80 | 100 | 100 | 85 | 75 |
| FT | 75 | 100 | 95 | 100 | 100 |
| BBC | 70 | 65 | 100 | 40 | 75 |
| Economist | 50 | 80 | 95 | 70 | 100 |

These are tunable ranking parameters, not objective truth.

Store them as configuration where practical.

---

# 32. Feedback and learned preference system

This is a key differentiator.

The system must learn from behavior without losing transparency.

## 32.1 Feedback events

Suggested event types:

```text
impression
open
like
unlike
save
unsave
not_relevant
show_fewer_like_this
import
```

Optional later:

```text
dwell
share
```

## 32.2 Initial signal strengths

Conceptual values:

| Event | Signal |
|---|---:|
| impression | 0 |
| open | +0.20 |
| meaningful dwell | +0.40 |
| like | +1.00 |
| save | +1.20 |
| import | +2.00 |
| not relevant | -1.00 |
| show fewer like this | -2.00 |

Do not directly add these numbers to article final score. Use them to update learned preferences.

---

# 33. Learned preference dimensions

The system can learn affinity for:

- country
- region
- sector
- topic
- event type
- asset class
- company
- fund relationship
- content type
- source
- semantic concepts

Do not over-weight source affinity.

If the user likes a Reuters Vietnam banking article, the intended learning is mostly:

- Vietnam
- banking
- macro/credit
- data-driven analysis

—not simply “Reuters”.

---

# 34. Semantic preference

Liked and imported articles should optionally have embeddings.

Potential strategy:

- create embedding per article;
- maintain recent strong-positive vectors;
- compute similarity from new article to liked/imported articles;
- use top-k weighted similarity;
- apply time decay to old signals.

Example:

```text
New article semantic similarity:
0.91 to imported Nordic refinancing article
→ meaningful learned preference boost
```

---

# 35. Preference decay

Behavioral preference should decay over time.

Example approximate weights:

- <30 days: 100%
- 90 days: ~70%
- 180 days: ~50%
- 365 days: ~25%

Portfolio preferences do **not** decay automatically while holdings remain active.

Explicit pinned interests should not decay unless edited.

---

# 36. Exploration

Avoid a perfect filter bubble.

Keep an exploration component.

Suggested:

- dashboard: very low exploration, perhaps 2–5%
- deep feeds: 10–15% exploration candidates

Exploration articles must still pass a minimum quality/importance threshold.

They should be adjacent to known interests, not random noise.

---

# 37. Learned preference score

Possible v1/v2 formula:

```ts
learnedPreference =
    topicAffinity       * 0.30
  + semanticAffinity    * 0.30
  + countryAffinity     * 0.15
  + sectorAffinity      * 0.10
  + contentTypeAffinity * 0.10
  + sourceAffinity      * 0.05
```

Clamp 0–100.

---

# 38. Final ranking formula v2

Proposed starting point:

```ts
finalScore =
    portfolioRelevance * 0.30
  + learnedPreference  * 0.18
  + importanceScore    * 0.18
  + explicitInterest   * 0.10
  + freshnessScore     * 0.08
  + sourceFit          * 0.06
  + likedSimilarity    * 0.05
  + noveltyScore       * 0.03
  + explorationScore   * 0.02
```

This is a starting hypothesis, not permanent truth.

Weights should live in a centralized config.

Unit tests should lock intended behavior.

---

# 39. Mandatory major-event override

A highly important global event must still be considered even when personal relevance is low.

Example:

```ts
if (importanceScore >= 95) {
  mustConsider = true
}
```

This does not guarantee top position, but prevents it from disappearing.

---

# 40. Diversity layer

Sorting by `finalScore DESC` is not enough.

Without diversification, the top stories can all be the same country/topic.

Use an adjusted score during selection.

Concept:

```ts
adjustedScore =
  finalScore
  - duplicateCountryPenalty
  - duplicateTopicPenalty
  - duplicateEventPenalty
  + underrepresentedSectionBonus
```

## Soft constraints, not hard quotas

Prefer:

- one strong Finland story
- one portfolio story
- one EM/frontier story
- one major global/markets story

But do not force low-quality filler.

A Finland story with score 42 should not appear just because the “Finland slot” is empty.

---

# 41. What Matters Today selection

Select 3–5 story clusters.

Potential greedy process:

1. sort candidate story clusters by final score;
2. select highest;
3. recompute diversity penalties;
4. repeat;
5. apply major-event override;
6. ensure no near-duplicate events;
7. check section diversity;
8. produce explanations.

---

# 42. Section ranking

Each section gets its own relevant candidate set.

Examples:

## Vietnam
Requires one or more:

- country = Vietnam
- PYN Elite relationship
- high Vietnam semantic relevance

## Emerging & Frontier
Requires:

- emerging/frontier category
- relevant Evli exposure
- MSCI/FTSE/frontier-related topics

## Credit & High Yield
Requires:

- European HY
- Nordic HY
- credit
- leveraged loans
- syndicated loans
- private credit
- refinancing/defaults/issuance/rates with causal credit relevance

## Finland
- Finnish politics
- business
- economy

## VC/PE
- venture capital
- private equity
- adjacent leveraged finance where clearly relevant

---

# 43. Dashboard vs deep-feed threshold

The dashboard should be selective.

Conceptual threshold:

```text
Dashboard:
score >= high threshold
AND selected by diversity

Deep feed:
score >= lower threshold
AND section-relevant
```

Do not hard-code threshold numbers without observing mock data.

Calibrate using test datasets.

---

# 44. Explainability

For each ranked item store:

```ts
type ScoreExplanation = {
  portfolioReasons: string[]
  learnedReasons: string[]
  importanceReasons: string[]
  interestReasons: string[]

  componentScores: {
    portfolioRelevance: number
    learnedPreference: number
    importance: number
    explicitInterest: number
    freshness: number
    sourceFit: number
    likedSimilarity: number
    novelty: number
    exploration: number
  }

  finalScore: number
}
```

Development/debug UI should make this inspectable.

Production can show a short version:

> Why this matters: Vietnam exposure · Banking · PYN Elite

---

# 45. Suggested database model

Adapt names to current repository conventions.

Do not blindly create duplicates if equivalent tables already exist.

Potential tables:

```text
news_sources
news_articles
news_article_classifications
news_story_clusters
news_story_cluster_articles

news_user_preferences
news_watchlist

portfolio_assets
portfolio_exposures

news_scores

article_feedback
imported_articles

learned_interest_profiles
learned_interest_signals

daily_briefs
daily_brief_items
```

---

# 46. `news_sources`

Possible fields:

```text
id
slug
name
base_url
source_type
default_language
enabled
metadata_json
created_at
updated_at
```

---

# 47. `news_articles`

Possible fields:

```text
id
source_id
source_article_id

title
subtitle
excerpt
body_text

canonical_url
image_url
author

published_at
fetched_at

language
content_type
access_type

raw_metadata_json

created_at
updated_at
```

Add uniqueness constraints where appropriate.

---

# 48. `news_article_classifications`

Possible fields:

```text
article_id

countries_json
regions_json
categories_json
topics_json
sectors_json
companies_json
people_json
asset_classes_json
funds_json

event_type

significance
consequence
scope
confidence

primary_section

summary
why_it_matters

classification_version

created_at
updated_at
```

If the app prefers normalized join tables, use repository conventions.

---

# 49. Story cluster tables

```text
news_story_clusters
- id
- primary_article_id
- event_key
- first_published_at
- latest_published_at
- source_count
- metadata_json
- created_at
- updated_at

news_story_cluster_articles
- cluster_id
- article_id
- similarity
- relation_type
```

---

# 50. Feedback table

```text
article_feedback

id
user_id
article_id
story_cluster_id nullable

event_type

signal_strength

metadata_json

created_at
```

If auth/user schema differs, use existing identity model.

Unique constraints may be useful for state-like feedback such as current heart status, but event history should not be lost. Consider an event log + current state.

---

# 51. Imported articles

```text
imported_articles

id
user_id
url
normalized_url

article_id nullable

status
error_message nullable

import_strength

created_at
processed_at nullable
```

---

# 52. Learned interests

Possible materialized representation:

```text
learned_interest_profiles

id
user_id
dimension_type
dimension_key

affinity_score
positive_signal_count
negative_signal_count

last_signal_at
updated_at
```

Examples:

```text
country / VN / 0.95
topic / refinancing / 0.90
sector / banking / 0.82
content_type / analysis / 0.74
```

---

# 53. Embeddings

If the current Supabase/Postgres supports pgvector and the project already uses it, reuse it.

If not, introduce it only when needed.

Potential fields:

```text
news_articles.embedding
imported_articles embedding via linked article
```

Do not make the whole initial feature fail if vectors are unavailable.

The ranking engine should support a fallback with semantic score = neutral/0 until embeddings are enabled.

---

# 54. Daily briefs

Daily brief should be persisted for consistency and debugging.

`daily_briefs`:

```text
id
user_id
brief_date
generated_at
status
summary_text
algorithm_version
classification_version
metadata_json
```

`daily_brief_items`:

```text
id
brief_id
story_cluster_id
article_id

section
rank
score
score_explanation_json

created_at
```

This allows:

- reproducing yesterday’s brief;
- debugging ranking changes;
- comparing algorithm versions.

---

# 55. Versioning

Always version:

- ranking algorithm
- classification prompt/schema
- source adapter
- brief generation

Examples:

```text
ranking-v1
ranking-v2
classifier-v1
```

This makes future evaluation possible.

---

# 56. Mock-data-first development

Before integrating real sources, build a realistic test dataset of at least 50–100 articles.

Include:

- Vietnam macro
- Vietnam banking
- irrelevant Vietnam lifestyle
- European HY
- Nordic HY
- syndicated loans
- Swedish property refinancing
- Finnish politics
- Finnish business
- global markets
- geopolitical shock
- VC rounds
- PE buyouts
- duplicated Reuters/FT/BBC coverage of same event
- low-quality filler
- long reads
- old but valuable analysis

Expected behavior should be asserted in tests.

---

# 57. Ranking test cases

Examples:

### Test A
A Vietnam banking article with moderate global importance should outrank an unrelated major US consumer-company article because of portfolio relevance.

### Test B
A globally critical event with importance 99 must remain in What Matters even with low portfolio relevance.

### Test C
Five stories about one geopolitical event must collapse to one story cluster.

### Test D
A Nordic refinancing story should gain relevance through High Yield and Secured Loan lenses.

### Test E
A liked article about Nordic refinancing should raise the score of a semantically similar future story.

### Test F
A “show fewer like this” action should lower future recommendations in matching learned dimensions.

### Test G
Manual article import should create a stronger learning signal than a heart.

### Test H
Old analysis may remain in Worth Reading while disappearing from breaking-news sections.

### Test I
The dashboard should not contain five Vietnam stories even if Vietnam is the strongest interest.

### Test J
Deep Vietnam feed may contain many Vietnam stories because the user explicitly opened that section.

---

# 58. Source adapter interface

Conceptual:

```ts
interface NewsSourceAdapter {
  sourceId: string

  fetchCandidates(params: {
    since: Date
    until?: Date
  }): Promise<RawNewsItem[]>

  normalize(item: RawNewsItem): Promise<NewsArticle>
}
```

Actual interface should fit codebase.

---

# 59. Morning Brief generation cadence

Potential later schedule:

- ingest overnight continuously or in batches;
- final morning run around morning local time;
- refresh during day as meaningful stories appear;
- preserve morning edition plus optional live updates.

For initial version, a manually triggered generation is enough.

Do not create cron complexity before ranking works.

---

# 60. Cost controls

Important:

- do basic normalization before LLM calls;
- eliminate exact duplicates before classification;
- batch operations where safe;
- classify once and cache;
- do not reclassify unchanged articles;
- use cheaper model for bulk classification;
- use stronger model only where useful;
- persist results;
- avoid repeatedly summarizing the same story.

---

# 61. Security

- respect existing authentication
- use existing Supabase security/RLS patterns
- never expose service-role keys to browser
- avoid leaking subscription cookies or credentials
- source integrations requiring credentials must remain server-side
- do not log sensitive tokens
- validate imported URLs
- protect against SSRF in URL import
- define allowed protocols
- enforce fetch timeouts and size limits
- sanitize rendered content

---

# 62. Observability

Create debug capability.

For each brief generation log or persist:

- candidate count
- deduplicated article count
- story cluster count
- classification errors
- ranking version
- selected story count
- section counts
- source distribution
- portfolio match counts
- estimated AI usage if easy
- generation duration

Do not log full paywalled article content unnecessarily.

---

# 63. Admin/debug page

Useful development-only panel:

```text
/morning-brief/debug
```

or protected internal route.

Show:

- latest candidates
- classifications
- scores
- score breakdown
- story clusters
- selected/non-selected reason
- learned preference profile
- recent feedback
- algorithm version

This is extremely valuable while tuning.

Protect it according to existing auth conventions.

---

# 64. UI design philosophy

Prefer:

- editorial
- calm
- readable
- spacious
- information-dense without terminal feel
- clear hierarchy
- strong typography
- compact badges
- subtle score/relevance context

Avoid:

- hundreds of tiny metrics
- excessive gradients
- overly “AI” branding
- noisy cards everywhere
- ticker overload
- unnecessary animations

The product should feel like:

> a personalized morning newspaper + investment intelligence dashboard.

---

# 65. Mobile

Mobile should preserve priority:

1. What Matters
2. personalized portfolio sections
3. Finland
4. markets
5. long reads

Cards stack vertically.

“Show more” routes should remain usable.

---

# 66. Empty states

If no strong stories exist:

> No high-confidence updates in this section this morning.

Do not fill the page with low-quality content merely to avoid empty space.

---

# 67. Failure states

If classification fails:

- preserve article;
- mark pending/error;
- retry later;
- do not crash entire brief.

If one source fails:

- rest of brief must still generate.

If AI fails:

- show previously classified/persisted results where possible.

---

# 68. Definition of done — algorithm MVP

Before real integrations, MVP algorithm is done when:

- 50–100 realistic mock articles can be ingested;
- duplicates cluster;
- classification structure works;
- scoring is deterministic;
- portfolio relevance works;
- section selectors work;
- What Matters chooses sensible diversity;
- feedback changes preference scores;
- imported article can affect preference learning;
- tests demonstrate expected ordering;
- score explanation is inspectable.

---

# 69. Definition of done — UI MVP

- Morning Brief route exists;
- navigation works;
- no unrelated feature regressed;
- dashboard sections render from mock/persisted data;
- story cards work;
- heart works;
- “Näytä lisää” works;
- library page or modal works at minimum;
- imported URL can be submitted;
- responsive layout;
- loading/empty/error states exist.

---

# 70. Definition of done — first live-source MVP

- at least one global source;
- at least one Finland source;
- at least one relevant investment/market source;
- articles normalize into same model;
- daily brief can be generated from actual recent items;
- links point to originals;
- no paywall bypass.

---

# 71. What NOT to do initially

Do not initially build:

- full browser extension
- 50 source integrations
- custom ML training
- fine-tuning
- live market terminal
- automated trading
- buy/sell recommendations
- sentiment trading signals
- complex portfolio NAV calculation
- perfect fund look-through
- mobile app rewrite
- large cron architecture
- email newsletter delivery
- social sharing
- collaborative accounts

First prove the ranking engine.

---

# 72. Implementation order

Recommended:

1. repository audit
2. isolated Morning Brief route/shell
3. data model
4. portfolio + explicit preference seed
5. mock dataset
6. deterministic scoring engine
7. story clustering
8. section selector
9. dashboard UI
10. feedback
11. learned profile
12. imported articles
13. embeddings
14. deep feeds
15. persisted daily brief
16. live source adapters
17. scheduled generation
18. tuning/observability

---

# 73. Codex workflow rules

For every Codex phase below:

1. inspect the existing repository first;
2. reuse established patterns;
3. do not rewrite unrelated code;
4. keep Morning Brief isolated;
5. do not alter existing env vars unless required;
6. if new env vars are needed, document them in `.env.example`;
7. preserve authentication model;
8. preserve database conventions;
9. write migrations rather than modifying production schema manually;
10. run existing tests/lint/typecheck/build;
11. add focused tests;
12. report exactly which files changed;
13. report any unresolved issue;
14. stop after the requested phase.

---

# 74. CODEX PROMPT 0 — Repository audit only

Copy this first.

```text
We are going to add a new isolated feature called “Morning Brief” to this existing Personal Assistant application.

IMPORTANT:
Do NOT implement the feature yet.
Do NOT change files unless absolutely necessary for inspection (prefer no changes).
Do NOT refactor unrelated code.
Do NOT touch existing golf-watch logic, existing cron behavior, notifications, authentication, dashboard features, integrations, or other modules.

Your task in this phase is ONLY to inspect the repository and produce an implementation map.

Please inspect:

1. Framework/version and routing architecture.
2. Current navigation/sidebar/header structure.
3. Existing page/layout/component conventions.
4. Authentication model.
5. Supabase/database setup and migration conventions.
6. Existing RLS/security conventions.
7. API route/server-action conventions.
8. Existing cron architecture.
9. Existing OpenAI/LLM integrations, if any.
10. Existing vector/embedding/pgvector support, if any.
11. Existing data-fetching libraries and patterns.
12. Existing test setup.
13. Existing lint/typecheck/build commands.
14. Existing design system/components.
15. Existing folder/module conventions.
16. Existing environment variable conventions.
17. Whether there are any existing generic “articles”, “feeds”, “news”, “preferences”, “portfolio” or “feedback” tables/types that should be reused instead of duplicated.

Then propose the safest architecture for Morning Brief.

The feature must ultimately contain:

- a new Morning Brief page;
- ranking engine;
- news normalization;
- story deduplication;
- article classification;
- portfolio relevance;
- user feedback/heart;
- learned preferences;
- article import;
- “Show more” deep feeds;
- a library of liked/imported articles;
- future source adapters;
- persistent daily briefs.

For now, return ONLY:

A. Repository architecture summary
B. Exact recommended Morning Brief file/folder placement
C. Exact new route(s)
D. Existing components/services to reuse
E. Proposed database tables/migrations
F. Risks of interfering with existing features
G. Proposed phased implementation plan
H. Commands you will use to verify each phase

Do not implement anything yet.
```

---

# 75. CODEX PROMPT 1 — Morning Brief shell

Use only after reviewing Prompt 0 output.

```text
Implement Phase 1 of the Morning Brief feature using the architecture you found in the repository audit.

Goal:
Create ONLY the isolated Morning Brief page shell and navigation entry.

Requirements:

1. Add a new route/page called “Morning Brief” using existing routing conventions.
2. Add it to the existing Personal Assistant navigation using the same visual/navigation patterns as other pages.
3. Do not redesign global navigation.
4. Do not modify unrelated page behavior.
5. Do not touch golf-watch logic, cron logic, notification logic or unrelated APIs.
6. Create a Morning Brief feature/module folder following existing conventions.
7. Build a lightweight placeholder page containing:
   - “Good morning”
   - date placeholder
   - “Today in 30 seconds”
   - “What Matters Today”
   - Vietnam / PYN Elite
   - Emerging & Frontier
   - Credit & High Yield
   - Finland
   - VC & Private Equity
   - World / Politics
   - Worth Reading
8. Each section except Today in 30 seconds should include a placeholder “Näytä lisää” action.
9. No real data fetching yet.
10. Reuse current design system/components.
11. Responsive desktop/mobile layout.
12. Add focused route/component tests if the project supports them.
13. Run lint, typecheck, tests and build as appropriate.

At the end report:
- files changed
- route created
- navigation change
- tests run and results
- any issue

STOP after this phase.
```

---

# 76. CODEX PROMPT 2 — Database/data-domain foundation

```text
Implement the Morning Brief data-domain foundation.

Before editing:
Re-read existing database/migration conventions and reuse them.

Do not integrate real news sources yet.
Do not implement cron yet.
Do not change unrelated tables.

Create the minimum clean schema needed for Morning Brief, adapting names to existing conventions.

We need support for:

1. news sources
2. normalized news articles
3. article classifications
4. story clusters
5. cluster/article membership
6. portfolio assets
7. portfolio exposures
8. explicit news preferences/watchlist
9. article feedback
10. imported articles
11. learned interest profiles/signals
12. article scores
13. daily briefs
14. daily brief items

Important requirements:

- use migrations;
- preserve current auth/user model;
- apply appropriate RLS based on existing project conventions;
- server-only source/raw content where appropriate;
- indexes for published_at, source, URLs, user, section, scores;
- unique canonical URLs where appropriate;
- JSON fields only where normalization is not worth extra complexity;
- include algorithm_version/classification_version fields where useful;
- timestamps;
- no sensitive source credentials in DB;
- prepare for embeddings but do not require pgvector unless the repository already supports it cleanly;
- if pgvector is not currently available, leave a clean future migration path.

Also create TypeScript domain types matching the schema.

Seed or configuration support must exist for these initial portfolio lenses:

- PYN Elite / Vietnam
- Evli Emerging Frontier
- European High Yield
- Nordic High Yield
- Evli Nordic Secured Loan

Do not invent current fund holdings. Only seed the broad portfolio relationships described in the product spec. Detailed holdings/country weights will be imported later.

Run migrations/tests/typecheck/build in the repository’s supported way.

Return:
- migration summary
- tables and major relationships
- RLS summary
- domain types
- tests/results
- anything that needs manual Supabase application

STOP after this phase.
```

---

# 77. CODEX PROMPT 3 — Explicit preference and portfolio profile

```text
Implement the initial Morning Brief user preference / portfolio profile layer.

Do not build AI classification yet.

Requirements:

Create a centralized, testable representation of explicit interests and portfolio lenses.

Initial priorities:

VERY HIGH:
- Vietnam / PYN Elite
- Evli Emerging Frontier

HIGH:
- European High Yield
- Nordic High Yield
- Evli Nordic Secured Loan
- Finnish business
- Finnish politics
- VC
- Private Equity
- markets/macro

MEDIUM/HIGH:
- global geopolitics
- world business
- technology when material

Create controlled taxonomy/enums/configuration for at least:

- finland_politics
- finland_business
- finland_economy
- global_politics
- geopolitics
- markets_macro
- rates
- fx
- commodities
- venture_capital
- private_equity
- emerging_markets
- frontier_markets
- emerging_frontier
- vietnam
- european_high_yield
- nordic_high_yield
- credit
- leveraged_finance
- syndicated_loans
- private_credit
- banking
- consumer
- property
- industrials
- energy
- shipping
- telecom

The portfolio graph must support causal relevance, e.g.:

ECB rates
→ European funding conditions
→ High Yield relevance

Swedish corporate refinancing
→ Nordic HY
→ potentially Nordic Secured Loan relevance

Vietnam banking/credit
→ PYN Elite relevance

Do not build a generic graph database.
Use simple typed relationships that can be scored deterministically.

Add unit tests showing that:
- Vietnam stories map strongly to PYN Elite.
- Vietnam banking is stronger than generic Vietnam lifestyle.
- European refinancing maps to European HY.
- Nordic refinancing maps to Nordic HY and can map to secured-loan relevance.
- generic US entertainment does not map to portfolio relevance.

Return file changes and tests.

STOP.
```

---

# 78. CODEX PROMPT 4 — Mock article corpus

```text
Create a realistic Morning Brief mock article corpus for algorithm development.

No live web/API calls yet.

Create at least 80 mock normalized articles spanning:

Vietnam:
- banking
- credit growth
- property
- FDI
- manufacturing
- VN-Index
- currency
- central bank
- regulation
- companies
- low-value lifestyle/noise

Emerging/frontier:
- index classification
- EM flows
- country macro
- currencies
- politics
- company news

Credit:
- European HY spreads
- Nordic HY
- issuance
- defaults
- refinancing
- rating actions
- Swedish property
- Norwegian energy/shipping
- leveraged loans
- syndicated loans
- private credit
- secured lending
- ECB/rates

Finland:
- politics
- taxation
- government
- economy
- listed companies
- M&A
- startups

VC/PE:
- meaningful European rounds
- small irrelevant rounds
- buyouts
- exits
- fundraising
- secondaries
- sponsor-backed refinancing

Global:
- Fed
- oil
- geopolitics
- major market shock
- ordinary low-value stories

Long reads:
- FT/Economist-style analysis metadata, but DO NOT copy real copyrighted text.

Duplicates:
Create multiple mock articles from different sources describing the same event so clustering can be tested.

Each mock article should include enough classification metadata to exercise scoring without AI.

Create helper utilities to load the corpus in tests/dev only.

Do not expose mock data in production unintentionally.

STOP after adding corpus + validation tests.
```

---

# 79. CODEX PROMPT 5 — Deterministic scoring engine v1/v2

```text
Implement the Morning Brief deterministic ranking engine.

Do not use an LLM to produce final ranking.

Create a pure/testable scoring module.

Required component scores, each normalized 0–100:

1. portfolioRelevance
2. learnedPreference
3. importanceScore
4. explicitInterest
5. freshnessScore
6. sourceFit
7. likedSimilarity
8. noveltyScore
9. explorationScore

Initial final formula:

finalScore =
  portfolioRelevance * 0.30 +
  learnedPreference  * 0.18 +
  importanceScore    * 0.18 +
  explicitInterest   * 0.10 +
  freshnessScore     * 0.08 +
  sourceFit           * 0.06 +
  likedSimilarity    * 0.05 +
  noveltyScore       * 0.03 +
  explorationScore   * 0.02

Put weights in centralized versioned config, not scattered magic numbers.

Importance formula:

importanceScore =
  significance * 0.35 +
  consequence * 0.30 +
  scope * 0.20 +
  corroboration * 0.15

Freshness:
Use exponential half-life by content type:
- breaking news: ~12–18h
- news: ~18–24h
- analysis: ~36h
- long read: ~72h

Major-event override:
importance >= 95 => mustConsider = true

Source fit:
topic/section-aware, configurable.

Return a score explanation object with every component and human-readable reasons.

Use the mock corpus.

Add extensive unit tests for:
- portfolio relevance dominating appropriate niche stories;
- globally critical story surviving low personal relevance;
- old breaking news decaying;
- old long-read retaining value;
- source fit;
- score boundaries;
- deterministic outputs;
- algorithm version stored/returned.

No UI changes in this phase except optional debug types.

STOP.
```

---

# 80. CODEX PROMPT 6 — Story deduplication and clustering

```text
Implement Morning Brief story deduplication / clustering.

Requirements:

Layer 1:
canonical URL duplicate detection.

Layer 2:
normalized/near-identical title detection.

Layer 3:
semantic similarity only if vector infrastructure already exists or can be introduced safely.
If not available, build a clean interface/fallback and use metadata/title/entity matching for now.

Layer 4:
event evidence:
- country overlap
- company/entity overlap
- eventType overlap
- topic overlap
- publication time window

Do not cluster solely on embedding similarity.

Create:
- cluster service
- primary article selection
- related source list
- sourceCount/corroboration input

Primary article selection should consider:
- source fit
- freshness
- completeness
- access
- content type
- direct reporting vs analysis where knowable

Add tests:
- Reuters/FT/BBC mock Fed articles cluster.
- unrelated Vietnam articles do not cluster just because both mention Vietnam.
- follow-up analysis can belong to same story while remaining marked as analysis.
- identical URLs cluster.
- translated/rewritten mock titles can cluster if event evidence is strong.

Wire corroboration into importance scoring.

STOP.
```

---

# 81. CODEX PROMPT 7 — Section selectors + diversity

```text
Implement dashboard and deep-feed selection.

Required dashboard sections:

- WHAT_MATTERS
- VIETNAM_PYN
- EMERGING_FRONTIER
- CREDIT_HIGH_YIELD
- FINLAND
- VC_PE
- WORLD_POLITICS
- WORTH_READING

Recommended dashboard limits:

WHAT_MATTERS: 5
VIETNAM_PYN: 2
EMERGING_FRONTIER: 2
CREDIT_HIGH_YIELD: 2
FINLAND: 2
VC_PE: 2
WORLD_POLITICS: 2
WORTH_READING: 3

Selection must operate on story clusters, not raw duplicate articles.

Implement a diversity-adjusted greedy selector.

Concept:

adjustedScore =
  finalScore
  - duplicateCountryPenalty
  - duplicateTopicPenalty
  - duplicateEventPenalty
  + underrepresentedSectionBonus

Use soft constraints, not hard quotas.

Low-quality filler must not be forced into a section.

What Matters should prefer diversity across:
- portfolio relevance
- major markets/global event
- Finland when important
- EM/frontier
- credit/VC/PE as warranted

Deep feeds are allowed to be much more concentrated.

Add tests proving:
- top 5 is not five Vietnam stories;
- top 5 is not five stories about same geopolitical event;
- globally critical story remains;
- strong portfolio story remains;
- no weak Finland filler is forced;
- Vietnam deep feed can contain many Vietnam items;
- credit deep feed is properly targeted.

STOP.
```

---

# 82. CODEX PROMPT 8 — Persisted brief generation

```text
Implement a Morning Brief generation service using the existing mock corpus/data pipeline.

Do not add live news sources yet.
Do not add cron yet.

Service should:

1. load candidate articles;
2. cluster duplicates;
3. compute scores;
4. select sections;
5. persist a daily_brief;
6. persist daily_brief_items with:
   - section
   - rank
   - score
   - score explanation
   - algorithm version
7. produce Today in 30 seconds from selected items using a deterministic placeholder or existing safe summarization utility for now.

Add a development-only/manual generation endpoint/action/button using existing server conventions.

Must be idempotent or safe for repeated generation of same date.
Preserve previous version/history if repository architecture supports it; otherwise explicitly define replacement behavior.

Add tests.

STOP.
```

---

# 83. CODEX PROMPT 9 — Morning Brief UI with real ranked mock/persisted data

```text
Replace Morning Brief page placeholders with actual persisted Morning Brief data.

Use the current application design system.

Main page:

Header:
- Good morning
- date
- updated time
- estimated read time if easy

Today in 30 seconds

What Matters Today:
- up to 5 cards

Then:
- Vietnam / PYN Elite
- Emerging & Frontier
- Credit & High Yield
- Finland
- VC & Private Equity
- World / Politics
- Worth Reading

Article/story card should support:

- headline
- source
- relative/absolute published time
- summary
- compact relevance tags
- “Why this matters” short explanation
- open original
- heart button placeholder/state wiring ready
- optional related source count
- clean loading/error/empty state

Add “Näytä lisää” on major sections.

Avoid fully duplicating a story card if it already appears in What Matters; use a compact reference or skip duplicate based on best UX.

Make responsive.

Do not add unnecessary charts or terminal-style widgets.

Run visual/component tests if available plus build/typecheck/lint.

STOP.
```

---

# 84. CODEX PROMPT 10 — Heart, negative feedback and learned profile

```text
Implement article feedback and learned preferences.

UI:

Heart:
♡ = not liked
♥ = liked

Overflow actions:
- Not relevant to me
- Show fewer like this
- Save / Unsave if straightforward

Backend:

Record feedback events using existing auth/user identity.
Do not trust user_id from client.

Initial signal strengths:

open: +0.20
like: +1.00
save: +1.20
not_relevant: -1.00
show_fewer_like_this: -2.00

Do not directly add these values to final article score.

Instead update learned preference dimensions based on article classification:

- country
- region
- sector
- topic
- event type
- asset class
- content type
- source (low weight)

Implement learned profile decay over time.

Portfolio preferences do not decay while holdings remain active.

Create a service that recomputes or incrementally updates learned_interest_profiles.

Use learned preference in the ranking engine.

Add tests:

- liking repeated Vietnam banking stories raises Vietnam/banking affinities;
- source affinity increases less than topic affinity;
- negative feedback lowers matching dimensions;
- old behavioral signals decay;
- explicit portfolio settings remain stable.

After feedback, either:
A. ranking changes on next brief generation; or
B. support an explicit re-rank action in development.
Do not unpredictably reorder the already-published brief in production unless designed intentionally.

STOP.
```

---

# 85. CODEX PROMPT 11 — Imported article + My Library

```text
Implement Morning Brief “+ Add article” and My Library.

Add UI:
- + Add article
- URL input
- submit
- processing state
- success/error state

Security:
- validate URL
- allow only http/https
- implement SSRF protections
- use server-side fetching
- timeout
- response size limit
- do not leak internal network
- do not bypass paywalls
- do not use browser subscription cookies automatically

Processing:

1. normalize URL
2. fetch permitted metadata/content
3. create/link normalized news article
4. classify using existing classification path or metadata fallback
5. mark IMPORT as strong positive signal (+2.00)
6. update learned preferences
7. create embedding if semantic layer is enabled
8. add to library

Library route:
- liked
- imported
- saved
- filters if easy

Manual import should be a stronger preference signal than heart.

Add tests for:
- safe URL validation
- blocked internal/private addresses
- import creates feedback signal
- duplicate imported URL does not create endless duplicate articles
- learned preferences update

STOP.
```

---

# 86. CODEX PROMPT 12 — Embeddings and semantic similarity

```text
Implement semantic similarity for Morning Brief if compatible with current infrastructure.

First inspect whether pgvector/vector storage already exists.

If yes:
reuse existing vector conventions.

If no:
add a minimal, reversible migration and server-side embedding service only if it is safe and consistent with current Supabase setup.

Requirements:

- create embeddings for normalized article text/metadata;
- do not embed huge raw copyrighted bodies unnecessarily;
- prefer title + excerpt + permitted summary/classification representation;
- cache embedding;
- store embedding model/version;
- compute similarity from new articles to liked/imported positive articles;
- weight imported articles stronger than simple likes;
- apply behavioral time decay;
- calculate `likedSimilarity` 0–100;
- plug into existing final ranking formula.

Do not use semantic similarity alone for deduplication.
Do not use semantic similarity alone to recommend.

Add tests/fakes around the vector layer so tests do not require live API calls.

STOP.
```

---

# 87. CODEX PROMPT 13 — Deep “Näytä lisää” pages

```text
Implement Morning Brief deep feeds for “Näytä lisää”.

Use route conventions established by the project.

Required deep sections:

- Vietnam / PYN Elite
- Emerging & Frontier
- Credit & High Yield
- Finland
- VC & Private Equity
- World / Politics
- Worth Reading

Each deep feed:
- loads ranked story clusters for section;
- supports 20–60 items/pagination or incremental loading;
- avoids raw duplicates;
- shows heart/feedback;
- shows source/time;
- shows why relevant;
- uses lower relevance threshold than dashboard;
- allows more topic concentration than What Matters;
- has loading/error/empty states.

Credit feed should optionally group/filter:
- European HY
- Nordic HY
- Refinancing
- Defaults/Distress
- Issuance
- Leveraged/Syndicated Loans
- Private Credit
- ECB/Rates

Vietnam feed should optionally group/filter:
- Markets
- Macro & Policy
- Banking
- Property
- Companies
- FDI / Manufacturing
- Long Reads

Do not build search yet unless trivial.

STOP.
```

---

# 88. CODEX PROMPT 14 — Structured AI classification

```text
Implement production-ready structured article classification.

Use the project’s existing OpenAI/LLM abstraction if present.
Do not create duplicate AI clients if one exists.

Use structured JSON/schema validation.

Classifier must output:

countries
regions
categories
topics
sectors
companies
people
assetClasses
funds
eventType
significance 0-100
consequence 0-100
scope 0-100
primarySection
portfolioLinks
summary
whyItMatters
confidence 0-100

Important:
- AI classifies; application code ranks.
- Validate/clamp all numeric fields.
- Version classifier.
- cache classification.
- do not reclassify unchanged content.
- retry transient failures safely.
- support fallback/pending state.
- never let one failed article crash whole brief.

Prompt context should include the controlled taxonomy and portfolio lenses but must not tell the model to directly rank stories.

Add unit/integration tests with mocked model outputs.

STOP.
```

---

# 89. CODEX PROMPT 15 — First real source adapter

```text
Implement ONE real news-source adapter as a vertical slice.

First choose the safest source already technically accessible in the project or through a documented public feed/API.

Do not scrape a paywall.
Do not bypass authentication.
Do not implement all sources.

Requirements:

- adapter fetches recent candidates;
- maps to normalized NewsArticle;
- deduplicates/upserts safely;
- respects source metadata;
- stores canonical URL;
- adds source attribution;
- runs classification;
- integrates with existing ranking pipeline;
- can generate a Morning Brief mixing the real source with mock data in development if needed.

Add rate-limit/error handling.

Document:
- source method
- terms/technical limitations
- env vars
- update frequency

STOP after one source works end-to-end.
```

---

# 90. CODEX PROMPT 16 — Source expansion plan, no uncontrolled scraping

```text
Now inspect the source-adapter architecture and propose the next integrations for:

- Yle
- Reuters
- Financial Times
- Kauppalehti
- Talouselämä
- BBC
- Economist
- Vietnam/frontier official sources
- market/index sources

IMPORTANT:
Do not implement paywall bypasses.
Do not assume the user’s personal web subscription allows automated scraping.

For each source determine:

- documented RSS/feed/API availability
- public metadata availability
- authentication requirements
- likely legal/technical constraints
- what fields we can reliably ingest
- recommended update frequency
- whether it should be:
  A. automated source
  B. link/metadata source
  C. manual import only
  D. deferred pending licensed access

Return a source integration matrix and recommended implementation order.

Do not mass-implement sources in this phase.
```

---

# 91. CODEX PROMPT 17 — Morning automation / cron

```text
Implement scheduled Morning Brief generation only after ranking and at least basic live ingestion are stable.

Reuse the repository’s current cron architecture rather than creating a separate scheduler if possible.

Requirements:

- Morning Brief jobs must be isolated from existing golf-watch cron logic.
- A failure in Morning Brief must not break golf-watch jobs.
- Avoid one giant cron endpoint.
- ingest candidates
- classify new items
- cluster
- score
- generate/persist daily brief
- idempotency
- retries
- logging
- local timezone behavior must be explicit
- document schedule and environment configuration

Add a manual trigger for development/admin if one does not already exist.

Run all existing cron tests and regression checks.

STOP.
```

---

# 92. CODEX PROMPT 18 — Debug/tuning dashboard

```text
Implement an authenticated Morning Brief debug/tuning view for development/admin use.

Show:

- latest candidates
- source
- classification
- cluster
- component scores
- final score
- selected/not selected
- section
- score explanation
- algorithm version
- recent feedback
- learned interest profile
- imported articles
- source distribution
- candidate/cluster/selected counts

Add controls only if safe:
- regenerate today's brief
- recompute scores
- inspect article
- inspect cluster

Do not expose sensitive credentials/raw secrets.

The debug view must not be available publicly.

STOP.
```

---

# 93. CODEX PROMPT 19 — Regression and quality pass

```text
Perform a Morning Brief quality/regression pass.

Do not add major new features.

Run:

- lint
- typecheck
- unit tests
- integration tests
- build
- existing app tests
- database migration checks

Specifically verify existing Personal Assistant functionality was not affected:
- navigation
- auth
- current dashboard pages
- golf watch
- existing cron jobs
- notifications
- existing APIs

Morning Brief verify:
- route
- mobile
- desktop
- brief generation
- score explainability
- deduplication
- heart
- negative feedback
- learned profile
- import
- library
- show-more feeds
- empty states
- errors
- source failure isolation

Then provide:

1. issues found
2. changes made
3. tests/results
4. remaining technical debt
5. recommended next 5 improvements in priority order

Do not refactor unrelated code merely for aesthetics.
```

---

# 94. Evaluation framework for later tuning

We should eventually measure ranking quality rather than tune by intuition.

Possible offline metrics:

- Top-5 acceptance rate
- heart rate by section
- “not relevant” rate
- open rate
- diversity
- duplicate leakage
- portfolio match precision
- major-event recall
- source concentration
- section fill quality

Potential human review question:

> If I could read only five items today, how many of the selected five would I genuinely want to know?

This may be the single best manual metric early on.

---

# 95. Recommender evolution

Long-term phases:

## v1
Explicit preferences + deterministic scoring.

## v2
Feedback-based topic/country/sector learning.

## v3
Embedding similarity.

## v4
Better causal portfolio relevance.

## v5
Context-aware ranking by time of day.

## v6
Personalized deep-reading recommendations.

## v7
Optional cross-day story tracking:

> What changed since yesterday?

Do not jump to v7 before v1–v3 work well.

---

# 96. Future feature: story evolution

Useful later:

A story cluster persists across days.

Example:

Day 1:
Vietnam announces policy.

Day 2:
Banks react.

Day 3:
Foreign flows increase.

Instead of treating every article independently, show:

> **Update:** What changed since yesterday?

This could materially improve the morning experience.

---

# 97. Future feature: portfolio holdings ingestion

Later add:

- PYN Elite holdings / public reports
- Evli Emerging Frontier country/company weights
- secured loan exposure if public information is available
- user-entered allocation weights

Then relevance can become exposure-aware.

Example:

```text
Portfolio relevance =
relationship strength
× portfolio weight
× event materiality
```

But initial ranking should not wait for perfect look-through data.

---

# 98. Future feature: configurable interests UI

Potential settings:

```text
Vietnam               10
Emerging/Frontier     10
Nordic Credit         10
European HY            9
Private Equity         9
VC                     9
Finland Business      10
Finland Politics       9
Global Markets         8
Geopolitics            7
Technology             6
```

User can override learned profile.

Explicit settings should have priority over inferred preferences.

---

# 99. Future feature: notifications

Not initially.

Later:

Only alert outside Morning Brief when:

- importance extremely high;
- portfolio relevance extremely high;
- major event changes materially;
- user explicitly watches topic.

Avoid turning Morning Brief into notification spam.

---

# 100. Product success criteria

Morning Brief succeeds if:

1. user reads it regularly;
2. top 5 usually feels correct;
3. portfolio-specific stories appear before generic noise;
4. major world events are not missed;
5. duplicates are rare;
6. likes measurably improve recommendations;
7. imported articles improve recommendation quality;
8. deep feeds provide more depth without cluttering dashboard;
9. existing Personal Assistant remains stable;
10. operating cost stays low.

---

# 101. First concrete build sequence

Start immediately with:

**Prompt 0 → audit**

Then:

**Prompt 1 → route/shell**

Then:

**Prompt 2 → data model**

Then:

**Prompt 3 → portfolio/preference graph**

Then:

**Prompt 4 → mock corpus**

Then:

**Prompt 5 → ranking**

Then:

**Prompt 6 → clustering**

Then:

**Prompt 7 → diversity/sections**

At that point pause and evaluate algorithm output before spending time on source integrations.

Only after ranking looks good:

Prompts 8–14.

Only after the product works with mock data:

Prompts 15–17.

Finally:

Prompts 18–19.

---

# 102. Important rule for all future work

**Do not optimize the source count before validating ranking quality.**

The important question is not:

> How many news sources can we ingest?

It is:

> Given 100 plausible stories, does the system consistently choose the 5–15 stories that this user actually values?

Everything else follows from that.

---

# 103. Immediate next action

Send **CODEX PROMPT 0 — Repository audit only** to Codex.

Do not allow Codex to implement code during Prompt 0.

Bring the audit result back for review.

Then adapt Prompt 1 to the repository’s actual structure if needed.

This reduces the chance of Morning Brief being built as a parallel mini-app or interfering with existing Personal Assistant functionality.

---

# End of master specification
