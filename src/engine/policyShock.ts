import { Shock } from './types';

/**
 * F13: Policy Shock Preset - Guardrails Refinancing Cutoff.
 * Blocks refinancing for any borrower reaching 60+ DPD.
 * Creates an immediate second-order liquidity crunch that cascades across JLGs.
 */
export function createPolicyRefinancingCutoffShock(startWeek = 20): Shock {
  return {
    type: 'borrower',
    targetId: 'b-001',
    targetName: 'Guardrails 60+ DPD Refinancing Freeze',
    startWeek,
    magnitude: 0.95,
  };
}
