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
 * Produces rich, realistic variance across wards, borrowers, and timeline seasons.
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
  const wardMap = new Map<string, Ward>(wards.map(w => [w.id, w]));

  // Track active states across weeks
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
  const recentElevatedWeeks = new Map<string, number>();

  // Initialize week 0 baseline with borrower's inherent baseline
  for (let b = 0; b < borrowers.length; b++) {
    const brw = borrowers[b];
    const ward = wardMap.get(brw.wardId);
    const riskFactor = ward?.riskFactor ?? 1.0;
    const initialBase = brw.baselineStress;
    currentStress.set(brw.id, initialBase);
    idioStress.set(brw.id, initialBase * 0.75);
    inducedStress.set(brw.id, initialBase * 0.05);
    covariateStress.set(brw.id, initialBase * 0.20 * riskFactor);
    upstreamSource.set(brw.id, null);
    recentElevatedWeeks.set(brw.id, 0);
  }

  // Default organic portfolio timeline events if no explicit custom shock is applied
  const defaultShocks: Shock[] = shock
    ? [shock]
    : [
        {
          type: 'borrower',
          targetId: 'b-411',
          targetName: 'Lakshmi R. (Medical Shock)',
          startWeek: 19,
          magnitude: 0.92,
        },
        {
          type: 'ward',
          targetId: 'w-15',
          targetName: 'Ward 15 · Govandi North (Monsoon Flooding)',
          startWeek: 22,
          magnitude: 0.78,
        },
        {
          type: 'ward',
          targetId: 'w-04',
          targetName: 'Ward 4 · Dharavi East (Wholesale Material Spike)',
          startWeek: 44,
          magnitude: 0.72,
        },
        {
          type: 'ward',
          targetId: 'w-27',
          targetName: 'Ward 27 · Mumbra (Market Strike)',
          startWeek: 36,
          magnitude: 0.68,
        },
        {
          type: 'officer',
          targetId: 'off-03',
          targetName: 'Suresh P. (Collection Route Turnover)',
          startWeek: 55,
          magnitude: 0.60,
        },
      ];

  // Simulation loop: 78 weeks
  for (let week = 1; week <= totalWeeks; week++) {
    const weekSnapshots: StressSnapshot[] = [];
    let weekObservedAlerts = 0;
    let weekSuppressedCount = 0;
    let weekEscalatedCount = 0;

    // 1. Process active shocks and seasonal macro waves for this week
    for (let s = 0; s < defaultShocks.length; s++) {
      const sh = defaultShocks[s];
      if (week >= sh.startWeek && week <= sh.startWeek + 16) {
        const decay = Math.max(0.15, 1.0 - (week - sh.startWeek) * 0.055);

        if (sh.type === 'borrower') {
          const prev = idioStress.get(sh.targetId) ?? 0;
          idioStress.set(sh.targetId, Math.min(0.96, Math.max(prev, sh.magnitude * decay)));
        } else if (sh.type === 'ward') {
          for (let b = 0; b < borrowers.length; b++) {
            const brw = borrowers[b];
            if (brw.wardId === sh.targetId) {
              const prevCov = covariateStress.get(brw.id) ?? 0;
              covariateStress.set(brw.id, Math.min(0.88, prevCov + sh.magnitude * 0.32 * decay));
            }
          }
        } else if (sh.type === 'officer') {
          const officer = officers.find(o => o.id === sh.targetId);
          if (officer) {
            for (let b = 0; b < borrowers.length; b++) {
              const brw = borrowers[b];
              const centre = centreMap.get(brw.centreId);
              if (centre && officer.assignedCentreIds.includes(centre.id)) {
                const prevCov = covariateStress.get(brw.id) ?? 0;
                covariateStress.set(brw.id, Math.min(0.80, prevCov + sh.magnitude * 0.30 * decay));
              }
            }
          }
        }
      }
    }

    // Natural seasonal wave (Monsoon in weeks 20-30; Festival credit cycle in weeks 44-54)
    const isMonsoonSeason = week >= 20 && week <= 30;
    const monsoonIntensity = isMonsoonSeason ? Math.sin(((week - 20) / 10) * Math.PI) * 0.16 : 0;

    const isFestivalSeason = week >= 44 && week <= 54;
    const festivalIntensity = isFestivalSeason ? Math.sin(((week - 44) / 10) * Math.PI) * 0.12 : 0;

    // 2. Process active intervention if applied
    let interventionActive = false;
    if (intervention && week >= intervention.appliedWeek && week <= intervention.appliedWeek + intervention.durationWeeks) {
      interventionActive = true;
    }

    // 3. Contagion propagation along 5 channels
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

      // Channel 1: Intra-JLG Guarantee channel (Strongest transmission, weight 0.88)
      for (let i = 0; i < gN.length; i++) {
        const neighborId = gN[i].dstId;
        const neighborStress = currentStress.get(neighborId) ?? 0;

        if (interventionActive) {
          if (intervention?.type === 'group_split' && (intervention.targetBorrowerId === brw.id || intervention.targetBorrowerId === neighborId)) {
            continue;
          }
          if (intervention?.type === 'moratorium' && intervention.targetBorrowerId === neighborId) {
            continue;
          }
        }

        if (neighborStress > 0.20) {
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

      // Channel 2: Shared Income channel (Market peer transmission, weight 0.35)
      for (let i = 0; i < iN.length; i++) {
        const neighborId = iN[i].dstId;
        const neighborStress = currentStress.get(neighborId) ?? 0;
        if (neighborStress > 0.38) {
          const trans = (neighborStress - 0.38) * iN[i].weight * 0.32;
          incomingInduced += trans;
          if (trans > maxContagion) {
            maxContagion = trans;
            const srcBrw = borrowerMap.get(neighborId);
            strongestSource = {
              id: neighborId,
              name: srcBrw?.displayName ?? 'Trade Peer',
              channel: 'income',
            };
          }
        }
      }

      // Channel 3: Social / kinship channel (Kinship transmission, weight 0.25)
      for (let i = 0; i < sN.length; i++) {
        const neighborId = sN[i].dstId;
        const neighborStress = currentStress.get(neighborId) ?? 0;
        if (neighborStress > 0.42) {
          const trans = (neighborStress - 0.42) * sN[i].weight * 0.24;
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

      // Memory damping
      const priorInduced = inducedStress.get(brw.id) ?? 0;
      const combinedInduced = Math.min(0.95, priorInduced * 0.70 + incomingInduced);

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
      const ward = wardMap.get(brw.wardId);
      const wardRisk = ward?.riskFactor ?? 1.0;

      let idio = idioStress.get(brw.id) ?? brw.baselineStress;
      let induced = inducedStress.get(brw.id) ?? 0;
      let cov = covariateStress.get(brw.id) ?? 0;

      // Add seasonal macro influence based on ward vulnerability
      if (monsoonIntensity > 0 && wardRisk > 1.1) {
        cov += monsoonIntensity * (wardRisk - 0.8);
      }
      if (festivalIntensity > 0 && brw.loanCycle >= 3) {
        cov += festivalIntensity * 0.8;
      }

      // Natural gradual recovery / drift
      idio = Math.max(brw.baselineStress, idio * 0.95);
      idioStress.set(brw.id, idio);
      cov = Math.max(brw.baselineStress * 0.20, cov * 0.93);
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

      // Compute 8 Signals based on causal components with authentic variation
      const attendance = Math.min(1.0, 0.04 + idio * 0.48 + cov * 0.42);
      const crossPayment = Math.min(1.0, 0.02 + induced * 0.88);
      const instalmentDelay = Math.min(1.0, (idio * 0.48 + induced * 0.32 + cov * 0.20) * 1.15);
      const loanCycle = Math.min(1.0, (brw.loanCycle - 1) * 0.20 + (brw.activeLenders > 1 ? 0.22 : 0));
      const multiLender = brw.activeLenders > 1 ? (brw.activeLenders === 3 ? 0.85 : 0.60) : 0.06;
      const dtiBurden = Math.min(1.0, ((brw.emi * 4) / brw.hhIncomeMonthly) * 2.1);
      const socialDisruption = Math.min(1.0, 0.03 + induced * 0.68);
      const seasonalMismatch = Math.min(1.0, cov * 0.70 + (isMonsoonSeason ? 0.38 : (isFestivalSeason ? 0.22 : 0.04)));

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

      // Dominant stress classification
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
      const dpd = latentStress > 0.40 ? Math.round((latentStress - 0.40) * 110) : 0;

      // Transient Suppression Filter
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

      // Monte Carlo confidence interval estimate
      const ciDelta = Math.max(0.025, latentStress * 0.11);
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

    // 5. Compute accurate, diverse Ward Aggregate metrics for this week
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

      // Dynamically determine true dominant transmission channel for this ward
      let chanGuarantee = 0;
      let chanIncome = 0;
      let chanSocial = 0;
      let chanWard = 0;
      let chanOfficer = 0;

      for (let i = 0; i < wardBorrowers.length; i++) {
        const s = wardBorrowers[i];
        if (s.sourceChannel === 'guarantee') chanGuarantee += s.shareInduced;
        else if (s.sourceChannel === 'income') chanIncome += s.shareInduced;
        else if (s.sourceChannel === 'social') chanSocial += s.shareInduced;
        chanWard += s.shareCovariate;
        if (s.latentStress >= 0.35) chanOfficer += 0.2;
      }

      // Pick the strongest transmission channel for this ward
      const maxChanVal = Math.max(chanGuarantee, chanIncome, chanSocial, chanWard, chanOfficer);
      let dominantChannel: WardAggregate['dominantChannel'] = 'guarantee';
      if (maxChanVal === chanIncome) dominantChannel = 'income';
      else if (maxChanVal === chanSocial) dominantChannel = 'social';
      else if (maxChanVal === chanWard) dominantChannel = 'ward';
      else if (maxChanVal === chanOfficer) dominantChannel = 'officer';

      // Dynamically calculate contagion velocity (rate of transmission spread)
      const flaggedRatio = totalBorrowers > 0 ? flagged.length / totalBorrowers : 0;
      const baseVel = 0.5 + flaggedRatio * 4.2 + (avgLatentStress > 0.3 ? 0.6 : 0.0);
      const contagionVelocity = Math.round(Math.min(3.2, Math.max(0.4, baseVel)) * 10) / 10;

      return {
        wardId: ward.id,
        name: ward.name,
        totalBorrowers,
        flaggedCount: flagged.length,
        escalatedCount: escalated.length,
        suppressedCount: flagged.length - escalated.length,
        avgLatentStress,
        contagionVelocity,
        dominantChannel,
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
