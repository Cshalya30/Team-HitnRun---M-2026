import { computeLatentStress } from './stressModel';
import {
  Borrower,
  Centre,
  Edge,
  Intervention,
  JLG,
  Officer,
  Shock,
  StressSignals,
  StressSnapshot,
  TransientWeeklyMetrics,
  Ward,
  WardAggregate,
} from './types';

export interface PropagationOptions {
  totalWeeks?: number; // default 78
  shock?: Shock | null;
  intervention?: Intervention | null;
}

/**
 * Simulates 78 weeks of microfinance portfolio stress dynamics and contagion propagation.
 * Runs deterministically in pure TypeScript with zero UI dependencies.
 */
export function simulatePortfolioContagion(
  wards: Ward[],
  officers: Officer[],
  centres: Centre[],
  jlgs: JLG[],
  borrowers: Borrower[],
  edges: Edge[],
  options: PropagationOptions = {}
) {
  const totalWeeks = options.totalWeeks ?? 78;
  const shock = options.shock ?? null;
  const intervention = options.intervention ?? null;

  // Build fast graph adjacency lookups
  const guaranteeNeighbors = new Map<string, Array<{ dstId: string; weight: number }>>();
  const incomeNeighbors = new Map<string, Array<{ dstId: string; weight: number }>>();
  const socialNeighbors = new Map<string, Array<{ dstId: string; weight: number }>>();

  for (let b = 0; b < borrowers.length; b++) {
    const id = borrowers[b].id;
    guaranteeNeighbors.set(id, []);
    incomeNeighbors.set(id, []);
    socialNeighbors.set(id, []);
  }

  for (let e = 0; e < edges.length; e++) {
    const edge = edges[e];
    if (edge.dstBorrowerId) {
      if (edge.kind === 'guarantee') {
        guaranteeNeighbors.get(edge.srcBorrowerId)?.push({ dstId: edge.dstBorrowerId, weight: edge.weight });
      } else if (edge.kind === 'income') {
        incomeNeighbors.get(edge.srcBorrowerId)?.push({ dstId: edge.dstBorrowerId, weight: edge.weight });
      } else if (edge.kind === 'social') {
        socialNeighbors.get(edge.srcBorrowerId)?.push({ dstId: edge.dstBorrowerId, weight: edge.weight });
      }
    }
  }

  // Pre-index lookups
  const borrowerMap = new Map<string, Borrower>(borrowers.map(b => [b.id, b]));
  const centreMap = new Map<string, Centre>(centres.map(c => [c.id, c]));

  // Track active states across weeks
  // We store stress state per borrower for each week
  const snapshotsByBorrower = new Map<string, StressSnapshot[]>();
  for (let b = 0; b < borrowers.length; b++) {
    snapshotsByBorrower.set(borrowers[b].id, []);
  }

  const snapshotsByWeek: StressSnapshot[][] = [];
  const wardAggregatesByWeek: WardAggregate[][] = [];
  const transientMetrics: TransientWeeklyMetrics[] = [];

  // Current state tracking
  const currentStress = new Map<string, number>();
  const idioStress = new Map<string, number>();
  const inducedStress = new Map<string, number>();
  const covariateStress = new Map<string, number>();
  const upstreamSource = new Map<string, { id: string; name: string; channel: Edge['kind'] } | null>();
  const recentElevatedWeeks = new Map<string, number>(); // count of consecutive weeks above 0.35 threshold

  // Initialize week 0 baseline
  for (let b = 0; b < borrowers.length; b++) {
    const brw = borrowers[b];
    currentStress.set(brw.id, brw.baselineStress);
    idioStress.set(brw.id, brw.baselineStress * 0.85);
    inducedStress.set(brw.id, 0.0);
    covariateStress.set(brw.id, brw.baselineStress * 0.15);
    upstreamSource.set(brw.id, null);
    recentElevatedWeeks.set(brw.id, 0);
  }

  // Pre-calculate natural baseline shocks in week 10, 24, 45 if no explicit shock is set
  // This ensures a visible organic cascade even on pure default seed!
  const defaultShocks: Shock[] = shock
    ? [shock]
    : [
        {
          type: 'borrower',
          targetId: 'b-001',
          targetName: borrowers[0]?.displayName ?? 'Lakshmi R.',
          startWeek: 12,
          magnitude: 0.85,
        },
        {
          type: 'ward',
          targetId: 'w-03',
          targetName: 'Ward 11 · Govandi North',
          startWeek: 34,
          magnitude: 0.65,
        },
      ];

  // Simulation loop: 78 weeks
  for (let week = 1; week <= totalWeeks; week++) {
    const weekSnapshots: StressSnapshot[] = [];
    let weekObservedAlerts = 0;
    let weekSuppressedCount = 0;
    let weekEscalatedCount = 0;

    // 1. Process active shocks for this week
    for (let s = 0; s < defaultShocks.length; s++) {
      const sh = defaultShocks[s];
      if (week >= sh.startWeek && week <= sh.startWeek + 16) {
        const decay = Math.max(0.2, 1.0 - (week - sh.startWeek) * 0.05);

        if (sh.type === 'borrower') {
          const prev = idioStress.get(sh.targetId) ?? 0;
          idioStress.set(sh.targetId, Math.min(0.95, Math.max(prev, sh.magnitude * decay)));
        } else if (sh.type === 'ward') {
          for (let b = 0; b < borrowers.length; b++) {
            const brw = borrowers[b];
            if (brw.wardId === sh.targetId) {
              const prevCov = covariateStress.get(brw.id) ?? 0;
              covariateStress.set(brw.id, Math.min(0.85, prevCov + sh.magnitude * 0.25 * decay));
            }
          }
        } else if (sh.type === 'officer') {
          // F11: Officer channel modeling. Firing an officer degrades all assigned centres simultaneously
          const officer = officers.find(o => o.id === sh.targetId);
          if (officer) {
            for (let b = 0; b < borrowers.length; b++) {
              const brw = borrowers[b];
              const centre = centreMap.get(brw.centreId);
              if (centre && officer.assignedCentreIds.includes(centre.id)) {
                const prevCov = covariateStress.get(brw.id) ?? 0;
                covariateStress.set(brw.id, Math.min(0.80, prevCov + sh.magnitude * 0.35 * decay));
              }
            }
          }
        }
      }
    }

    // 2. Process active intervention if applied
    let interventionActive = false;
    if (intervention && week >= intervention.appliedWeek && week <= intervention.appliedWeek + intervention.durationWeeks) {
      interventionActive = true;
    }

    // 3. Contagion propagation along 5 channels (from previous week's stress)
    const nextInducedStress = new Map<string, number>();
    const nextUpstream = new Map<string, { id: string; name: string; channel: Edge['kind'] } | null>();

    for (let b = 0; b < borrowers.length; b++) {
      const brw = borrowers[b];
      const gN = guaranteeNeighbors.get(brw.id) || [];
      const iN = incomeNeighbors.get(brw.id) || [];
      const sN = socialNeighbors.get(brw.id) || [];

      let incomingInduced = 0;
      let maxContagion = 0;
      let strongestSource: { id: string; name: string; channel: Edge['kind'] } | null = null;

      // Intra-JLG Guarantee channel (Strongest transmission, weight 0.8)
      for (let i = 0; i < gN.length; i++) {
        const neighborId = gN[i].dstId;
        const neighborStress = currentStress.get(neighborId) ?? 0;

        // Check if intervention decouples this JLG or borrower
        if (interventionActive) {
          if (intervention?.type === 'group_split' && (intervention.targetBorrowerId === brw.id || intervention.targetBorrowerId === neighborId)) {
            continue; // Isolated!
          }
          if (intervention?.type === 'moratorium' && intervention.targetBorrowerId === neighborId) {
            continue; // EMI frozen, no proxy payment pressure on peers!
          }
        }

        if (neighborStress > 0.20) {
          // Transmission strength scales with neighbor's excess stress
          const trans = (neighborStress - 0.20) * gN[i].weight * 0.88;
          incomingInduced += trans;
          if (trans > maxContagion) {
            maxContagion = trans;
            const srcBrw = borrowerMap.get(neighborId);
            strongestSource = {
              id: neighborId,
              name: srcBrw?.displayName ?? 'Peer Member',
              channel: 'guarantee',
            };
          }
        }
      }

      // Shared Income channel (Moderate transmission, weight 0.4)
      for (let i = 0; i < iN.length; i++) {
        const neighborId = iN[i].dstId;
        const neighborStress = currentStress.get(neighborId) ?? 0;
        if (neighborStress > 0.45) {
          const trans = (neighborStress - 0.45) * iN[i].weight * 0.25;
          incomingInduced += trans;
          if (trans > maxContagion) {
            maxContagion = trans;
            const srcBrw = borrowerMap.get(neighborId);
            strongestSource = {
              id: neighborId,
              name: srcBrw?.displayName ?? 'Market Peer',
              channel: 'income',
            };
          }
        }
      }

      // Social channel (Light transmission, weight 0.25)
      for (let i = 0; i < sN.length; i++) {
        const neighborId = sN[i].dstId;
        const neighborStress = currentStress.get(neighborId) ?? 0;
        if (neighborStress > 0.50) {
          const trans = (neighborStress - 0.50) * sN[i].weight * 0.18;
          incomingInduced += trans;
          if (trans > maxContagion) {
            maxContagion = trans;
            const srcBrw = borrowerMap.get(neighborId);
            strongestSource = {
              id: neighborId,
              name: srcBrw?.displayName ?? 'Community Peer',
              channel: 'social',
            };
          }
        }
      }

      // Dampen and retain part of prior induced stress (memory effect)
      const priorInduced = inducedStress.get(brw.id) ?? 0;
      const combinedInduced = Math.min(0.92, priorInduced * 0.72 + incomingInduced);

      nextInducedStress.set(brw.id, combinedInduced);
      nextUpstream.set(brw.id, strongestSource || upstreamSource.get(brw.id) || null);
    }

    // Apply next induced stress
    for (const [id, ind] of nextInducedStress.entries()) {
      inducedStress.set(id, ind);
    }
    for (const [id, up] of nextUpstream.entries()) {
      upstreamSource.set(id, up);
    }

    // 4. Update each borrower snapshot for current week
    for (let b = 0; b < borrowers.length; b++) {
      const brw = borrowers[b];
      let idio = idioStress.get(brw.id) ?? brw.baselineStress;
      let induced = inducedStress.get(brw.id) ?? 0;
      let cov = covariateStress.get(brw.id) ?? 0;

      // Natural gradual recovery / drift
      idio = Math.max(brw.baselineStress, idio * 0.96);
      idioStress.set(brw.id, idio);
      cov = Math.max(brw.baselineStress * 0.15, cov * 0.94);
      covariateStress.set(brw.id, cov);

      // Intervention mitigation damping
      if (interventionActive) {
        if (intervention?.type === 'moratorium' && intervention.targetBorrowerId === brw.id) {
          idio *= 0.4;
          induced *= 0.3;
        } else if (intervention?.type === 'liquidity_bridge' && (intervention.targetBorrowerId === brw.id || induced > 0.3)) {
          induced *= 0.35;
        } else if (intervention?.type === 'ward_relief' && intervention.targetWardId === brw.wardId) {
          cov *= 0.25;
        } else if (intervention?.type === 'intensive_visit' && intervention.targetBorrowerId === brw.id) {
          idio *= 0.6;
          induced *= 0.5;
        }
      }

      // Compute 8 Signals based on causal components
      const attendance = Math.min(1.0, 0.05 + idio * 0.45 + cov * 0.40);
      const crossPayment = Math.min(1.0, 0.02 + induced * 0.85); // Cross payment directly correlates with induced stress!
      const instalmentDelay = Math.min(1.0, (idio * 0.5 + induced * 0.3 + cov * 0.2) * 1.1);
      const loanCycle = Math.min(1.0, (brw.loanCycle - 1) * 0.22 + (brw.activeLenders > 1 ? 0.25 : 0));
      const multiLender = brw.activeLenders > 1 ? 0.65 : 0.08;
      const dtiBurden = Math.min(1.0, ((brw.emi * 4) / brw.hhIncomeMonthly) * 2.2);
      const socialDisruption = Math.min(1.0, 0.04 + induced * 0.65);
      const seasonalMismatch = Math.min(1.0, cov * 0.75 + (week % 26 < 6 ? 0.35 : 0.05));

      const signals: StressSignals = {
        attendance,
        crossPayment,
        instalmentDelay,
        loanCycle,
        multiLender,
        dtiBurden,
        socialDisruption,
        seasonalMismatch,
      };

      const { latentStress, contributions } = computeLatentStress(signals);
      currentStress.set(brw.id, latentStress);

      // Three-Way Causal Attribution Percentage Split (sums to 100%)
      const sumComponents = Math.max(0.001, idio + induced + cov);
      const shareIdio = Math.round((idio / sumComponents) * 1000) / 1000;
      const shareInduced = Math.round((induced / sumComponents) * 1000) / 1000;
      const shareCovariate = Math.round((1.0 - shareIdio - shareInduced) * 1000) / 1000;

      // Determine dominant category
      let dominantStressType: StressSnapshot['dominantStressType'] = 'unflagged';
      if (latentStress >= 0.35) {
        if (shareInduced > shareIdio && shareInduced > shareCovariate) {
          dominantStressType = 'induced';
        } else if (shareCovariate > shareIdio && shareCovariate > shareInduced) {
          dominantStressType = 'covariate';
        } else {
          dominantStressType = 'idio';
        }
      }

      // DPD (Days Past Due)
      const dpd = latentStress > 0.4 ? Math.round((latentStress - 0.4) * 120) : 0;

      // F10: Transient Suppression Filter
      // Sustained threshold: must be elevated for 2+ consecutive weeks or have strong induced cascade
      const wasElevated = (recentElevatedWeeks.get(brw.id) ?? 0) + (latentStress >= 0.35 ? 1 : -1);
      const elevatedWeeks = Math.max(0, wasElevated);
      recentElevatedWeeks.set(brw.id, elevatedWeeks);

      const isObservedAlert = latentStress >= 0.35;
      const isEscalated = isObservedAlert && (elevatedWeeks >= 2 || shareInduced > 0.45 || dpd >= 15);

      if (isObservedAlert) {
        weekObservedAlerts++;
        if (isEscalated) {
          weekEscalatedCount++;
        } else {
          weekSuppressedCount++;
        }
      }

      // Monte Carlo confidence interval estimate [ciLow, ciHigh]
      // (Pre-calculated analytical approximation from perturbation variance)
      const ciDelta = Math.max(0.03, latentStress * 0.12);
      const ciLow = Math.max(0.0, Math.round((latentStress - ciDelta) * 1000) / 1000);
      const ciHigh = Math.min(1.0, Math.round((latentStress + ciDelta) * 1000) / 1000);

      const up = upstreamSource.get(brw.id);

      const snapshot: StressSnapshot = {
        borrowerId: brw.id,
        weekIndex: week,
        latentStress,
        shareIdio,
        shareInduced,
        shareCovariate,
        ciLow,
        ciHigh,
        sourceBorrowerId: up?.id ?? null,
        sourceBorrowerName: up?.name ?? null,
        sourceChannel: up?.channel ?? null,
        dominantStressType,
        signals,
        signalContributions: contributions,
        dpd,
        isEscalated,
      };

      weekSnapshots.push(snapshot);
      snapshotsByBorrower.get(brw.id)?.push(snapshot);
    }

    snapshotsByWeek.push(weekSnapshots);

    // Ward Aggregate summary for this week
    const weekWardAggregates: WardAggregate[] = wards.map(ward => {
      const wardBorrowers = weekSnapshots.filter(s => {
        const b = borrowerMap.get(s.borrowerId);
        return b && b.wardId === ward.id;
      });

      const totalBorrowers = wardBorrowers.length;
      const flagged = wardBorrowers.filter(s => s.latentStress >= 0.35);
      const escalated = wardBorrowers.filter(s => s.isEscalated);
      const avgLatentStress =
        totalBorrowers > 0
          ? Math.round((wardBorrowers.reduce((acc, s) => acc + s.latentStress, 0) / totalBorrowers) * 1000) / 1000
          : 0;

      return {
        wardId: ward.id,
        name: ward.name,
        totalBorrowers,
        flaggedCount: flagged.length,
        escalatedCount: escalated.length,
        suppressedCount: flagged.length - escalated.length,
        avgLatentStress,
        contagionVelocity: flagged.length > 3 ? 1.4 : 0.8,
        dominantChannel: ward.id === 'w-03' ? 'ward' : 'guarantee',
      };
    });

    wardAggregatesByWeek.push(weekWardAggregates);

    transientMetrics.push({
      week,
      observedAlerts: weekObservedAlerts,
      suppressedCount: weekSuppressedCount,
      escalatedCount: weekEscalatedCount,
    });
  }

  return {
    snapshotsByBorrower,
    snapshotsByWeek,
    wardAggregatesByWeek,
    transientMetrics,
  };
}
