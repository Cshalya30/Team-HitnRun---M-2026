import React, { useState } from 'react';
import { performCounterfactualAblation } from '../engine/attribution';
import { Borrower, Centre, JLG, StressSnapshot, Ward } from '../engine/types';

interface AttributionRailProps {
  borrower: Borrower | null;
  centre: Centre | null;
  ward: Ward | null;
  jlg: JLG | null;
  snapshot: StressSnapshot | null;
  transientMetric?: {
    observedAlerts: number;
    suppressedCount: number;
    escalatedCount: number;
  };
  isLoading?: boolean;
  error?: string | null;
  onSelectBorrowerId?: (id: string) => void;
  onOpenInterventionModal?: () => void;
}

export const AttributionRail: React.FC<AttributionRailProps> = ({
  borrower,
  centre,
  ward,
  jlg,
  snapshot,
  transientMetric,
  isLoading = false,
  error = null,
  onSelectBorrowerId,
  onOpenInterventionModal,
}) => {
  const [showAllSignals, setShowAllSignals] = useState(false);

  if (isLoading) {
    return (
      <div className="surface-panel" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
        <div className="skeleton-box" style={{ width: '45%', height: '24px' }} />
        <div className="skeleton-box" style={{ width: '80%', height: '48px' }} />
        <div className="skeleton-box" style={{ width: '100%', height: '120px' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-panel" style={{ border: '1px solid var(--induced)' }}>
        <h3 style={{ color: 'var(--induced)', marginBottom: '8px' }}>Attribution Analysis Unavailable</h3>
        <p style={{ fontSize: '12px', color: 'var(--ink-1)' }}>{error}</p>
      </div>
    );
  }

  if (!borrower || !snapshot) {
    return (
      <div
        className="surface-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '440px',
          textAlign: 'center',
          gap: '12px',
        }}
      >
        <div style={{ color: 'var(--ink-2)', fontSize: '20px' }}>⊙</div>
        <h3 style={{ fontSize: '15px', color: 'var(--ink-0)' }}>Select Borrower</h3>
        <p style={{ fontSize: '12px', color: 'var(--ink-1)', maxWidth: '240px', lineHeight: 1.5 }}>
          Click any node on the contagion network map to inspect her three-way causal attribution.
        </p>
      </div>
    );
  }

  const ablation = performCounterfactualAblation(snapshot, borrower.displayName);
  const cb = ablation.confidenceBand;

  const idioPct = Math.round(snapshot.shareIdio * 100);
  const inducedPct = Math.round(snapshot.shareInduced * 100);
  const covPct = Math.round(snapshot.shareCovariate * 100);

  return (
    <div
      className="surface-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-20)',
        width: '100%',
      }}
      role="region"
      aria-label={`Attribution Diagnostics for ${borrower.displayName}`}
    >
      {/* Borrower Header & Spatial Breadcrumb */}
      <div>
        <div style={{ fontSize: '11px', color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
          {ward?.name.split('·')[1]?.trim()} · {centre?.name.split('Centre')[0].trim()} · {jlg?.name.split('(')[0].trim()}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ fontSize: '20px', color: 'var(--ink-0)', letterSpacing: '-0.02em' }}>
            {borrower.displayName}
          </h2>
          <span className="mono-num" style={{ fontSize: '11px', color: 'var(--ink-2)' }}>
            {borrower.id.toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--ink-1)', marginTop: '2px' }}>
          {borrower.occupation} · Cycle {borrower.loanCycle} · Weekly EMI: ₹{borrower.emi.toLocaleString('en-IN')}
        </div>
      </div>

      {/* Latent Stress Metric Display */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderBottom: '1px solid var(--hairline)',
          paddingBottom: 'var(--space-16)',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Current Latent Stress
          </div>
          <div
            className="mono-num"
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color:
                snapshot.latentStress >= 0.45
                  ? 'var(--induced)'
                  : snapshot.latentStress >= 0.35
                  ? 'var(--idio)'
                  : 'var(--signal)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              marginTop: '4px',
            }}
          >
            {(snapshot.latentStress * 100).toFixed(1)}%
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span
            className="badge-pill"
            style={{
              borderColor: snapshot.isEscalated ? 'rgba(226, 85, 99, 0.4)' : 'var(--hairline)',
              color: snapshot.isEscalated ? 'var(--induced)' : 'var(--ink-1)',
            }}
          >
            {snapshot.isEscalated ? 'ESCALATED ALERT' : 'TRANSIENT NOISE FILTERED'}
          </span>
          <div style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '4px' }}>
            Days Past Due: <strong className="mono-num" style={{ color: 'var(--ink-0)' }}>{snapshot.dpd}d</strong>
          </div>
        </div>
      </div>

      {/* Three-Way Causal Split */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-1)' }}>
            Causal Attribution Split
          </span>
          <span className="mono-num" style={{ fontSize: '11px', color: 'var(--ink-2)' }}>
            MC 200 ({cb.durationMs}ms)
          </span>
        </div>

        {/* Refined Segmented Bar */}
        <div
          style={{
            display: 'flex',
            height: '6px',
            borderRadius: '999px',
            overflow: 'hidden',
            backgroundColor: 'var(--surface-2)',
            marginBottom: '12px',
          }}
        >
          <div style={{ width: `${idioPct}%`, backgroundColor: 'var(--idio)' }} />
          <div style={{ width: `${inducedPct}%`, backgroundColor: 'var(--induced)' }} />
          <div style={{ width: `${covPct}%`, backgroundColor: 'var(--covariate)' }} />
        </div>

        {/* Causal Breakdown Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--ink-1)' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--idio)' }} />
              Idiosyncratic (Her Own)
            </span>
            <div style={{ textAlign: 'right' }}>
              <span className="mono-num" style={{ fontWeight: 600, color: 'var(--idio)' }}>{idioPct}%</span>
              <span className="mono-num" style={{ fontSize: '11px', color: 'var(--ink-2)', marginLeft: '6px' }}>
                [{Math.round(cb.idioCiLow * 100)}%-{Math.round(cb.idioCiHigh * 100)}%]
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--ink-1)' }}>
              <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--induced)', transform: 'rotate(45deg)', display: 'inline-block' }} />
              Induced (Group Peer)
            </span>
            <div style={{ textAlign: 'right' }}>
              <span className="mono-num" style={{ fontWeight: 600, color: 'var(--induced)' }}>{inducedPct}%</span>
              <span className="mono-num" style={{ fontSize: '11px', color: 'var(--ink-2)', marginLeft: '6px' }}>
                [{Math.round(cb.inducedCiLow * 100)}%-{Math.round(cb.inducedCiHigh * 100)}%]
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--ink-1)' }}>
              <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--covariate)' }} />
              Covariate (Ward Macro)
            </span>
            <div style={{ textAlign: 'right' }}>
              <span className="mono-num" style={{ fontWeight: 600, color: 'var(--covariate)' }}>{covPct}%</span>
              <span className="mono-num" style={{ fontSize: '11px', color: 'var(--ink-2)', marginLeft: '6px' }}>
                [{Math.round(cb.covariateCiLow * 100)}%-{Math.round(cb.covariateCiHigh * 100)}%]
              </span>
            </div>
          </div>
        </div>

        {/* Upstream Origin Callout */}
        {snapshot.sourceBorrowerName && (
          <div
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              borderLeft: '2px solid var(--induced)',
              backgroundColor: 'rgba(226, 85, 99, 0.05)',
              borderRadius: '0 6px 6px 0',
              fontSize: '11px',
            }}
          >
            <div style={{ color: 'var(--ink-2)', textTransform: 'uppercase' }}>Contagion Transmission Origin</div>
            <div style={{ color: 'var(--ink-0)', marginTop: '2px' }}>
              Transmitted from <strong style={{ color: 'var(--induced)' }}>{snapshot.sourceBorrowerName}</strong> via{' '}
              <span style={{ textTransform: 'uppercase', color: 'var(--ink-1)' }}>{snapshot.sourceChannel}</span> edge
            </div>
            {onSelectBorrowerId && snapshot.sourceBorrowerId && (
              <button
                onClick={() => onSelectBorrowerId(snapshot.sourceBorrowerId!)}
                className="btn-control"
                style={{ height: '22px', fontSize: '10px', marginTop: '6px', padding: '0 8px' }}
              >
                Inspect Origin Borrower
              </button>
            )}
          </div>
        )}
      </div>

      {/* Signal Contributions */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-1)' }}>
            Primary Signal Drivers
          </span>
          <button
            onClick={() => setShowAllSignals(!showAllSignals)}
            className="btn-control"
            style={{ height: '20px', padding: '0 6px', fontSize: '10px', background: 'none', border: 'none', color: 'var(--ink-2)' }}
          >
            {showAllSignals ? 'Show Top 4' : 'Show All 8'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {Object.entries(snapshot.signalContributions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, showAllSignals ? 8 : 4)
            .map(([signalName, contribution]) => {
              const labelMap: Record<string, string> = {
                crossPayment: 'Cross-Payment / Proxy EMI',
                attendance: 'Meeting Attendance Absence',
                instalmentDelay: 'Instalment Delay (DPD)',
                multiLender: 'Multi-Lender Exposure',
                dtiBurden: 'Debt Burden (DTI Strain)',
                loanCycle: 'Loan Cycle Fatigue',
                socialDisruption: 'JLG Social Breakdown',
                seasonalMismatch: 'Seasonal Cashflow Disruption',
              };

              const pct = Math.round(contribution * 1000) / 10;
              return (
                <div key={signalName} style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-1)' }}>
                    <span>{labelMap[signalName] || signalName}</span>
                    <span className="mono-num" style={{ color: 'var(--ink-0)' }}>+{pct}%</span>
                  </div>
                  <div
                    style={{
                      height: '3px',
                      backgroundColor: 'var(--surface-2)',
                      borderRadius: '999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, pct * 4)}%`,
                        backgroundColor: signalName === 'crossPayment' ? 'var(--induced)' : 'var(--ink-1)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Intervention Trigger */}
      {onOpenInterventionModal && (
        <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 'var(--space-12)' }}>
          <button
            className="btn-control"
            onClick={onOpenInterventionModal}
            style={{
              width: '100%',
              height: '34px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#fff',
              fontWeight: 500,
            }}
          >
            Simulate Intervention Trajectory
          </button>
        </div>
      )}
    </div>
  );
};
