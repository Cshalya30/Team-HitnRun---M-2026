import React, { useState } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateEvidenceData = () => {
    if (!borrower || !snapshot) return null;

    const ablation = performCounterfactualAblation(snapshot, borrower.displayName);

    return {
      specVersion: 'Tremor-M#26-P11-v2',
      generatedAt: new Date().toISOString(),
      portfolioSeed: seed,
      auditMetadata: {
        tool: 'Tremor Microfinance Group-Contagion Risk Diagnostic',
        environment: 'Client-side Deterministic Simulation (Tier 1)',
        confidentiality: 'Synthetic Demo Portfolio - Zero PII',
      },
      temporalContext: {
        simulationWeek: `Week ${currentWeek}`,
        weekCode: `WK${String(currentWeek).padStart(2, '0')}`,
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
  };

  const evidenceData = generateEvidenceData();
  const jsonString = evidenceData ? JSON.stringify(evidenceData, null, 2) : '';

  const handleDownloadJSON = () => {
    if (!evidenceData || !borrower) return;
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tremor-evidence-${borrower.id}-wk${String(currentWeek).padStart(2, '0')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <button
        className="btn-secondary"
        onClick={() => setIsOpen(true)}
        disabled={!borrower || !snapshot}
        title="View and export complete JSON audit trail of selected group and borrower"
        aria-label="Export Evidence Trail JSON"
        style={{
          height: '28px',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          padding: '0 var(--space-8)',
        }}
      >
        Export Evidence Trail
      </button>

      {/* Slide-over Evidence Export View (z-index 60) */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 13, 18, 0.85)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 'var(--z-modal)' as any,
            backdropFilter: 'blur(4px)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Evidence Export View"
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '640px',
              height: '100%',
              backgroundColor: 'var(--surface-1)',
              borderLeft: '1px solid var(--hairline)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'rgba(0,0,0,0.1) 0px 2px 10px 0px',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Slide-over Header */}
            <div
              style={{
                height: '56px',
                padding: '0 var(--space-24)',
                borderBottom: '1px solid var(--hairline)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--ink-2)',
                    textTransform: 'uppercase',
                  }}
                >
                  Evidence Trail / Audit Dossier
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-0)' }}>
                  {borrower?.displayName} ({borrower?.id.toUpperCase()}) · WK{currentWeek}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
                <button
                  className="btn-secondary"
                  onClick={handleCopyJSON}
                  style={{ height: '28px', fontSize: '11px' }}
                >
                  {copied ? 'Copied ✓' : 'Copy JSON'}
                </button>
                <button
                  className="btn-primary"
                  onClick={handleDownloadJSON}
                  style={{ height: '28px', fontSize: '11px' }}
                >
                  Download .json
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => setIsOpen(false)}
                  style={{ width: '28px', height: '28px', padding: 0 }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* JSON Code Viewer */}
            <div
              style={{
                flex: 1,
                padding: 'var(--space-16)',
                overflowY: 'auto',
                backgroundColor: 'var(--surface-0)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                lineHeight: 1.6,
                color: 'var(--ink-1)',
                userSelect: 'text',
              }}
            >
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {jsonString}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
