# Tremor

Group-level risk diagnostic for microfinance lenders.

Tremor separates a borrower's own financial stress from stress transmitted to her by her lending group, and shows a loan officer which one they are looking at, with a named source and a confidence band, not just an alert. All data is simulated and seed-generated, calibrated to roughly 5,000 borrowers across 30 wards and 3 districts over 78 weeks of history, aligning with baseline PAR 31-180 near 2% and stress-period PAR near 6.2% from published MFIN Micrometer and RBI Financial Stability Report figures. Results validate recovery of a known generative process, not real-world predictive accuracy.

Built for Manipal Hackathon 2026, Problem Statement P11 (Microfinance, SDG 8).

## The problem

In a joint liability group, when one borrower cannot pay her instalment, her groupmates cover it for her. The lender's system records a clean repayment. The distress moved to four other households, and nothing in a standard credit system recorded it. By the time it surfaces as a missed payment, it usually belongs to someone other than the person whose crisis started it.

Tremor models the borrower relationship graph, the ways stress moves along it, and runs a three-way causal attribution on every flagged borrower: is this her own shock, is it transmitted from a named groupmate, or is her whole area under stress. Each answer needs a different response, and treating one as the other either wastes an intervention or misses the actual cause.

## What this is not

- Not a credit scoring or underwriting tool
- Not a collections system
- Has no borrower-facing surface of any kind, by design

## Data and Calibration

Every borrower, loan, and repayment record in this build is synthetic, simulated, and seed-generated. No real personal or financial data is used anywhere. The generator is calibrated so baseline PAR 31-180 sits near 2% and stress-period PAR near 6.2%, matching published MFIN Micrometer and RBI Financial Stability Report data, with household obligation ratios capped at 50% and a maximum of three active lenders per borrower. Results are validated as recovering a known, labelled generative process, not as real-world predictive accuracy, which would require a pilot against a real lender's data.

## Architecture

Four routes over one shared dataset and one shared component library:

| Route | For | Shows |
|---|---|---|
| `/queue` | Loan officer | Ranked worklist of borrowers needing a conversation this week |
| `/network` | Analyst | The borrower graph, scrubber, scenario injection, attribution panel |
| `/portfolio` | Branch manager, risk officer | Ward-level exposure, trend, and a policy sandbox |
| `/system` | Everyone | How the model works: five contagion channels and the attribution method |

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, d3-force for the live borrower physics graph.
- **Simulation engine**: Pure TypeScript, deterministic and seeded. Generates the portfolio, computes latent stress from eight signals, propagates it across relationship channels, and attributes flagged stress across idiosyncratic, induced, and covariate causes using counterfactual edge ablation with Monte Carlo confidence bands.
- **Backend for this submission**: None. Static client-side app, no database, no API keys, no auth.

## Running locally

```bash
git clone https://github.com/Cshalya30/Team-HitnRun---M-2026.git
cd Team-HitnRun---M-2026
npm install
npm run dev
```

## Pre-submission Quality Checklist

- Four distinct client-side routes sharing one component library
- Live d3-force simulation responding to measured container dimensions and ResizeObserver
- Three visible counts in Ward Exposure Matrix: FLAGGED, ESCALATED, SUPPRESSED
- Zero purple or violet accent hues; neutral ink focus rings throughout
- No emoji icons, no gradients, no glassmorphism
- 100% deterministic execution for any seed

## License

MIT, see [LICENSE](LICENSE).
