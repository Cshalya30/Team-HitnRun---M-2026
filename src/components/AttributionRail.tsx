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
  isLoading = false,
  error = null,
  onSelectBorrowerId,
  onOpenInterventionModal,
}) => {
  const [showAllSignals, setShowAllSignals] = useState(false);

  if (isLoading) {
    return (
      <div className="surface-panel" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
        <div style={{ width: '45%', height: '24px', backgroundColor: 'var(--surface-2)' }} />
        <div style={{ width: '80%', height: '48px', backgroundColor: 'var(--surface-2)' }} />
        <div style={{ width: '100%', height: '120px', backgroundColor: 'var(--surface-2)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-panel" style={{ border: '2.5px solid var(--induced)' }}>
        <h3 style={{ color: 'var(--induced)', marginBottom: '8px', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
          Attribution Analysis Unavailable
        </h3>
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
          gap: '14px',
        }}
      >
        <span className="synth-jack" style={{ width: '28px', height: '28px' }} />
        <h3 style={{ fontSize: '16px', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--ink-0)', textTransform: 'uppercase' }}>
          Select Borrower
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--ink-1)', maxWidth: '240px', lineHeight: 1.5, fontFamily: 'var(--font-mono)' }}>
          Click any node on the network map to inspect her 3-way causal attribution and patch vectors.
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
        gap: 'var(--space-16)',
        width: '100%',
      }}
      role="region"
      aria-label={`Attribution Diagnostics for ${borrower.displayName}`}
    >
      {/* Borrower Header & Spatial Breadcrumb */}
      <div>
        <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
          {ward?.name.split('·')[1]?.trim()} /// {centre?.name.split('Centre')[0].trim()} /// {jlg?.name.split('(')[0].trim()}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ fontSize: '22px', fontFamily: 'var(--font-display)', fontWeight: 900, color: 'var(--ink-0)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
            {borrower.displayName}
          </h2>
          <span className="brutal-stamp" style={{ backgroundColor: 'var(--surface-0)', color: 'var(--ink-0)' }}>
            {borrower.id.toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ink-1)', marginTop: '4px' }}>
          {borrower.occupation} · CYCLE {borrower.loanCycle} · WEEKLY EMI: ₹{borrower.emi.toLocaleString('en-IN')}
        </div>
      </div>

      {/* Latent Stress Metric Display */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderBottom: '2px solid var(--hairline)',
          paddingBottom: 'var(--space-12)',
        }}
      >
        <div>
          <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Current Latent Stress
          </div>
          <div
            className="mono-num"
            style={{
              fontSize: '34px',
              fontWeight: 900,
              color:
                snapshot.latentStress >= 0.45
                  ? 'var(--induced)'
                  : snapshot.latentStress >= 0.35
                  ? 'var(--idio)'
                  : 'var(--signal)',
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              marginTop: '4px',
            }}
          >
            {(snapshot.latentStress * 100).toFixed(1)}%
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span
            className="brutal-stamp"
            style={{
              backgroundColor: snapshot.isEscalated ? 'var(--induced)' : 'var(--signal)',
              color: snapshot.isEscalated ? '#FFFFFF' : '#000000',
            }}
          >
            {snapshot.isEscalated ? 'ESCALATED ALERT' : 'TRANSIENT NOISE FILTERED'}
          </span>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ink-2)', marginTop: '6px' }}>
            DPD: <strong className="mono-num" style={{ color: 'var(--ink-0)' }}>{snapshot.dpd} DAYS</strong>
          </div>
        </div>
      </div>

      {/* Three-Way Causal Split (Analog Audio Console VU Meter Style) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-0)' }}>
            Causal Attribution Split
          </span>
          <span className="mono-num" style={{ fontSize: '10px', color: 'var(--ink-2)' }}>
            MC 200 ({cb.durationMs}ms)
          </span>
        </div>

        {/* Segmented Analog VU Meter Bar */}
        <div className="vu-meter-track" style={{ marginBottom: '12px' }}>
          {Array.from({ length: 20 }).map((_, i) => {
            const segPct = (i + 1) * 5;
            let activeClass = '';
            if (segPct <= idioPct) {
              activeClass = 'active-yellow';
            } else if (segPct <= idioPct + inducedPct) {
              activeClass = 'active-red';
            } else if (segPct <= 100) {
              activeClass = 'active-green';
            }
            return <div key={i} className={`vu-segment ${activeClass}`} />;
          })}
        </div>

        {/* Causal Breakdown Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--ink-0)', fontWeight: 700 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--idio)', display: 'inline-block' }} />
              Idiosyncratic (Her Own)
            </span>
            <div style={{ textAlign: 'right' }}>
              <span className="mono-num" style={{ fontWeight: 800, color: 'var(--idio)' }}>{idioPct}%</span>
              <span className="mono-num" style={{ fontSize: '10px', color: 'var(--ink-2)', marginLeft: '6px' }}>
                [{Math.round(cb.idioCiLow * 100)}%-{Math.round(cb.idioCiHigh * 100)}%]
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--ink-0)', fontWeight: 700 }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--induced)', transform: 'rotate(45deg)', display: 'inline-block' }} />
              Induced (Group Peer)
            </span>
            <div style={{ textAlign: 'right' }}>
              <span className="mono-num" style={{ fontWeight: 800, color: 'var(--induced)' }}>{inducedPct}%</span>
              <span className="mono-num" style={{ fontSize: '10px', color: 'var(--ink-2)', marginLeft: '6px' }}>
                [{Math.round(cb.inducedCiLow * 100)}%-{Math.round(cb.inducedCiHigh * 100)}%]
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--ink-0)', fontWeight: 700 }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--covariate)', display: 'inline-block' }} />
              Covariate (Ward Macro)
            </span>
            <div style={{ textAlign: 'right' }}>
              <span className="mono-num" style={{ fontWeight: 800, color: 'var(--covariate)' }}>{covPct}%</span>
              <span className="mono-num" style={{ fontSize: '10px', color: 'var(--ink-2)', marginLeft: '6px' }}>
                [{Math.round(cb.covariateCiLow * 100)}%-{Math.round(cb.covariateCiHigh * 100)}%]
              </span>
            </div>
          </div>
        </div>

        {/* Upstream Origin Patch Connector */}
        {snapshot.sourceBorrowerName && (
          <div
            style={{
              marginTop: '14px',
              padding: '10px 12px',
              border: '2px solid var(--induced)',
              borderRadius: 'var(--radius-control)',
              backgroundColor: 'var(--surface-0)',
              boxShadow: '3px 3px 0px var(--induced)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--induced)', fontWeight: 800, textTransform: 'uppercase' }}>
              <span className="synth-jack" />
              <span>PATCH VECTOR: CONTAGION SOURCE</span>
            </div>
            <div style={{ color: 'var(--ink-0)', marginTop: '4px', fontWeight: 600 }}>
              Transmitted from <strong style={{ color: 'var(--induced)' }}>{snapshot.sourceBorrowerName}</strong> via{' '}
              <span style={{ textTransform: 'uppercase', color: 'var(--idio)' }}>{snapshot.sourceChannel}</span> channel
            </div>
            {onSelectBorrowerId && snapshot.sourceBorrowerId && (
              <button
                onClick={() => onSelectBorrowerId(snapshot.sourceBorrowerId!)}
                className="btn-secondary"
                style={{ height: '24px', fontSize: '10px', marginTop: '8px', width: '100%' }}
              >
                INSPECT ORIGIN ({snapshot.sourceBorrowerId.toUpperCase()})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Signal Contributions */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-0)' }}>
            Primary Signal Drivers
          </span>
          <button
            onClick={() => setShowAllSignals(!showAllSignals)}
            className="btn-ghost"
            style={{ height: '20px', padding: '0 6px', fontSize: '10px', color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
          >
            {showAllSignals ? '[-] TOP 4' : '[+] ALL 8'}
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
                <div key={signalName} style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-1)' }}>
                    <span>{labelMap[signalName] || signalName}</span>
                    <span className="mono-num" style={{ color: 'var(--ink-0)', fontWeight: 700 }}>+{pct}%</span>
                  </div>
                  <div
                    style={{
                      height: '6px',
                      backgroundColor: 'var(--surface-0)',
                      border: '1px solid var(--hairline)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, pct * 4)}%`,
                        backgroundColor: signalName === 'crossPayment' ? 'var(--induced)' : 'var(--idio)',
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
        <div style={{ borderTop: '2px solid var(--hairline)', paddingTop: 'var(--space-12)' }}>
          <button
            className="btn-primary"
            onClick={onOpenInterventionModal}
            style={{
              width: '100%',
              height: '42px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
            }}
          >
            SIMULATE INTERVENTION TRAJECTORY
          </button>
        </div>
      )}
    </div>
  );
};
