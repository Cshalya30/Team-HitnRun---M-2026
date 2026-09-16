import { StressSignals } from './types';

/**
 * Calibrated weights for the eight microfinance latent stress signals.
 * Sum = 1.00.
 * Pure mathematical model - single source of truth across the application.
 */
export const SIGNAL_WEIGHTS: Record<keyof StressSignals, number> = {
  attendance: 0.16,
  crossPayment: 0.20,
  instalmentDelay: 0.18,
  loanCycle: 0.10,
  multiLender: 0.12,
  dtiBurden: 0.12,
  socialDisruption: 0.06,
  seasonalMismatch: 0.06,
};

export interface StressComputationResult {
  latentStress: number;
  contributions: Record<keyof StressSignals, number>;
}

/**
 * Computes the borrower's latent stress score and individual signal contributions.
 * Strictly bounded between 0.0000 and 1.0000.
 */
export function computeLatentStress(signals: StressSignals): StressComputationResult {
  const contributions: Record<keyof StressSignals, number> = {
    attendance: 0,
    crossPayment: 0,
    instalmentDelay: 0,
    loanCycle: 0,
    multiLender: 0,
    dtiBurden: 0,
    socialDisruption: 0,
    seasonalMismatch: 0,
  };

  let rawTotal = 0;

  const signalKeys = Object.keys(SIGNAL_WEIGHTS) as Array<keyof StressSignals>;
  for (let i = 0; i < signalKeys.length; i++) {
    const key = signalKeys[i];
    const signalVal = Math.min(1.0, Math.max(0.0, signals[key]));
    const weightedVal = signalVal * SIGNAL_WEIGHTS[key];
    contributions[key] = Math.round(weightedVal * 10000) / 10000;
    rawTotal += weightedVal;
  }

  // Soft saturation curve for high stress
  const latentStress = Math.min(1.0, Math.max(0.0, Math.round(rawTotal * 10000) / 10000));

  return {
    latentStress,
    contributions,
  };
}
