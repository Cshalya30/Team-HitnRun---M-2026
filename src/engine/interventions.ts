import { simulatePortfolioContagion } from './propagation';
import {
  Borrower,
  Centre,
  Edge,
  Intervention,
  InterventionType,
  JLG,
  Officer,
  Shock,
  StressSnapshot,
  Ward,
} from './types';

export interface InterventionPreset {
  type: InterventionType;
  title: string;
  shortDescription: string;
  mechanism: string;
  defaultDurationWeeks: number;
}

export const INTERVENTION_PRESETS: Record<InterventionType, InterventionPreset> = {
  moratorium: {
    type: 'moratorium',
    title: '4-Week EMI Moratorium & Restructuring',
    shortDescription: 'Freezes weekly EMI obligation for the shocked borrower.',
    mechanism: 'Eliminates cross-payment pressure on JLG peers. Dampens idiosyncratic stress by 60% and stops outgoing contagion.',
    defaultDurationWeeks: 6,
  },
  liquidity_bridge: {
    type: 'liquidity_bridge',
    title: 'Emergency Liquidity Bridge Grant (₹5,000)',
    shortDescription: 'Injects immediate liquidity to prevent informal moneylender borrowing.',
    mechanism: 'Absorbs cash shortfall directly. Reduces induced peer strain by 65%.',
    defaultDurationWeeks: 4,
  },
  group_split: {
    type: 'group_split',
    title: 'Temporary Joint-Liability Decoupling',
    shortDescription: 'Sever group liability enforcement for the affected member.',
    mechanism: 'Prevents contagion transmission across guarantee edges to other 4 group members.',
    defaultDurationWeeks: 8,
  },
  officer_reassignment: {
    type: 'officer_reassignment',
    title: 'Senior Supervisor Center Deployment',
    shortDescription: 'Assigns senior area supervisor to assist the center officer.',
    mechanism: 'Restores meeting attendance discipline and resolves localized member grievances.',
    defaultDurationWeeks: 6,
  },
  ward_relief: {
    type: 'ward_relief',
    title: 'Ward Environmental Relief Subsidy',
    shortDescription: 'Ward-level interest subsidy or disaster relief allocation.',
    mechanism: 'Lowers covariate economic pressure by 75% across all centres in the ward.',
    defaultDurationWeeks: 10,
  },
  intensive_visit: {
    type: 'intensive_visit',
    title: 'Pre-Meeting Home Mediation Visit',
    shortDescription: 'Loan officer conducts pre-centre home visit with family.',
    mechanism: 'Mediates household financial distress early, preventing meeting absence.',
    defaultDurationWeeks: 4,
  },
};

export interface TrajectoryPoint {
  week: number;
  baselineStress: number;
  interventionStress: number;
  preventedContagionDelta: number;
}

/**
 * Simulates before-and-after trajectories for a given intervention on a target borrower.
 */
export function simulateInterventionComparison(
  wards: Ward[],
  officers: Officer[],
  centres: Centre[],
  jlgs: JLG[],
  borrowers: Borrower[],
  edges: Edge[],
  activeShock: Shock | null,
  intervention: Intervention,
  targetBorrowerId: string,
  existingBaselineSnapshots?: StressSnapshot[]
): TrajectoryPoint[] {
  // Use existing baseline snapshots if provided, otherwise run baseline simulation
  let baselineSnapshots = existingBaselineSnapshots;
  if (!baselineSnapshots || baselineSnapshots.length === 0) {
    const baselineSim = simulatePortfolioContagion(wards, officers, centres, jlgs, borrowers, edges, {
      totalWeeks: 78,
      shock: activeShock,
      intervention: null,
    });
    baselineSnapshots = baselineSim.snapshotsByBorrower.get(targetBorrowerId) || [];
  }

  // Run mitigated simulation (with intervention)
  const mitigatedSim = simulatePortfolioContagion(wards, officers, centres, jlgs, borrowers, edges, {
    totalWeeks: 78,
    shock: activeShock,
    intervention,
  });

  const mitigatedSnapshots = mitigatedSim.snapshotsByBorrower.get(targetBorrowerId) || [];

  const trajectory: TrajectoryPoint[] = [];

  for (let w = 1; w <= 78; w++) {
    const base = baselineSnapshots[w - 1]?.latentStress ?? 0.1;
    const intv = mitigatedSnapshots[w - 1]?.latentStress ?? 0.1;
    trajectory.push({
      week: w,
      baselineStress: base,
      interventionStress: intv,
      preventedContagionDelta: Math.max(0, Math.round((base - intv) * 1000) / 1000),
    });
  }

  return trajectory;
}
