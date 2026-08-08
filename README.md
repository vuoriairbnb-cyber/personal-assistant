# Personal Assistant — Design System

Personal Assistant is a premium, modular personal productivity app: travel planning, calendar coordination, inbox follow-up, and AI-assisted admin work. The first shipping module is **Travel Planner** — it stores trip projects, ingests travel plans pasted from ChatGPT/Claude chats, structures them into operational plans (itinerary, lodging, transport), drafts emails to local operators, compares offers, and (later) connects calendar + email workflows.

**Sources used to build this system:** none were attached (no Figma file, no codebase, no decks). This design system was authored from scratch from the written brief only — visual direction, color/type choices, and all components below are original interpretations of that brief, not extracted from an existing product. If a Figma file, codebase, or brand guide exists, attach it and this system should be reconciled against it (see Caveats at the end of this file).

The product should feel like a **personal operating system + travel concierge + productivity workspace** — calm, spacious, structured around cards/saved outputs/approval workflows. Explicitly not a generic AI chatbot or AI-SaaS look: no neon, no cyberpunk, no heavy gradients.

---

## Content fundamentals

**Voice:** calm, competent, concierge-like — like a well-briefed personal assistant, not a chatbot. Confident but never chatty; efficient but never curt.

**Person:** second person ("you"/"your trip") for the user's own content; the assistant refers to itself minimally and avoids "I" where a structural statement works better ("Drafted for your review" rather than "I drafted this for you").

**Casing:** sentence case everywhere — headings, buttons, labels. Never title case, never all-caps except tiny uppercase micro-labels (badges, section eyebrows) which use letter-spacing to read as structure, not shouting.

**Tone examples:**
- Button: "Send to operator" (not "Send Email!" or "Let's go!")
- Empty state: "No trips yet. Paste a plan to get started." (direct, no filler enthusiasm)
- Confirmation: "Draft ready — review before sending." (states status, implies the approval gate)
- Error: "Couldn't reach Kyoto Rickshaw Tours. Try again or edit the email." (states fact + gives a next action)

**Approval-first framing:** copy should always make clear the assistant *proposes*, the user *approves*. Prefer "Review draft" / "Approve & send" / "Awaiting your review" over anything implying the system acted unilaterally.

**Emoji:** none. This is a premium, calm surface — emoji would read as informal/AI-generic.

**Numbers & dates:** always concrete and specific (real currency symbols, real dates) — a system built on real bookings should never feel vague.

---

## Visual foundations

**Color:** cool off-white/lavender canvas (`--surface-canvas`, `#F6F5FA`) with white cards (`--surface-card`, `#FFFFFF`). Text is a near-black violet-charcoal (`--text-primary`, `#151521`) — dark enough for strong contrast but not pure black. One confident violet accent (`--accent`, `#6D4CFF`) carries all primary actions, links and active nav state. Semantic status colors stay muted, not saturated: sage green for success, warm amber for warning, muted terracotta for danger/destructive — these are deliberately unchanged from the original palette since they're status colors, not part of the canvas/card/accent identity.

**Type:** three families, each with one clear job. `Newsreader` (serif) is the editorial/display voice — trip names, page titles, big numbers/amounts — it's what makes the product feel like a considered concierge document rather than a SaaS dashboard. `Manrope` (sans) is the UI workhorse — labels, body copy, buttons, nav. `IBM Plex Mono` is reserved for anything literal and precise — confirmation codes, dates in tables, reference numbers — never for prose. See "Font substitution" caveat below: these are Google Fonts stand-ins, not licensed brand fonts.

**Spacing:** 4px base scale (4/8/12/16/20/24/32/40/48/64/80/96). Cards use 20px internal padding by default; card-to-card gaps in a stack are 12px. Generous whitespace throughout — this is a spacious workspace, not a dense dashboard.

**Backgrounds:** flat color only. No photographic backgrounds, no full-bleed hero imagery, no illustration patterns, no textures, no gradients. The canvas is a cool off-white/lavender; content sits on white cards above it.

**Radius:** generously rounded, always soft — 8px on small controls (inputs, tags), 12px on buttons/mid controls, 20px on standard cards, 24px on modals/large surfaces, full pill on badges/switches/chips. Never sharp corners, never a tiny 2–4px "SaaS default" radius.

**Shadows:** soft and cool-violet-tinted (`rgba(25,20,60,…)`, never pure black) — a light lift, not a hard drop shadow. Four steps (xs/sm/md/lg) scale with elevation: list rows almost flat, cards a gentle lift, modals the most pronounced. A dedicated `--shadow-focus` ring (violet halo) marks keyboard/input focus — no harsh blue outline.

**Borders:** thin (1–1.5px) hairline borders in cool neutral tones (`--border-subtle`, `--border-default`) separate cards from the canvas even where shadow alone would suffice — this keeps edges crisp at low elevation. Borders darken to `--border-strong` (near-black violet-charcoal) only for interactive controls needing more definition (checkbox/radio outlines).

**Animation:** minimal and functional, never decorative. Standard ease (`cubic-bezier(0.4,0,0.2,1)`) at 120–200ms for hovers/toggles; a slightly springier ease-out for switches/reveals. No bouncing, no infinite loops, no attention-seeking motion — this is a calm, trustworthy surface.

**Hover states:** primary/secondary/danger buttons darken one step and lift 1px; ghost buttons and nav items gain a soft violet background fill (`--sand-200`, an accent-tinted fill despite the legacy token name); nothing changes size or shape on hover.

**Press/active states:** darken a further step (`--accent-active`, `--danger-strong` etc.) with no additional transform — presses read as "committed," not "bouncy."

**Corner radius & card anatomy:** the standard card = white fill (`--surface-card`) + 1px `--border-subtle` + `--shadow-sm` + 20px radius + 20px padding. This combination (fill + hairline border + soft shadow) is the system's signature — never fill-only or border-only.

**Transparency/blur:** used exactly once, intentionally — the modal scrim (`rgba(33,35,42,0.35)` + 2px blur) to focus attention on approval dialogs. Not used decoratively elsewhere.

**Imagery:** none supplied. If/when travel photography is added (destination shots, operator photos), it should read warm and natural-light — not cool/blue-toned, not heavily filtered, no harsh flash or stock-photo gloss. No sourced imagery exists in this system yet — see Iconography/Caveats.

**Layout rules:** desktop uses a fixed 260px left sidebar (nav) + fluid content area, max content width ~1120px so line lengths and card grids stay comfortable at wide viewports. Mobile drops the sidebar for a fixed 64px bottom tab bar; content becomes a single column.

---

## Iconography

No icon font, SVG sprite, or icon asset was supplied with the brief. This system uses **Lucide** (lucide.dev) as a CDN-linked substitute — flagged here as a substitution, not a brand decision. Lucide's icons are thin-stroke, geometric, and calm, which matches the "premium workspace, not chatbot" direction, but should be swapped for a real brand icon set if/when one exists.

Icons are consumed via the `Icon` component (`components/primitives/Icon.jsx`), which loads each glyph as a static SVG from `unpkg.com/lucide-static` and tints it to `currentColor` via a CSS mask — so icons always inherit whatever text color surrounds them (accent, success, warning, etc.) without needing per-color asset variants.

No emoji, no Unicode-glyph icons, no PNG icon sets are used anywhere in this system.

---

## Brand mark

**No logo file was supplied.** Per instructions, no logo has been drawn or approximated. Wherever a mark would normally sit (sidebar header, login screen, favicon), the system renders the wordmark "Personal **_Assistant_**" in `Newsreader` with the italic accent-colored second word — see `guidelines/brand-wordmark.html`. Replace with a real logo file the moment one exists.

---

## Components

All components live under `components/<group>/`, are plain-React (`.jsx` + sibling `.d.ts` + `.prompt.md`), and style themselves purely with the CSS custom properties in `tokens/`. No component library or codebase was supplied, so this is an **authored-from-scratch standard set**, sized to what Travel Planner's approval-based workflows need — not a copied inventory.

**Primitives** (`components/primitives/`): `Icon`, `Card`

**Forms** (`components/forms/`): `Button`, `IconButton`, `Input`, `Select`, `Checkbox`, `Radio`, `Switch`

**Feedback** (`components/feedback/`): `Badge`, `Tag`, `Tooltip`, `Toast`, `Dialog`

**Navigation** (`components/navigation/`): `Tabs`, `Sidebar`, `BottomTabs`

**Intentional additions** (components a from-scratch system needs that weren't explicitly requested):
- `Icon` — a thin wrapper needed to consume the Lucide substitution set consistently across every other component.
- `Dialog` — the brief's "approval-based workflows" concept needs a concrete confirm/cancel modal pattern; this is the load-bearing component for that idea (e.g. "Send email to operator?").
- `Badge` / `Tag` — trip and booking status (Draft/Confirmed/Awaiting reply) and lightweight categorization (Family/Business) are core to the described card-based dashboard.

---

## UI kit — Travel Planner

`ui_kits/travel-planner/` is a click-through recreation of the described product: a desktop dashboard (sidebar + trip cards) and the trip detail workspace (itinerary / offers / emails tabs, paste-a-plan flow, approve-and-send dialog), plus the mobile bottom-tab layout. It composes the components above — no primitives are reimplemented inside the kit.

Screens:
- **Dashboard** — trip list as cards, status badges, "New trip" paste flow
- **Trip workspace** — itinerary tab (structured line items), offers tab (radio comparison), emails tab (drafted message + approve & send dialog)
- **Mobile** — same trip workspace adapted to a single column with bottom tabs

---

## Index

- `styles.css` — root stylesheet; imports everything below. Link this one file from any consumer.
- `base.css` — minimal reset (body, headings, links)
- `tokens/colors.css` — palette + semantic surface/text/status tokens
- `tokens/typography.css` — font families, type scale, weights, line-height, tracking
- `tokens/spacing.css` — spacing scale, radius scale, layout constants (sidebar width, bottom-tab height)
- `tokens/effects.css` — shadows, border widths, easing/duration
- `tokens/fonts.css` — Google Fonts `@import` (Newsreader, Manrope, IBM Plex Mono — substitutes, see caveat)
- `guidelines/` — foundation specimen cards (colors, type, spacing, shadows, radii, card anatomy, brand wordmark)
- `components/primitives/` — Icon, Card
- `components/forms/` — Button, IconButton, Input, Select, Checkbox, Radio, Switch
- `components/feedback/` — Badge, Tag, Tooltip, Toast, Dialog
- `components/navigation/` — Tabs, Sidebar, BottomTabs
- `ui_kits/travel-planner/` — full click-through product recreation
- `SKILL.md` — portable skill definition for Claude Code / other agents

---

## Caveats — please help me iterate

- **No source materials were attached** — no Figma, no codebase, no decks, no existing brand guide. Every color, type choice, spacing value, and component here is my own interpretation of the written brief, not extracted from something real. If Personal Assistant has an existing brand (even partial — a logo, a color you already use, a font license), attach it and I'll reconcile this system against it.
- **Fonts are Google Fonts substitutes**, not licensed brand fonts: `Newsreader` (display/serif), `Manrope` (UI/body), `IBM Plex Mono` (data/mono). If you have real brand fonts, send the files and I'll swap `tokens/fonts.css` to self-hosted `@font-face` rules.
- **No logo exists in this system** — a plain wordmark stands in everywhere a mark would go. Send a logo file when you have one.
- **Icons are Lucide (CDN)**, not a brand-specific set — flagged as substitution.
- **Component inventory is a from-scratch standard set** sized to the brief, not derived from an existing library — tell me if something's missing or overbuilt.

**Bold ask:** tell me if the calm/sand/muted-blue direction actually feels right for Personal Assistant, or if you want me to explore a colder/more neutral alternative (e.g. slate + navy, less "warm concierge" and more "operating system"). I can spin up 2–3 palette/type variations fast if you want to compare before this hardens into the system of record.
