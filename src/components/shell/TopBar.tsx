import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import { EvidenceExport } from '../EvidenceExport';
import { Borrower, Centre, Ward, JLG, StressSnapshot } from '../../engine/types';

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
  portfolioStats
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
            color: 'var(--ink-2)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-8)',
          }}
        >
          <span>Mumbai Central, Suburban & Thane</span>
          <span>·</span>
          <span>{portfolioStats.wards} wards · {portfolioStats.centres} centres · {portfolioStats.borrowers} borrowers</span>
        </div>
      </div>

      {/* Right: Theme Toggle · PROC SEED · Demo Shortcut · Evidence Export */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)' }}>
        <ThemeToggle />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-6)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--ink-2)',
          }}
        >
          <span>PROC SEED</span>
          <span className="tabular-num" style={{ color: 'var(--ink-0)', fontWeight: 500 }}>
            {seed}
          </span>
          <button
            onClick={onCycleSeed}
            className="btn-ghost"
            style={{ padding: '0 4px', height: '22px', fontSize: '11px' }}
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
            borderColor: 'var(--focus)',
            color: 'var(--focus)',
            padding: '0 var(--space-8)',
          }}
          title="Jump directly to demo state"
        >
          Demo Shortcut
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
