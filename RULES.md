# TREMOR — Design Rules for Antigravity (v2, full rebuild spec)

Paste this entire file into Antigravity as a rules/brain file before generating or regenerating any code. It supersedes v1 in full — v1 defined tokens and told the agent what to avoid; v2 additionally defines every screen, every component's anatomy and states, copy rules, iconography, and accessibility in enough detail that two different builds of this file should converge on the same product.

---

## PART 0 — Critique of v1, and what changes here

Re-reading v1 against your actual screenshot and against what "rebuild the whole prototype" requires, six real gaps:

1. **No information architecture.** v1 gave tokens and forbade patterns but never specified *what screens exist and what goes where*. An agent with tokens but no layout spec will still invent its own composition. Fixed in Part 2.
2. **No component-level detail.** "The graph" and "the attribution panel" were named but never specified — no anatomy, no states, no interaction spec. The screenshot already shows real components (scrubber with play/pause/speed, scenario injection chips, a sortable ward exposure table, a confidence distribution mini-chart) that v1 never described, so a rebuild would silently regress them. Fixed in Part 4.
3. **No iconography or shape system**, despite v1's own rule that "colour is never the only signal." Rule stated, mechanism never supplied. Fixed in Part 5.
4. **No copy/voice system.** v1 banned Inter-as-display and gradients but said nothing about *how Tremor's own sentences should sound*, number formatting, or label conventions — and the screenshot already has inconsistent casing and abbreviation (`WGD`, `WK12`, `W34` vs `Week 12`). Fixed in Part 6.
5. **No z-index, elevation, or overlay system** — tooltips, toasts, and modals were never addressed, and the screenshot shows a floating badge ("MEDIA SUPPRESSED") that needs a defined layer. Fixed in Part 3 and Part 4.7.
6. **No build order.** A rebuild needs a sequence so partial progress is still a coherent, demoable product at every checkpoint, not a pile of unfinished components. Fixed in Part 9.

Everything from v1 that held up — the token values, the sixteen tells, the Palantir/Linear reference framing, the motion durations — carries forward unchanged, tightened where noted.

---

## PART 1 — Product frame (unchanged, load-bearing)

Tremor is an **operator tool**, not a marketing site: a loan officer or risk manager scanning hundreds of borrowers under time pressure. Reference class is Palantir/Blueprint command-center design plus Linear's "the product is the hero" instinct — not Cluely-style consumer gradient marketing, not a SaaS landing page. **The first thing rendered is the graph, already at rest or running. There is no hero section, no headline-plus-CTA, anywhere in the product.**

Dark surface only. No light mode. A risk product read in a branch office or on a conference-room screen does not need a light theme, and building one doubles the token surface for zero benefit to this deadline. If asked for light mode later, that is a v3 decision, not a default to hedge toward now.

---

## PART 2 — Information architecture and screen layout

### 2.1 Screen inventory
Only these screens exist. Do not let the agent add a settings page, a login screen, a marketing page, or an "about" page — none are scored and each is surface area for drift.

| Screen | Purpose | Entry |
|---|---|---|
| **Diagnostic (primary)** | The whole demo lives here: graph, scrubber, attribution rail, scenario injections, ward table | Default route `/` |
| **Evidence export view** | Renders the JSON evidence trail for one borrower as readable text, for the "export evidence trail" action | `/evidence/:borrowerId` or a slide-over, not a separate route if time is short |

That's it. Two screens, one of which may just be a panel state of the first.

### 2.2 Primary screen composition (matches and formalizes your current build)
Fixed layout, no scrolling on the primary viewport above 1024px width:

```
┌─────────────────────────────────────────────────────────────────┐
│ TOP BAR: wordmark · breadcrumb · portfolio meta · seed · export  │  56px
├───────────────────────────────────────┬───────────────────────┤
│ SCRUBBER: week label/date · play controls · speed · timeline    │  64px
├───────────────────────────────────────┼───────────────────────┤
│                                        │  BORROWER DETAIL RAIL  │
│         GRAPH CANVAS                  │  (attribution, stress, │
│         (~62% width)                  │   confidence, signals) │
│                                        │  (~38% width)          │
├───────────────────────────────────────┴───────────────────────┤
│ SCENARIO INJECTION CHIPS (bottom, horizontal)                   │  44px
├──────────────────────────────────────────────────────────────┤
│ TABS: Ward Exposure Matrix | Borrower Ledger Table               │  36px
│ DATA TABLE (collapsible, scrolls independently)                  │  variable
└──────────────────────────────────────────────────────────────┘
```

- Graph canvas is **62/38 split** with the detail rail, not 50/50 — this is the one deliberate asymmetry required by v1 and it must survive the rebuild.
- The bottom data table region is collapsible (your screenshot already has this — keep it) so the graph can take the full vertical height when a judge wants to watch a cascade uninterrupted.
- Nothing above this fold is decorative. Every pixel of vertical space in the top bar and scrubber carries live data (seed value, portfolio size, current date), never a logo lockup with empty space around it.

### 2.3 Grid
12-column grid, 24px gutter, content max-width unconstrained (this is a full-bleed operator tool, not a centered marketing column). Panels snap to the 8px spacing scale, never to arbitrary fractions.

### 2.4 Z-index / layering system
```
0    base page
10   panel surfaces (graph canvas, detail rail, table)
20   sticky headers (top bar, scrubber, table header on scroll)
30   dropdowns, popovers, the intervention picker menu
40   tooltips
50   toasts / inline status badges that float over content (e.g. "MEDIA SUPPRESSED")
60   modals / slide-overs (evidence export view, if built as an overlay)
```
No component reaches for an arbitrary z-index outside this list. This is what stops tooltips clipping under panels and the export slide-over fighting with the toast layer.

---

## PART 3 — Design tokens (carried from v1, extended)

```
COLOR

--surface-0   #0B0D12    page background
--surface-1   #12151D    panels, cards, the graph canvas background
--surface-2   #1A1F2B    raised / hover / active row
--surface-3   #232939    popovers, dropdown menus, tooltips (one step above panels)
--hairline    #242B3A    1px borders, dividers — never 2px, never a shadow substitute

--ink-0       #EAEDF5    primary text, primary numerals
--ink-1       #A7AFC2    secondary text, table body
--ink-2       #6C7689    tertiary — labels, timestamps, captions. NEVER body copy.

STRESS SEMANTICS — the only three accents that carry meaning. Never decorative.
--idio        #E8C468    idiosyncratic (amber)
--induced     #E05A6B    induced / transmitted (red)
--covariate   #4FA8D8    covariate / area-wide (blue)

--signal      #7BE0B0    positive — recovered, prevented, success, "escalated: no"
--warn        #E8C468    reuse --idio for warning-level status (do not add a 4th hue)
--danger      #E05A6B    reuse --induced for destructive/critical status
--focus       #8B7CFF    focus ring and text-selection ONLY — never a button, never a brand mark

OPACITY SCALE (for disabled/muted states — do not invent other values)
--op-disabled   0.4
--op-muted      0.65
--op-hover-fill 0.08   (a colored background tint on hover, e.g. accent color at 8%)

ELEVATION
No drop shadows. Elevation = surface step (surface-0 → 1 → 2 → 3) plus, at most,
one hairline border. The single exception carried from Palantir: a top-bar or
modal may use rgba(0,0,0,0.1) 0px 2px 10px 0px and nothing stronger, nowhere else.

TYPE — unchanged from v1, restated for completeness
Display: NOT Inter. Instrument Serif / Bricolage Grotesque / Geist / Departure Mono.
Body: Inter or Geist Sans.
ALL numerals: monospace tabular-figure face (JetBrains Mono / Geist Mono / IBM Plex Mono) —
  every stress score, percentage, week number, rupee figure, confidence interval,
  and table cell, without exception.
Sizes: 48 32 24 18 16 14 12 11 — nothing else.
Weights: 400 500 700 — nothing else.
Line height: 1.15 above 24px, 1.55 at or below.

SPACE: 4 8 12 16 24 32 48 64 96 — nothing else, ever.

RADIUS
  4    controls: buttons, inputs, chips, badges
  10   panels: the detail rail, popovers, cards
  999  pills only: status badges (e.g. "6.3%" confidence chip)
  0    data tables, the graph canvas, the scrubber track

BORDERS: 1px hairline only, --hairline color, never 2px, never colored unless
  showing a selected/active state (then use the relevant accent at full opacity).

DENSITY: table rows 32px, not 56px. Panel padding 16, not 32. Default dense.
```

---

## PART 4 — Component library (the part v1 was missing entirely)

### 4.1 Top bar
- **Anatomy:** wordmark (small, left, never a large logo lockup) · breadcrumb text naming the current diagnostic (e.g. "Group-Contagion Diagnostic") · portfolio meta as plain text, not badges ("Mumbai Central & Suburban · 4 wards · 24 centres · 425 borrowers") · right-aligned: seed value (monospace, labeled "PROC SEED"), export button.
- **States:** static. No loading state needed — this bar renders from the already-loaded portfolio header.
- **Behavior:** none interactive except the export button (see 4.6).

### 4.2 Scrubber / timeline
- **Anatomy:** current week label in display type ("Week 12") with the calendar date in ink-1 beneath it · play/pause · step-back/step-forward · speed toggle (1x/2x/4x, a segmented control not a dropdown) · horizontal timeline track spanning the full width, with a draggable playhead · a secondary marker row above the track showing injected-shock icons at the week they occurred.
- **States:** `paused` (default) / `playing` (playhead advances automatically, controls reflect play state) / `dragging` (all dependent visuals — graph, rail, table — update live under 100ms per v1's performance budget, not only on drag release).
- **Behavior:** keyboard: space toggles play/pause, arrow keys step one week, home/end jump to week 0 / week 78. The current week is reflected in the URL query string per v1's state rule.

### 4.3 Graph canvas
- **Anatomy:** canvas-rendered force-directed layout of borrower nodes, grouped visually into cluster rings by JLG/centre. A top-left legend row states the three stress colors as text-plus-swatch (`Idiosyncratic (●)`, `Induced (▲)`, `Covariate (■)`). A "reset view" control top-left. Zoom/pan supported (scroll to zoom, drag to pan) with a visible reset affordance once panned.
- **States:**
  - `loading`: skeleton — a static, faded node field at the same canvas dimensions, no shimmer animation.
  - `loaded/running`: full interactive canvas per the cascade motion spec (Part 7).
  - `empty`: centered message naming what filter caused it and a control to clear it.
  - `error`: canvas failed to initialize — show a plain-text fallback table of the same data, never a blank panel.
- **Behavior:** click a node to select it · hover shows lightweight tooltip (name, group, current stress) · selected node gets a persistent ring in `--focus`, not a color change.
- **Node encoding (colorblind-safe, ties to Part 5):** fill color = dominant stress type · size = stress magnitude · shape glyph inside or adjacent reinforces the dominant type (circle=idiosyncratic, triangle=induced, square=covariate).

### 4.4 Borrower detail / attribution rail
- **Anatomy, top to bottom:**
  1. Identity block: avatar-style initials chip, name, borrower ID, group/cycle metadata
  2. Latent stress exposure — one large monospace percentage, with an evidence-quality badge when relevant
  3. Causal attribution decomposition — a single horizontal stacked bar (three segments, the three accent colors) with percentage and confidence range labeled per segment
  4. Monte Carlo confidence distribution — a small inline density/bell curve chart, labeled with its range
  5. Signal contributions — a ranked list of the eight signals (Part 4.5) with a numeric contribution value each, sorted by magnitude, tabular numerals right-aligned, thin inline bar using `--ink-2` as bar fill (never accent color)
  6. Primary action: "Simulate Intervention Trajectory" button, full-width, bottom of rail
- **States:**
  - `empty` (no borrower selected): text only: "Select a borrower on the graph to see their attribution," in ink-1, centered, no icon.
  - `loading`: skeleton blocks matching each section's exact dimensions, no shimmer.
  - `loaded`: as above.
  - `error`: attribution computation failed — show which step failed, offer retry.
- **Behavior:** stacked bar segments individually hoverable. Signal values always visible.

### 4.5 Signal contribution rows
- **Anatomy:** label (left, ink-1) · numeric contribution (right, tabular monospace, signed — e.g. "+2.3%", "+1.4%") · thin inline bar beneath showing relative magnitude, using `--ink-2` as bar fill, never an accent color.
- All eight signals named in full or clearly labeled abbreviation on first appearance.

### 4.6 Buttons
Three variants only:
- **Primary** — solid `--surface-2` fill, `--ink-0` text, used once per screen for primary action ("Simulate Intervention Trajectory," "Export Evidence Trail").
- **Secondary** — hairline border, transparent fill, `--ink-1` text.
- **Ghost/icon-only** — no border, no fill, `--ink-1` icon, `--ink-0` on hover.
All three: 120ms hover transition, visible focus ring in `--focus`, disabled state at `--op-disabled` with `cursor: not-allowed`.

### 4.7 Chips, badges, and pills
- **Scenario injection chips**: pill radius (999), hairline border, ink-1 text default, active state border matches accent, never solid accent fill.
- **Status badges**: week references always "Week 12" in prose, "WK12" in compact badges. Badge = pill radius, `--surface-2` fill, `--ink-1` text, monospace if it contains a number.
- **Floating status badges**: z-index 50, `--surface-3` background, hairline border.

### 4.8 Data table (Ward Exposure Matrix / Borrower Ledger)
- **Anatomy:** sticky header row (z-index 20), sortable columns with directional glyph, row height 32px, tabular monospace for numeric columns, row hover = `--surface-2`.
- **States:** `loading` (32px skeleton rows, no shimmer), `empty` ("No wards match the current filter"), `error` (plain text, never blank).
- **Behavior:** "Sortable · Click row to focus" caption above table.

### 4.9 Tooltips and popovers
- Collision-aware positioning, never clips off-viewport.
- z-index 40, `--surface-3` background, hairline border, 8px padding, 180ms panel-open.

### 4.10 Toasts
- Transient confirmations, z-index 50, bottom-right, auto-dismiss ~4s, non-modal.

---

## PART 5 — Iconography and shape system

- **Idiosyncratic** → circle node / single-dot glyph (●)
- **Induced** → triangle node / connected-arrow glyph (▲)
- **Covariate** → square node / grid glyph (■)

Apply pairing everywhere: graph nodes, attribution stacked bar segments, legend, table.
Exhaustive functional icon set: play, pause, step-back, step-forward, reset-view, zoom-in, zoom-out, sort-asc, sort-desc, close, export, expand/collapse, warning. Single consistent stroke width, no mixed styles.

---

## PART 6 — Copy, voice, and number formatting

### 6.1 Voice
Plain, declarative, operator-facing.
**Banned words:** revolutionary, seamless, cutting-edge, leverage, empower, holistic, game-changing, unlock, transform, powerful, intuitive, next-generation, bare "insights", robust.

### 6.2 Labeling conventions
- Week references: always **"Week 12"** in prose/headers; **"WK12"** in compact badges.
- Any abbreviation must appear in full at least once on the same screen.
- Percentages: always one decimal, symbol adjacent, no space — `68.0%`.
- Rupees: `₹` symbol, Indian comma grouping (₹2,40,000).
- Confidence intervals: `±N` immediately after the value, ink-1 color.
- Empty/error copy: states what is missing/wrong AND next action.

---

## PART 7 — Motion

```
Hover, focus, color change       120ms   cubic-bezier(.2,0,.4,1)
Panel open / tooltip             180ms   cubic-bezier(.16,1,.3,1)
Route / view change               280ms   cubic-bezier(.16,1,.3,1)
Graph node state change           400ms   ease-out, staggered 12ms/node along propagation path
Cascade playback                  ~600ms per simulated week, linear, constant rate
Number counters                   500ms   ease-out, on value change only
Table row hover                   120ms   background color only
Scrubber drag                     0ms     live updates without lag
```
- 12ms propagation stagger node-by-node.
- `transform` and `opacity` only.
- Nothing loops.
- `prefers-reduced-motion` supported (instant state change, no stagger).

---

## PART 8 — Accessibility

- Full keyboard path: top bar → scrubber → graph → detail rail → scenario chips → table. Focus ring `--focus`.
- Scrubber: space = play/pause, arrows = step, home/end = jump.
- 4.5:1 contrast on body text, 3:1 on large text/interactive boundaries.
- Color + shape pairing everywhere.
- Text-equivalent data table always reachable.
- `prefers-reduced-motion` honored.

---

## PART 9 — Zero imagery policy

No stock photography, no illustration, no generic icon art. Visuals: graph, confidence distribution chart, stacked attribution bar, hand-picked shape/icon set.

---

## PART 10 — Performance budget

- LCP < 1.5s throttled
- Total JS gzipped < 250KB
- Graph render 300+ nodes sustained 60fps
- Scrubber drag to repaint < 100ms
- Monte Carlo 200 runs < 400ms
- CLS < 0.1

---

## PART 11 — Responsive behavior

- Test at 380px width: graph canvas and detail rail stack vertically below ~1024px.
- Wide content scrolls inside itself; page body never scrolls sideways.

---

## PART 12 — Build order

1. **Tokens + shell layout** (Part 3 tokens, layout grid Part 2.2, top bar and scrubber chrome).
2. **Graph, static** (canvas renders full node set at week 0, grouped, colored, selectable).
3. **Scrubber wired to graph** with cascade stagger animation.
4. **Detail rail**, all four states, empty state as default view.
5. **Attribution stacked bar + Monte Carlo confidence chart**.
6. **Scenario injection chips + intervention simulator**.
7. **Data table** (Ward Exposure Matrix / Borrower Ledger), all four states.
8. **Polish pass** against Part 13 checklist.
