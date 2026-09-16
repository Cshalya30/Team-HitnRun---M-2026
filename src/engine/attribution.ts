import { SeededRNG } from './rng';
import { SIGNAL_WEIGHTS } from './stressModel';
import { StressSignals, StressSnapshot } from './types';

export interface MonteCarloConfidenceBand {
  runs: number;
  durationMs: number;
  idioCiLow: number;
  idioCiHigh: number;
  inducedCiLow: number;
  inducedCiHigh: number;
  covariateCiLow: number;
  covariateCiHigh: number;
  stressCiLow: number;
  stressCiHigh: number;
}

export interface CounterfactualAblationResult {
  actualLatentStress: number;
  ablatedLatentStress: number; // stress when incoming group edges are severed
  inducedAttributionDelta: number; // difference directly attributable to group contagion
  confidenceBand: MonteCarloConfidenceBand;
  counterfactualNarrative: string;
}

/**
 * Executes a 200-run Monte Carlo simulation to construct empirical confidence intervals.
 * Must complete in under 400ms per PRD Section 11.1.
 */
export function runMonteCarloAttribution(
  snapshot: StressSnapshot,
  seed = 481516
): MonteCarloConfidenceBand {
  const t0 = performance.now();
  const rng = new SeededRNG(seed + snapshot.weekIndex * 997);
  const RUNS = 200;

  const idioRuns: number[] = new Array(RUNS);
  const inducedRuns: number[] = new Array(RUNS);
  const covariateRuns: number[] = new Array(RUNS);
  const stressRuns: number[] = new Array(RUNS);

  const baseSignals = snapshot.signals;
  const signalKeys = Object.keys(SIGNAL_WEIGHTS) as Array<keyof StressSignals>;

  for (let r = 0; r < RUNS; r++) {
    // Perturb signals slightly according to signal noise
    let simStress = 0;
    for (let k = 0; k < signalKeys.length; k++) {
      const key = signalKeys[k];
      const noise = rng.gaussian(0, 0.05);
      const val = Math.min(1.0, Math.max(0.0, baseSignals[key] + noise));
      simStress += val * SIGNAL_WEIGHTS[key];
    }
    simStress = Math.min(1.0, Math.max(0.0, simStress));
    stressRuns[r] = simStress;

    // Perturb causal split
    const jitterIdio = rng.gaussian(0, 0.04);
    const jitterInd = rng.gaussian(0, 0.04);
    const jitterCov = rng.gaussian(0, 0.04);

    const rIdio = Math.max(0.01, snapshot.shareIdio + jitterIdio);
    const rInd = Math.max(0.0, snapshot.shareInduced + jitterInd);
    const rCov = Math.max(0.01, snapshot.shareCovariate + jitterCov);
    const sum = rIdio + rInd + rCov;

    idioRuns[r] = rIdio / sum;
    inducedRuns[r] = rInd / sum;
    covariateRuns[r] = rCov / sum;
  }

  // Sort arrays to find 10th and 90th percentiles
  idioRuns.sort((a, b) => a - b);
  inducedRuns.sort((a, b) => a - b);
  covariateRuns.sort((a, b) => a - b);
  stressRuns.sort((a, b) => a - b);

  const idx10 = Math.floor(RUNS * 0.1);
  const idx90 = Math.floor(RUNS * 0.9);

  const durationMs = Math.round((performance.now() - t0) * 10) / 10;

  return {
    runs: RUNS,
    durationMs,
    idioCiLow: Math.round(idioRuns[idx10] * 1000) / 1000,
    idioCiHigh: Math.round(idioRuns[idx90] * 1000) / 1000,
    inducedCiLow: Math.round(inducedRuns[idx10] * 1000) / 1000,
    inducedCiHigh: Math.round(inducedRuns[idx90] * 1000) / 1000,
    covariateCiLow: Math.round(covariateRuns[idx10] * 1000) / 1000,
    covariateCiHigh: Math.round(covariateRuns[idx90] * 1000) / 1000,
    stressCiLow: Math.round(stressRuns[idx10] * 1000) / 1000,
    stressCiHigh: Math.round(stressRuns[idx90] * 1000) / 1000,
  };
}

/**
 * Performs counterfactual ablation for causal attribution.
 */
export function performCounterfactualAblation(
  snapshot: StressSnapshot,
  borrowerName: string
): CounterfactualAblationResult {
  const confidenceBand = runMonteCarloAttribution(snapshot);

  // Counterfactual calculation: severing peer group transmission removes the crossPayment and socialDisruption contagion
  const ablatedSignals: StressSignals = {
    ...snapshot.signals,
    crossPayment: Math.max(0.02, snapshot.signals.crossPayment * 0.15),
    socialDisruption: Math.max(0.02, snapshot.signals.socialDisruption * 0.2),
    instalmentDelay: Math.max(0.05, snapshot.signals.instalmentDelay * (1.0 - snapshot.shareInduced * 0.7)),
  };

  const signalKeys = Object.keys(SIGNAL_WEIGHTS) as Array<keyof StressSignals>;
  let ablatedTotal = 0;
  for (let k = 0; k < signalKeys.length; k++) {
    const key = signalKeys[k];
    ablatedTotal += ablatedSignals[key] * SIGNAL_WEIGHTS[key];
  }
  const ablatedLatentStress = Math.min(1.0, Math.max(0.0, Math.round(ablatedTotal * 1000) / 1000));
  const inducedAttributionDelta = Math.max(0.0, Math.round((snapshot.latentStress - ablatedLatentStress) * 1000) / 1000);

  let counterfactualNarrative = '';
  if (snapshot.shareInduced > 0.4) {
    counterfactualNarrative = `Ablating joint liability ties reduces ${borrowerName}'s stress from ${Math.round(snapshot.latentStress * 100)}% down to ${Math.round(ablatedLatentStress * 100)}%. ${Math.round(inducedAttributionDelta * 100)} points of stress are purely transmitted contagion from ${snapshot.sourceBorrowerName ?? 'group peers'}.`;
  } else if (snapshot.shareCovariate > 0.45) {
    counterfactualNarrative = `${borrowerName}'s elevated stress is primarily driven by ward-level macroeconomic conditions. Group ablation yields minimal change (${Math.round(inducedAttributionDelta * 100)} points).`;
  } else {
    counterfactualNarrative = `${borrowerName} is experiencing an idiosyncratic shock. Her stress originates within her household and is not yet transmitted from peers.`;
  }

  return {
    actualLatentStress: snapshot.latentStress,
    ablatedLatentStress,
    inducedAttributionDelta,
    confidenceBand,
    counterfactualNarrative,
  };
}
