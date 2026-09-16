PROJECT: Tremor. Microfinance group-contagion risk tool. Demo build.
ARCHITECTURE
- Static client-side app. No backend, no database, no auth, no API keys.
- Simulation is pure TypeScript with a seeded RNG. Same seed, same output.
- Simulation layer has zero imports from the UI layer. One-way dependency.
- One module owns the stress calculation. Never reimplement it elsewhere.
FORBIDDEN, NO EXCEPTIONS
- innerHTML, dangerouslySetInnerHTML, eval, new Function
- Empty catch blocks. Every catch logs and then rethrows or returns a typed error. Never swallow.
- Arbitrary Tailwind values: no p-[13px], no #hex outside the token file.
- Any new npm dependency without me approving it first.
- localStorage or sessionStorage for anything the demo depends on.
- Copy-pasting a component. If it appears twice, extract it.
- outline:none without an explicit replacement focus style.
- Animating width, height, top or left. transform and opacity only.
- Loading, pulsing, breathing or floating ambient animation.
- Icons in groups of three. Three equal feature cards.
- Any string in the UI that does not name a concrete object.
REQUIRED ON EVERY DATA COMPONENT
- Four states: loaded, loading (skeleton at the same dimensions), empty (with what to do next), error (with what went wrong).
- Keyboard reachable, visible focus ring, 4.5:1 text contrast.
- Colour never the sole carrier of meaning.
TOKENS
- Space: 4 8 12 16 24 32 48 64 96. Nothing else.
- Radius: 4 controls, 10 panels, 999 pills. One per layer.
- Type sizes: 48 32 24 18 16 14 12 11. Weights 400 500 700 only.
- All numerals use the monospace face with tabular figures.
- Three semantic colours only: idio, induced, covariate. They are never used decoratively.
MOTION
- 120ms hover, 180ms panel, 280ms view, 400ms node state.
- Cascade nodes stagger 12ms along the propagation path.
- Honour prefers-reduced-motion everywhere.
STATE
- Selected borrower, current week and scenario live in the URL query string. A reload must restore the exact view.
WHEN YOU FINISH A TASK
- Report what you did NOT do and what you are unsure about.
- If you duplicated logic anywhere, say so explicitly.
- Do not claim something works. Show a browser artifact of it working.
