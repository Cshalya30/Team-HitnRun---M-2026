import React, { useState } from 'react';
import { performCounterfactualAblation } from '../engine/attribution';
import { Borrower, Centre, JLG, StressSnapshot, Ward } from '../engine/types';

interface AttributionDossierProps {
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

export const AttributionDossier: React.FC<AttributionDossierProps> = ({
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
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ height: '24px', width: '60%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
        <div style={{ height: '60px', width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} />
        <div style={{ height: '140px', width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--color-induced)' }}>
        <div style={{ color: 'var(--color-induced)', fontWeight: 600, fontSize: '13px' }}>Diagnostic Error</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>{error}</div>
      </div>
    );
  }

  if (!borrower || !snapshot) {
    return (
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '480px',
          textAlign: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: '18px',
          }}
        >
          ⌖
        </div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>No Borrower Selected</div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '240px', lineHeight: 1.5 }}>
          Select any borrower node on the contagion network map to inspect her causal attribution dossier.
        </div>
      </div>
    );
  }

  const ablation = performCounterfactualAblation(snapshot, borrower.displayName);
  const cb = ablation.confidenceBand;

  const idioPct = Math.round(snapshot.shareIdio * 100);
  const inducedPct = Math.round(snapshot.shareInduced * 100);
  const covPct = Math.round(snapshot.shareCovariate * 100);

  // SVG Monte Carlo Bell Curve Generator
  const curvePoints = Array.from({ length: 41 }).map((_, i) => {
    const x = i; // 0 to 40
    const normX = (x - 20) / 6;
    const y = Math.exp(-0.5 * normX * normX);
    return `${(x / 40) * 200},${45 - y * 38}`;
  }).join(' ');

  const initials = borrower.displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2);

  return (
    <div
      className="glass-panel"
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: '100%',
        overflowY: 'auto',
      }}
      role="region"
      aria-label={`Diagnostic Dossier for ${borrower.displayName}`}
    >
      {/* Borrower Profile Hero */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #1E2230 0%, #11131A 100%)',
            border: '1px solid var(--border-medium)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '13px',
            color: '#fff',
            flexShrink: 0,
            letterSpacing: '0.02em',
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#fff', letterSpacing: '-0.02em' }}>
              {borrower.displayName}
            </h2>
            <span className="chip">{borrower.id.toUpperCase()}</span>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {borrower.occupation} · Cycle {borrower.loanCycle}
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {jlg?.name.split('(')[0].trim()} · {centre?.name.split('Centre')[0].trim()}
          </div>
        </div>
      </div>

      {/* Latent Stress KPI Display */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            Latent Stress Exposure
          </div>
          <div
            className="font-mono-num"
            style={{
              fontSize: '34px',
              fontWeight: 700,
              color:
                snapshot.latentStress >= 0.45
                  ? 'var(--color-induced)'
                  : snapshot.latentStress >= 0.35
                  ? 'var(--color-idio)'
                  : 'var(--color-signal)',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              marginTop: '2px',
            }}
          >
            {(snapshot.latentStress * 100).toFixed(1)}%
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span
            className="chip"
            style={{
              borderColor: snapshot.isEscalated ? 'rgba(244, 63, 94, 0.4)' : 'var(--border-subtle)',
              color: snapshot.isEscalated ? 'var(--color-induced)' : 'var(--text-secondary)',
              backgroundColor: snapshot.isEscalated ? 'rgba(244, 63, 94, 0.08)' : 'rgba(255, 255, 255, 0.03)',
            }}
          >
            {snapshot.isEscalated ? '● ESCALATED' : '○ NOISE SUPPRESSED'}
          </span>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Overdue: <strong className="font-mono-num" style={{ color: '#fff' }}>{snapshot.dpd} Days</strong>
          </div>
        </div>
      </div>

      {/* Three-Way Causal Attribution Breakdown */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            Causal Attribution Decomposition
          </span>
          <span className="font-mono-num" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            200 MC Runs ({cb.durationMs}ms)
          </span>
        </div>

        {/* Stacked Segment Bar with Soft Inner Glow */}
        <div
          style={{
            display: 'flex',
            height: '8px',
            borderRadius: '999px',
            overflow: 'hidden',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            marginBottom: '12px',
          }}
        >
          <div style={{ width: `${idioPct}%`, backgroundColor: 'var(--color-idio)' }} title={`Idiosyncratic: ${idioPct}%`} />
          <div style={{ width: `${inducedPct}%`, backgroundColor: 'var(--color-induced)' }} title={`Induced: ${inducedPct}%`} />
          <div style={{ width: `${covPct}%`, backgroundColor: 'var(--color-covariate)' }} title={`Covariate: ${covPct}%`} />
        </div>

        {/* Split Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--color-idio)' }} />
              Idiosyncratic (Personal Shock)
            </span>
            <div>
              <span className="font-mono-num" style={{ fontWeight: 600, color: 'var(--color-idio)' }}>{idioPct}%</span>
              <span className="font-mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                [{Math.round(cb.idioCiLow * 100)}%–{Math.round(cb.idioCiHigh * 100)}%]
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '7px', height: '7px', backgroundColor: 'var(--color-induced)', transform: 'rotate(45deg)', display: 'inline-block' }} />
              Induced (Group Peer Transmission)
            </span>
            <div>
              <span className="font-mono-num" style={{ fontWeight: 600, color: 'var(--color-induced)' }}>{inducedPct}%</span>
              <span className="font-mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                [{Math.round(cb.inducedCiLow * 100)}%–{Math.round(cb.inducedCiHigh * 100)}%]
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '7px', height: '7px', backgroundColor: 'var(--color-covariate)' }} />
              Covariate (Ward Macro Factor)
            </span>
            <div>
              <span className="font-mono-num" style={{ fontWeight: 600, color: 'var(--color-covariate)' }}>{covPct}%</span>
              <span className="font-mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                [{Math.round(cb.covariateCiLow * 100)}%–{Math.round(cb.covariateCiHigh * 100)}%]
              </span>
            </div>
          </div>
        </div>

        {/* Transmission Origin Highlight */}
        {snapshot.sourceBorrowerName && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 12px',
              backgroundColor: 'rgba(244, 63, 94, 0.05)',
              borderLeft: '3px solid var(--color-induced)',
              borderRadius: '0 6px 6px 0',
              fontSize: '11px',
            }}
          >
            <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '10px', fontWeight: 600 }}>
              Primary Transmission Vector
            </div>
            <div style={{ color: '#fff', marginTop: '2px' }}>
              Induced from <strong style={{ color: 'var(--color-induced)' }}>{snapshot.sourceBorrowerName}</strong> via{' '}
              <span style={{ textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{snapshot.sourceChannel}</span> channel
            </div>
            {onSelectBorrowerId && snapshot.sourceBorrowerId && (
              <button
                className="btn-action"
                onClick={() => onSelectBorrowerId(snapshot.sourceBorrowerId!)}
                style={{ height: '22px', fontSize: '10px', marginTop: '6px' }}
              >
                Inspect Transmitter ({snapshot.sourceBorrowerName})
              </button>
            )}
          </div>
        )}
      </div>

      {/* SVG Monte Carlo Probability Density Bell Curve */}
      <div
        style={{
          padding: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            Monte Carlo Confidence Distribution (90% CI)
          </span>
          <span className="font-mono-num" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            {(cb.stressCiLow * 100).toFixed(0)}% – {(cb.stressCiHigh * 100).toFixed(0)}%
          </span>
        </div>

        <svg viewBox="0 0 200 48" style={{ width: '100%', height: '36px', overflow: 'visible' }}>
          <defs>
            <linearGradient id="mcGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <polyline fill="none" stroke="var(--color-accent)" strokeWidth="1.5" points={curvePoints} />
          <polygon fill="url(#mcGrad)" points={`0,45 ${curvePoints} 200,45`} />
          {/* Mean marker */}
          <line x1="100" y1="5" x2="100" y2="45" stroke="#fff" strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      </div>

      {/* Signal Contribution Breakdown */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            Signal Contributions
          </span>
          <button
            onClick={() => setShowAllSignals(!showAllSignals)}
            className="btn-action"
            style={{ height: '20px', padding: '0 6px', fontSize: '10px', border: 'none', background: 'none' }}
          >
            {showAllSignals ? 'Top 4' : 'All 8'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {Object.entries(snapshot.signalContributions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, showAllSignals ? 8 : 4)
            .map(([signalName, contribution]) => {
              const labelMap: Record<string, string> = {
                crossPayment: 'Cross-Payment (Proxy EMI)',
                attendance: 'Meeting Attendance Absence',
                instalmentDelay: 'Instalment Delay (DPD)',
                multiLender: 'Multi-Lender Exposure',
                dtiBurden: 'DTI Income Strain',
                loanCycle: 'Loan Cycle Fatigue',
                socialDisruption: 'JLG Social Breakdown',
                seasonalMismatch: 'Seasonal Cashflow Disruption',
              };

              const pct = Math.round(contribution * 1000) / 10;
              return (
                <div key={signalName} style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>{labelMap[signalName] || signalName}</span>
                    <span className="font-mono-num" style={{ color: '#fff' }}>+{pct}%</span>
                  </div>
                  <div
                    style={{
                      height: '3px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, pct * 4)}%`,
                        backgroundColor: signalName === 'crossPayment' ? 'var(--color-induced)' : 'var(--text-secondary)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Action Footer: Launch Intervention Simulator */}
      {onOpenInterventionModal && (
        <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            className="btn-action active"
            onClick={onOpenInterventionModal}
            style={{
              width: '100%',
              height: '36px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#fff',
              color: '#000',
              border: 'none',
              boxShadow: '0 2px 10px rgba(255, 255, 255, 0.15)',
            }}
          >
            Simulate Intervention Trajectory
          </button>
        </div>
      )}
    </div>
  );
};
