PROJECT: Tremor. Microfinance group-contagion risk operator dashboard.
Reference class: Palantir/Blueprint command-center design + Linear's
"product is the hero" instinct. NOT consumer SaaS, NOT a landing page,
NOT airy gradient marketing. Dark surface only, no light mode.

FIRST SCREEN RULE
- First render is the graph, already at rest or running.
- No hero section, no headline-plus-CTA pattern, no marketing copy anywhere.

SCREENS THAT EXIST — nothing else
- Primary diagnostic screen (graph + scrubber + detail rail + scenario chips + table)
- Evidence export view (slide-over or panel state, not a separate marketing route)
No login, no settings, no about page, no marketing page.

LAYOUT
- 12-column grid, 24px gutter, full-bleed (no centered marketing column).
- Graph canvas : detail rail = 62% : 38%, not 50/50 — required asymmetry.
- z-index: 0 page, 10 panels, 20 sticky headers, 30 popovers, 40 tooltips,
  50 toasts/floating badges, 60 modals/slide-overs. Nothing outside this list.

FORBIDDEN, NO EXCEPTIONS
- Gradient backgrounds anywhere, on any surface.
- Inter (or any grotesque sans) as a display/heading face.
- Icons in groups of three as decorative feature cards.
- Any stock photography, illustration, or non-product imagery.
- Any UI copy that doesn't name a concrete object — never bare "Dashboard,"
  "Overview," or "Insights" as a label.
- shadow-lg or any drop shadow below panel elevation — use surface steps.
- Rounded corners above 10px except 999px status pills.
- Arbitrary spacing/color values outside the token list below.
- outline:none without an explicit replacement focus style.
- Animating width/height/top/left — transform and opacity only.
- Any looping/pulsing/breathing/floating idle animation.
- Components with only a happy-path state — all four states are required.
- Proportional (non-tabular) numerals anywhere a number appears.
- Banned words anywhere in UI copy: revolutionary, seamless, cutting-edge,
  leverage, empower, holistic, game-changing, unlock, transform, powerful,
  intuitive, next-generation, bare "insights", robust.
- Colour used as the only signal for stress type — always pair with the
  fixed shape glyph (circle=idiosyncratic, triangle=induced, square=covariate).
- More than the exhaustive icon set: play, pause, step-back, step-forward,
  reset-view, zoom-in, zoom-out, sort-asc, sort-desc, close, export,
  expand/collapse, warning. No default icon library pulled in wholesale.

TOKENS
  Color surfaces: #0B0D12 / #12151D / #1A1F2B / #1A1F2B (surface-3 #232939)
    hairline border #242B3A (1px only, never 2px)
  Ink: #EAEDF5 primary / #A7AFC2 secondary / #6C7689 tertiary-label-only
  Stress semantics (meaning only, never decorative):
    idiosyncratic #E8C468 (circle)  induced #E05A6B (triangle)
    covariate #4FA8D8 (square)
  Signal (positive) #7BE0B0   Focus ring #8B7CFF (focus/selection only)
  Type: display NOT Inter (Instrument Serif/Bricolage Grotesque/Geist/
    Departure Mono) · body Inter/Geist Sans · ALL numerals monospace
    tabular-figure (JetBrains/Geist/IBM Plex Mono)
  Sizes 48 32 24 18 16 14 12 11 — weights 400 500 700 only
  Space 4 8 12 16 24 32 48 64 96 — nothing else
  Radius: 4 controls / 10 panels / 999 pills / 0 tables+canvas
  Density: table rows 32px, panel padding 16 — default dense not airy

COPY / NUMBER FORMATTING
  Week labels: "Week 12" in prose, "WK12" in compact badges — no other variant.
  Any abbreviation must appear in full at least once on the same screen.
  Percentages: always one decimal, symbol adjacent, no space — "68.0%".
  Rupees: ₹ symbol, Indian comma grouping, full figure in primary displays.
  Confidence intervals: "±N" immediately after the value, ink-1 color.
  Empty/error copy always states what's wrong/missing AND the next action —
  never a bare "No data" or "Something went wrong."

MOTION
  120ms hover/focus · 180ms panel/tooltip · 280ms view change
  400ms node state change, 12ms stagger per node along propagation order
  ~600ms/week cascade playback, linear easing, constant rate
  500ms ease-out number counters, on value change only, never on load
  0ms scrubber-drag-to-redraw — no lag between drag and dependent visuals
  Honor prefers-reduced-motion: cascade becomes instant state change, no stagger
  Nothing loops, ever. One signature motion moment only: the cascade.

REQUIRED ON EVERY DATA COMPONENT
  Four explicit states: loading (skeleton, same dimensions, no shimmer),
  loaded, empty (states what's missing + next action), error (states what
  broke, offers retry where applicable).
  Keyboard reachable end to end, visible focus ring using --focus.
  Colour never the only signal — pair with shape (Part 5 of the source doc)
  or a text label.

STATE
  Selected borrower, current week, and active scenario live in the URL query
  string. A reload must restore the exact same view.

ACCESSIBILITY
  4.5:1 contrast on body text, 3:1 on large text/interactive boundaries —
  measured against the actual token values, not eyeballed.
  Scrubber: space=play/pause, arrows=step, home/end=jump to bounds.
  Every icon-only button has an aria-label. The graph has a text-equivalent
  via the always-reachable data table.

PERFORMANCE
  LCP <1.5s throttled · JS gzipped <250KB · graph 60fps at 300+ nodes ·
  scrubber-to-repaint <100ms · Monte Carlo 200 runs <400ms (Web Worker if
  needed) · CLS <0.1. Canvas rendering for the graph, not per-node DOM/SVG.
  Memoize simulation output by seed+week. Virtualize tables over ~100 rows.

BUILD ORDER — do not skip ahead; each step must be demoable before the next
  1. Tokens + static shell layout
  2. Static graph at week 0, selectable, correctly grouped and colored
  3. Scrubber wired to graph with cascade stagger animation
  4. Detail rail, all four states, empty state as default view
  5. Attribution stacked bar + Monte Carlo confidence chart
  6. Scenario injection chips + intervention simulator
  7. Data table (Ward Exposure Matrix / Borrower Ledger), all four states
  8. Full Part 13 checklist polish pass

WHEN YOU FINISH A TASK
  - State what you did NOT do and what you're unsure about.
  - If you duplicated any logic or component, say so explicitly.
  - Never claim something works — show a browser artifact/screenshot of it
    actually working.

FIVE-MINUTE TEST BEFORE ANYTHING SHIPS
  Cover the product name. Read the screen. If the layout, copy, or color
  choice would be unchanged on a competitor's submission, it fails — revise.
