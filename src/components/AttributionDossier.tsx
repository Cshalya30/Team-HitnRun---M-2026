import React, { useState, useMemo } from 'react';
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
  onRetry?: () => void;
  onSelectBorrowerId?: (id: string) => void;
  onOpenInterventionModal?: () => void;
}

const SIGNAL_LABELS: Record<string, string> = {
  crossPayment: 'Cross-Payment (Proxy EMI)',
  attendance: 'Meeting Attendance Absence',
  instalmentDelay: 'Instalment Delay (DPD)',
  multiLender: 'Multi-Lender Exposure',
  dtiBurden: 'DTI Income Strain',
  loanCycle: 'Loan Cycle Fatigue',
  socialDisruption: 'JLG Social Breakdown',
  seasonalMismatch: 'Seasonal Cashflow Disruption',
};

const SIGNAL_COLORS: Record<string, string> = {
  crossPayment: 'var(--induced)',
  socialDisruption: 'var(--induced)',
  attendance: 'var(--idio)',
  instalmentDelay: 'var(--idio)',
  loanCycle: 'var(--idio)',
  dtiBurden: 'var(--idio)',
  multiLender: 'var(--idio)',
  seasonalMismatch: 'var(--covariate)',
};

const formatINR = (val: number): string => {
  return '₹' + Math.round(val).toLocaleString('en-IN');
};

const formatCiDelta = (low: number, high: number): string => {
  const halfWidth = Math.max(1, Math.round(((high - low) / 2) * 100));
  return `±${halfWidth}%`;
};

export const AttributionDossier: React.FC<AttributionDossierProps> = ({
  borrower,
  centre,
  ward,
  jlg,
  snapshot,
  isLoading = false,
  error = null,
  onRetry,
  onSelectBorrowerId,
  onOpenInterventionModal,
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<'idio' | 'induced' | 'covariate' | null>(null);

  // Four explicit states: loading, error, empty, loaded

  // 1. Loading State (static skeleton in --surface-2, zero shimmer)
  if (isLoading) {
    return (
      <div
        style={{
          padding: 'var(--space-16)',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--radius-panel)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-16)',
          height: '100%',
        }}
        role="region"
        aria-label="Loading Borrower Dossier"
      >
        {/* Identity Skeleton */}
        <div style={{ display: 'flex', gap: 'var(--space-12)', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-control)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
            <div style={{ height: '16px', width: '50%', backgroundColor: 'var(--surface-2)', borderRadius: '2px' }} />
            <div style={{ height: '12px', width: '70%', backgroundColor: 'var(--surface-2)', borderRadius: '2px' }} />
          </div>
        </div>

        {/* Latent Stress Skeleton */}
        <div style={{ height: '56px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-control)' }} />

        {/* Causal Stacked Bar Skeleton */}
        <div style={{ height: '72px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-control)' }} />

        {/* Bell Curve Skeleton */}
        <div style={{ height: '52px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-control)' }} />

        {/* Signal Rows Skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ height: '18px', backgroundColor: 'var(--surface-2)', borderRadius: '2px' }} />
          ))}
        </div>
      </div>
    );
  }

  // 2. Error State (shows failing step and retry affordance)
  if (error) {
    return (
      <div
        style={{
          padding: 'var(--space-24)',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--danger)',
          borderRadius: 'var(--radius-panel)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-12)',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          textAlign: 'center',
        }}
        role="alert"
      >
        <div style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: 600 }}>
          Attribution Computation Failed
        </div>
        <div style={{ color: 'var(--ink-1)', fontSize: '12px', maxWidth: '300px', lineHeight: 1.5 }}>
          {error}
        </div>
        {onRetry && (
          <button className="btn-secondary" onClick={onRetry} style={{ marginTop: 'var(--space-8)' }}>
            Retry Calculation
          </button>
        )}
      </div>
    );
  }

  // 3. Empty State (Strictly text only: "Select a borrower on the graph to see their attribution." in ink-1, centered, no icon)
  if (!borrower || !snapshot) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 'var(--space-24)',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--radius-panel)',
          textAlign: 'center',
        }}
        role="region"
        aria-label="Borrower Attribution Dossier"
      >
        <div style={{ color: 'var(--ink-1)', fontSize: '13px', lineHeight: 1.5, maxWidth: '280px' }}>
          Select a borrower on the graph to see their attribution.
        </div>
      </div>
    );
  }

  // 4. Loaded State: Pure calculation and clean anatomy
  const ablation = performCounterfactualAblation(snapshot, borrower.displayName);
  const cb = ablation.confidenceBand;

  const idioPct = (snapshot.shareIdio * 100).toFixed(1);
  const inducedPct = (snapshot.shareInduced * 100).toFixed(1);
  const covPct = (snapshot.shareCovariate * 100).toFixed(1);

  // SVG Monte Carlo Bell Curve coordinates (minimum 60px render height)
  const curvePoints = Array.from({ length: 41 })
    .map((_, i) => {
      const x = i;
      const normX = (x - 20) / 6;
      const y = Math.exp(-0.5 * normX * normX);
      return `${(x / 40) * 200},${58 - y * 50}`;
    })
    .join(' ');

  const initials = borrower.displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2);

  // Dominant color mapping
  const dominantColor =
    snapshot.dominantStressType === 'induced'
      ? 'var(--induced)'
      : snapshot.dominantStressType === 'idio'
      ? 'var(--idio)'
      : snapshot.dominantStressType === 'covariate'
      ? 'var(--covariate)'
      : 'var(--ink-0)';

  return (
    <div
      style={{
        padding: 'var(--space-16)',
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-panel)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-16)',
        height: '100%',
        overflowY: 'auto',
        userSelect: 'text',
      }}
      role="region"
      aria-label={`Diagnostic Dossier for ${borrower.displayName}`}
    >
      {/* 1. Identity Block */}
      <div style={{ display: 'flex', gap: 'var(--space-12)', alignItems: 'flex-start' }}>
        {/* Avatar-style Initials Chip */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-control)',
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            fontSize: '13px',
            color: 'var(--ink-0)',
            flexShrink: 0,
            letterSpacing: '0.04em',
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-8)' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--ink-0)',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              {borrower.displayName}
            </h2>
            <span
              className="tabular-num"
              style={{
                fontSize: '11px',
                color: 'var(--ink-2)',
                letterSpacing: '0.02em',
              }}
            >
              {borrower.id.toUpperCase()}
            </span>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--ink-1)', marginTop: '2px', lineHeight: 1.4 }}>
            {borrower.occupation} · Cycle {borrower.loanCycle} · Principal {formatINR(borrower.principal)} · EMI {formatINR(borrower.emi)}/wk
          </div>

          <div style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '2px' }}>
            {jlg?.name ?? 'JLG Group'} · {centre?.name ?? 'Centre'} · {ward?.name ?? 'Ward'}
          </div>
        </div>
      </div>

      {/* 2. Latent Stress Exposure KPI */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          paddingBottom: 'var(--space-12)',
          borderBottom: '1px solid var(--hairline)',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--ink-2)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Latent Stress Exposure
          </div>
          <div
            className="tabular-num"
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: dominantColor,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              marginTop: '4px',
            }}
          >
            {(snapshot.latentStress * 100).toFixed(1)}%
          </div>
        </div>

        {/* Status / Evidence Quality Floating Badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <div
            className="status-badge"
            style={{
              backgroundColor: 'var(--surface-3)',
              borderColor: snapshot.isEscalated ? 'var(--induced)' : 'var(--hairline)',
              color: snapshot.isEscalated ? 'var(--induced)' : 'var(--ink-1)',
              zIndex: 'var(--z-toast)' as any,
            }}
          >
            {snapshot.isEscalated ? '▲ ESCALATED' : '○ NOISE SUPPRESSED'}
          </div>
          <div className="tabular-num" style={{ fontSize: '11px', color: 'var(--ink-1)' }}>
            Overdue: <strong style={{ color: 'var(--ink-0)' }}>{snapshot.dpd} DPD</strong>
          </div>
        </div>
      </div>

      {/* 3. Causal Attribution Decomposition */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--ink-2)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Causal Attribution Decomposition
          </span>
          <span className="tabular-num" style={{ fontSize: '11px', color: 'var(--ink-2)' }}>
            {cb.runs} MC Runs ({cb.durationMs.toFixed(1)}ms)
          </span>
        </div>

        {/* Stacked Segment Bar with Individual Hoverability */}
        <div
          style={{
            display: 'flex',
            height: '10px',
            borderRadius: 'var(--radius-pill)',
            overflow: 'hidden',
            backgroundColor: 'var(--surface-2)',
            marginBottom: 'var(--space-12)',
            border: '1px solid var(--hairline)',
          }}
        >
          <div
            onMouseEnter={() => setHoveredSegment('idio')}
            onMouseLeave={() => setHoveredSegment(null)}
            style={{
              width: `${snapshot.shareIdio * 100}%`,
              backgroundColor: 'var(--idio)',
              opacity: hoveredSegment && hoveredSegment !== 'idio' ? 0.4 : 1,
              transition: 'opacity 120ms ease',
              cursor: 'pointer',
            }}
            title={`Idiosyncratic (Personal): ${idioPct}% ${formatCiDelta(cb.idioCiLow, cb.idioCiHigh)}`}
          />
          <div
            onMouseEnter={() => setHoveredSegment('induced')}
            onMouseLeave={() => setHoveredSegment(null)}
            style={{
              width: `${snapshot.shareInduced * 100}%`,
              backgroundColor: 'var(--induced)',
              opacity: hoveredSegment && hoveredSegment !== 'induced' ? 0.4 : 1,
              transition: 'opacity 120ms ease',
              cursor: 'pointer',
            }}
            title={`Induced (Peer Transmission): ${inducedPct}% ${formatCiDelta(cb.inducedCiLow, cb.inducedCiHigh)}`}
          />
          <div
            onMouseEnter={() => setHoveredSegment('covariate')}
            onMouseLeave={() => setHoveredSegment(null)}
            style={{
              width: `${snapshot.shareCovariate * 100}%`,
              backgroundColor: 'var(--covariate)',
              opacity: hoveredSegment && hoveredSegment !== 'covariate' ? 0.4 : 1,
              transition: 'opacity 120ms ease',
              cursor: 'pointer',
            }}
            title={`Covariate (Ward Macro Factor): ${covPct}% ${formatCiDelta(cb.covariateCiLow, cb.covariateCiHigh)}`}
          />
        </div>

        {/* Color + Shape Paired Rows with ±N Confidence Intervals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
          {/* Idiosyncratic: Circle ● */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '2px 0',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--ink-1)' }}>
              <span style={{ color: 'var(--idio)', fontSize: '10px' }}>●</span>
              <span>Idiosyncratic (Personal)</span>
            </span>
            <div className="tabular-num">
              <span style={{ color: 'var(--ink-0)', fontWeight: 500 }}>{idioPct}%</span>{' '}
              <span style={{ color: 'var(--ink-1)' }}>{formatCiDelta(cb.idioCiLow, cb.idioCiHigh)}</span>
            </div>
          </div>

          {/* Induced: Triangle ▲ */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '2px 0',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--ink-1)' }}>
              <span style={{ color: 'var(--induced)', fontSize: '10px' }}>▲</span>
              <span>Induced (Peer Transmission)</span>
            </span>
            <div className="tabular-num">
              <span style={{ color: 'var(--ink-0)', fontWeight: 500 }}>{inducedPct}%</span>{' '}
              <span style={{ color: 'var(--ink-1)' }}>{formatCiDelta(cb.inducedCiLow, cb.inducedCiHigh)}</span>
            </div>
          </div>

          {/* Covariate: Square ■ */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '2px 0',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--ink-1)' }}>
              <span style={{ color: 'var(--covariate)', fontSize: '10px' }}>■</span>
              <span>Covariate (Ward Macro Factor)</span>
            </span>
            <div className="tabular-num">
              <span style={{ color: 'var(--ink-0)', fontWeight: 500 }}>{covPct}%</span>{' '}
              <span style={{ color: 'var(--ink-1)' }}>{formatCiDelta(cb.covariateCiLow, cb.covariateCiHigh)}</span>
            </div>
          </div>
        </div>

        {/* Transmission Origin Highlight if present */}
        {snapshot.sourceBorrowerName && (
          <div
            style={{
              marginTop: 'var(--space-12)',
              padding: '8px 12px',
              backgroundColor: 'var(--surface-2)',
              borderLeft: '3px solid var(--induced)',
              borderRadius: '0 var(--radius-control) var(--radius-control) 0',
              fontSize: '11px',
            }}
          >
            <div style={{ color: 'var(--ink-2)', textTransform: 'uppercase', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
              Primary Transmission Vector
            </div>
            <div style={{ color: 'var(--ink-0)', marginTop: '2px' }}>
              Transmitted from <strong style={{ color: 'var(--induced)' }}>{snapshot.sourceBorrowerName}</strong> via{' '}
              <span style={{ textTransform: 'uppercase', color: 'var(--ink-1)' }}>{snapshot.sourceChannel}</span> channel
            </div>
            {onSelectBorrowerId && snapshot.sourceBorrowerId && (
              <button
                className="btn-secondary"
                onClick={() => onSelectBorrowerId(snapshot.sourceBorrowerId!)}
                style={{ height: '22px', fontSize: '10px', marginTop: '6px', padding: '0 6px' }}
              >
                Inspect Transmitter ({snapshot.sourceBorrowerName})
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Monte Carlo Confidence Distribution Bell Curve */}
      <div
        style={{
          padding: 'var(--space-12)',
          backgroundColor: 'var(--surface-2)',
          borderRadius: 'var(--radius-control)',
          border: '1px solid var(--hairline)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--ink-2)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Monte Carlo Distribution (90% CI)
          </span>
          <span className="tabular-num" style={{ fontSize: '11px', color: 'var(--ink-1)' }}>
            {(cb.stressCiLow * 100).toFixed(0)}% – {(cb.stressCiHigh * 100).toFixed(0)}%
          </span>
        </div>

        <svg viewBox="0 0 200 64" style={{ width: '100%', height: '60px', overflow: 'visible', display: 'block' }}>
          <defs>
            <linearGradient id="bellGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.30" />
              <stop offset="100%" stopColor="var(--signal)" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <polyline fill="none" stroke="var(--signal)" strokeWidth="1.75" points={curvePoints} />
          <polygon fill="url(#bellGrad)" points={`0,58 ${curvePoints} 200,58`} />
          {/* Mean marker */}
          <line x1="100" y1="8" x2="100" y2="58" stroke="var(--ink-0)" strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      </div>

      {/* 5. Ranked Eight-Signal Contribution Rows */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--ink-2)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Signal Contributions (8 Signals)
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {Object.entries(snapshot.signalContributions)
            .sort((a, b) => b[1] - a[1])
            .map(([signalKey, contribution]) => {
              const label = SIGNAL_LABELS[signalKey] || signalKey;
              const pct = (contribution * 100).toFixed(1);
              const barWidthPct = Math.min(100, Math.max(3, contribution * 300));
              const signalColor = SIGNAL_COLORS[signalKey] || 'var(--ink-0)';

              return (
                <div key={signalKey} style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--ink-1)' }}>{label}</span>
                    <span className="tabular-num" style={{ color: 'var(--ink-0)', fontWeight: 500 }}>
                      +{pct}%
                    </span>
                  </div>

                  {/* Magnitude Bar filled at full opacity in matching semantic colour, min 3px height (Part 5) */}
                  <div
                    style={{
                      height: '4px',
                      backgroundColor: 'var(--surface-3)',
                      borderRadius: 'var(--radius-pill)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${barWidthPct}%`,
                        backgroundColor: signalColor,
                        borderRadius: 'var(--radius-pill)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* 6. Primary Action: Simulate Intervention Trajectory */}
      {onOpenInterventionModal && (
        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-12)', borderTop: '1px solid var(--hairline)' }}>
          <button
            className="btn-primary"
            onClick={onOpenInterventionModal}
            style={{
              width: '100%',
              height: '34px',
              fontSize: '13px',
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
