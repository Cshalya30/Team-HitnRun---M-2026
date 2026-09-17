import React from 'react';
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
    <header
      className="boot-topbar"
      style={{
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-24)',
        backgroundColor: 'var(--surface-0)',
        borderBottom: '1px solid var(--hairline)',
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
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--ink-0)',
            }}
          >
            TREMOR
          </span>
          <span style={{ color: 'var(--hairline)' }}>/</span>
          <span style={{ fontSize: '12px', color: 'var(--ink-1)' }}>
            {activeRoute.charAt(0).toUpperCase() + activeRoute.slice(1)}
          </span>
        </div>

        <div
          style={{
            fontSize: '11px',
            color: 'var(--ink-1)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-8)',
          }}
        >
          <span style={{ color: 'var(--ink-0)', fontWeight: 500 }}>Mumbai Central, Suburban & Thane</span>
          <span>·</span>
          <span>{portfolioStats.wards} wards · {portfolioStats.centres} centres · {portfolioStats.borrowers} borrowers</span>
        </div>
      </div>

      {/* Right: Theme Toggle · Active Intervention · PROC SEED · Demo Shortcut · Evidence Export */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)' }}>
        {activeIntervention && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(20, 122, 82, 0.2)',
              border: '1px solid var(--signal)',
              borderRadius: 'var(--radius-control)',
              padding: '3px 8px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--signal)',
            }}
          >
            <span>● Active: {activeIntervention.title.split('&')[0].trim()}</span>
            {onClearIntervention && (
              <button
                onClick={onClearIntervention}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--signal)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '0 2px',
                }}
                title="Clear active intervention"
              >
                ✕
              </button>
            )}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-6)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--ink-1)',
          }}
        >
          <span>PROC SEED</span>
          <span className="tabular-num" style={{ color: 'var(--ink-0)', fontWeight: 600 }}>
            {seed}
          </span>
          <button
            onClick={onCycleSeed}
            className="btn-ghost"
            style={{ padding: '0 4px', height: '22px', fontSize: '11px', color: 'var(--ink-0)' }}
            title="Cycle deterministic seed"
          >
            ⇄
          </button>
        </div>

        <button
          className="btn-secondary"
          onClick={onDemoShortcut}
          style={{
            height: '28px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            borderColor: 'var(--hairline)',
            backgroundColor: 'var(--surface-2)',
            color: 'var(--ink-0)',
            padding: '0 var(--space-12)',
            cursor: 'pointer',
          }}
          title="Jump directly to demo state: Week 22, Sunita K. (b-413), Lakshmi Shock"
        >
          Demo: Sunita W22
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
  );
};
