import React from 'react';
import { performCounterfactualAblation } from '../engine/attribution';
import { Borrower, Centre, JLG, StressSnapshot, Ward } from '../engine/types';

interface EvidenceExportProps {
  seed: number;
  currentWeek: number;
  borrower: Borrower | null;
  centre: Centre | null;
  ward: Ward | null;
  jlg: JLG | null;
  snapshot: StressSnapshot | null;
}

export const EvidenceExport: React.FC<EvidenceExportProps> = ({
  seed,
  currentWeek,
  borrower,
  centre,
  ward,
  jlg,
  snapshot,
}) => {
  const handleExportJSON = () => {
    if (!borrower || !snapshot) return;

    const ablation = performCounterfactualAblation(snapshot, borrower.displayName);

    const evidenceTrail = {
      specVersion: 'Tremor-M#26-P11-v1',
      generatedAt: new Date().toISOString(),
      portfolioSeed: seed,
      auditMetadata: {
        tool: 'Tremor Microfinance Group-Contagion Risk Diagnostic',
        environment: 'Client-side Deterministic Simulation (Tier 1)',
        confidentiality: 'Synthetic Demo Portfolio - Zero PII',
      },
      temporalContext: {
        simulationWeek: currentWeek,
        tenureScopeWeeks: 78,
      },
      borrowerProfile: {
        id: borrower.id,
        displayName: borrower.displayName,
        occupation: borrower.occupation,
        monthlyHouseholdIncomeINR: borrower.hhIncomeMonthly,
        householdSize: borrower.hhSize,
        loanCycle: borrower.loanCycle,
        activeLendersCount: borrower.activeLenders,
        currentPrincipalINR: borrower.principal,
        weeklyEmiINR: borrower.emi,
      },
      groupHierarchy: {
        jlgId: jlg?.id ?? borrower.jlgId,
        jlgName: jlg?.name ?? 'Unknown Group',
        centreId: centre?.id ?? borrower.centreId,
        centreName: centre?.name ?? 'Unknown Centre',
        wardId: ward?.id ?? borrower.wardId,
        wardName: ward?.name ?? 'Unknown Ward',
      },
      stressDiagnostic: {
        latentStressScore: snapshot.latentStress,
        daysPastDue: snapshot.dpd,
        isEscalatedToOfficer: snapshot.isEscalated,
        dominantStressClassification: snapshot.dominantStressType,
        eightSignalContributions: snapshot.signalContributions,
        rawSignals: snapshot.signals,
      },
      causalAttribution: {
        shareIdiosyncratic: snapshot.shareIdio,
        shareInduced: snapshot.shareInduced,
        shareCovariate: snapshot.shareCovariate,
        primaryTransmissionSource: {
          borrowerId: snapshot.sourceBorrowerId,
          borrowerName: snapshot.sourceBorrowerName,
          edgeChannel: snapshot.sourceChannel,
        },
        counterfactualAblation: {
          ablatedLatentStress: ablation.ablatedLatentStress,
          inducedContagionDelta: ablation.inducedAttributionDelta,
          narrative: ablation.counterfactualNarrative,
        },
        monteCarloConfidenceIntervals: {
          simulationRuns: ablation.confidenceBand.runs,
          computeDurationMs: ablation.confidenceBand.durationMs,
          idiosyncraticCi90: [ablation.confidenceBand.idioCiLow, ablation.confidenceBand.idioCiHigh],
          inducedCi90: [ablation.confidenceBand.inducedCiLow, ablation.confidenceBand.inducedCiHigh],
          covariateCi90: [ablation.confidenceBand.covariateCiLow, ablation.confidenceBand.covariateCiHigh],
        },
      },
    };

    const jsonString = JSON.stringify(evidenceTrail, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tremor-evidence-${borrower.id}-w${String(currentWeek).padStart(2, '0')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
      <button
        className="btn-control"
        onClick={handleExportJSON}
        disabled={!borrower || !snapshot}
        title="Download complete JSON audit trail of selected group and borrower"
        aria-label="Export Evidence Trail JSON"
      >
        <span style={{ fontFamily: 'var(--font-mono)' }}>⤓</span> Export Evidence Trail (JSON)
      </button>
    </div>
  );
};
