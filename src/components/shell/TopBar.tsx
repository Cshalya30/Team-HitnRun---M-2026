import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import { EvidenceExport } from '../EvidenceExport';
import { Borrower, Centre, Ward, JLG, StressSnapshot, Intervention } from '../../engine/types';

interface TopBarProps {
  seed: number;
  onCycleSeed: () => void;
  onDemoShortcut: () => void;
  selectedBorrower: Borrower | null;
  selectedCentre: Centre | null;
  selectedWard: Ward | null;
  selectedJlg: JLG | null;
  selectedSnapshot: StressSnapshot | null;
  currentWeek: number;
  activeRoute: string;
  portfolioStats: { wards: number; centres: number; borrowers: number };
  activeIntervention?: Intervention | null;
  onClearIntervention?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  seed,
  onCycleSeed,
  onDemoShortcut,
  selectedBorrower,
  selectedCentre,
  selectedWard,
  selectedJlg,
  selectedSnapshot,
  currentWeek,
  activeRoute,
  portfolioStats,
  activeIntervention,
  onClearIntervention,
}) => {
  return (
    <>
      <header
        className="boot-topbar"
        style={{
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--space-24)',
          backgroundColor: 'var(--surface-0)',
          borderBottom: '2.5px solid var(--hairline)',
          zIndex: 'var(--z-sticky)' as any,
          flexShrink: 0,
        }}
      >
        {/* Left: Wordmark · Breadcrumb · Plain-text Portfolio Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '18px',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                color: 'var(--ink-0)',
                textTransform: 'uppercase',
              }}
            >
              TREMOR
            </span>
            <span style={{ color: 'var(--idio)', fontWeight: 900 }}>///</span>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                color: 'var(--ink-0)',
                backgroundColor: 'var(--surface-1)',
                padding: '2px 8px',
                border: '1.5px solid var(--hairline)',
                borderRadius: '3px',
                textTransform: 'uppercase',
              }}
            >
              {activeRoute}
            </span>
          </div>

          <div
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--ink-1)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-8)',
            }}
          >
            <span style={{ color: 'var(--ink-0)', fontWeight: 700 }}>MUMBAI & THANE</span>
            <span>·</span>
            <span className="tabular-num">
              {portfolioStats.wards} WARDS · {portfolioStats.centres} CENTRES · {portfolioStats.borrowers} NODES
            </span>
          </div>
        </div>

        {/* Right: Theme Toggle · Active Intervention · PROC SEED · Demo Shortcut · Evidence Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)' }}>
          {activeIntervention && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#000000',
                border: '2px solid var(--signal)',
                borderRadius: 'var(--radius-control)',
                boxShadow: '2px 2px 0px var(--signal)',
                padding: '3px 8px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                color: 'var(--signal)',
              }}
            >
              <span>● ACTIVE: {activeIntervention.title.split('&')[0].trim().toUpperCase()}</span>
              {onClearIntervention && (
                <button
                  onClick={onClearIntervention}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--signal)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 900,
                    padding: '0 2px',
                  }}
                  title="Clear active intervention"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          <ThemeToggle />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-6)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              backgroundColor: 'var(--surface-1)',
              border: '2px solid var(--hairline)',
              boxShadow: '2px 2px 0px var(--hairline)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-control)',
            }}
          >
            <span style={{ color: 'var(--ink-2)' }}>SEED</span>
            <span className="tabular-num" style={{ color: 'var(--ink-0)', fontWeight: 800 }}>
              {seed}
            </span>
            <button
              onClick={onCycleSeed}
              className="btn-ghost"
              style={{ padding: '0 4px', height: '20px', fontSize: '12px', color: 'var(--idio)', fontWeight: 900 }}
              title="Cycle deterministic seed"
            >
              ⇄
            </button>
          </div>

          <button
            className="btn-primary"
            onClick={onDemoShortcut}
            style={{
              height: '30px',
              padding: '0 12px',
              fontSize: '11px',
            }}
            title="Jump directly to demo state: Week 22, Sunita K. (b-413), Lakshmi Shock"
          >
            DEMO: SUNITA W22
          </button>

          <EvidenceExport
            seed={seed}
            currentWeek={currentWeek}
            borrower={selectedBorrower}
            centre={selectedCentre}
            ward={selectedWard}
            jlg={selectedJlg}
            snapshot={selectedSnapshot}
          />
        </div>
      </header>

      {/* Maximalist Scrolling Ticker Tape Marquee */}
      <div
        className="maximalist-ticker"
        style={{
          borderBottom: '2.5px solid var(--hairline)',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            animation: 'marquee 30s linear infinite',
          }}
        >
          <span>
            ⚡ TREMOR CONTAGION RISK ENGINE ⚡ 5,245 BORROWERS · 30 WARDS · 177 CENTRES · 78 WEEKS TIMELINE ⚡ REAL-TIME LATENT PROPAGATION ⚡ 3-CHANNEL COUNTERFACTUAL ABLATION ⚡ TRANSIENT FALSE-POSITIVE SUPPRESSION ⚡ RBI & MFIN CALIBRATED ⚡
          </span>
          <span style={{ marginLeft: '48px' }}>
            ⚡ TREMOR CONTAGION RISK ENGINE ⚡ 5,245 BORROWERS · 30 WARDS · 177 CENTRES · 78 WEEKS TIMELINE ⚡ REAL-TIME LATENT PROPAGATION ⚡ 3-CHANNEL COUNTERFACTUAL ABLATION ⚡ TRANSIENT FALSE-POSITIVE SUPPRESSION ⚡ RBI & MFIN CALIBRATED ⚡
          </span>
        </div>
        <style>
          {`
            @keyframes marquee {
              0% { transform: translateX(0%); }
              100% { transform: translateX(-50%); }
            }
          `}
        </style>
      </div>
    </>
  );
};
