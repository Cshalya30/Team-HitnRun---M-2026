# Tremor · Microfinance Group-Contagion Risk Diagnostic

> **Synthetic Data Declaration**: All data rendered in Tremor is 100% synthetically generated via a deterministic pseudo-random generator (`mulberry32`). No real personally identifiable information (PII), borrower records, or proprietary financial histories exist anywhere in this repository or its client bundles.

Tremor is a group-level contagion risk diagnostic tool for microfinance institutions (MFIs) operating joint-liability groups (JLGs). It separates a borrower's own financial distress (idiosyncratic shock) from distress transmitted to her by peers through group mutual guarantee edges (induced contagion) or ward-wide macroeconomic shocks (covariate), presenting loan officers and branch managers with actionable causal attribution.

---

## Explicitly Out of Scope

As mandated in the specification:
1. **No credit scoring or underwriting**: Tremor does not issue approve/reject decisions or credit scores.
2. **No collections or recovery workflow**: There is no recovery escalation tooling, agent commission tracking, or borrower-facing portal.
3. **No real PII**: All names, centres, wards, and rupee denominations are synthetically calibrated.
4. **No native mobile app**: Responsive web application tested down to 380px viewports.
5. **No user-generated content**: No uploads, comments, free-form rich text, or unauthenticated writes.

---

## Named Design Decision: Asymmetric Causal Diagnostics

Generated software almost uniformly presents symmetrical 3x3 grids or equal 50/50 dashboard columns. Tremor deliberately breaks symmetry by allocating **62% of the viewport to the dynamic contagion canvas** and **38% to the three-way causal attribution rail**. 

This reflects operator reality: loan officers scanning a 400-borrower portfolio need spatial context of group clusters (wards and centres) while simultaneously inspecting per-borrower counterfactual ablation without leaving the visual canvas. Every numeral is set in tabular monospace (`JetBrains Mono`) to eliminate digit jitter during cascade playback.

---

## Anti-Slop Engineering Standards & Guarantees

This Tier 1 build strictly complies with the **Anti-Slop Engineering Standard**:
- **Static Client-Side Runtime**: Zero backend, zero database, zero authentication, zero API keys. Eliminates OWASP Top 10 injection and secret leakage risks by design.
- **Deterministic Simulation**: Byte-identical execution across machines and reloads for any given seed (default: `481516`).
- **60fps Canvas Visualizer**: High-DPI HTML5 canvas rendering 400+ nodes with 12ms staggered cascade lighting along propagation paths.
- **Strict Design Tokens**: Zero arbitrary Tailwind values; strictly derived palette (`--surface-0`, `--surface-1`, `--hairline`, and 3 non-decorative semantic accents: `--idio`, `--induced`, `--covariate`).
- **Four-State Data Lifecycle**: Every data component handles loaded, loading skeleton, empty, and error states.
- **URL Query Persistence**: `?week=...&borrower=...&scenario=...&seed=...` persists across reloads and browser navigation.
- **Full Keyboard Accessibility**: Complete demo path navigable via `Tab`, `ArrowKeys`, and `Enter`, with visible `--focus` styling.

---

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production (verifies TypeScript types & generates static bundle)
npm run build
```

## Security Headers (`vercel.json`)
The production build ships with strict host security headers:
- `Content-Security-Policy`: Disallows unsafe external scripts, inline object execution, and enforces strict origin bounds.
- `X-Content-Type-Options`: `nosniff`
- `X-Frame-Options`: `DENY`
- `Referrer-Policy`: `strict-origin-when-cross-origin`
