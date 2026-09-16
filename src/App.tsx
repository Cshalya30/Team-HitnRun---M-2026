import React, { useState, useMemo, useEffect } from 'react';
import {
  generateSyntheticPortfolio,
  simulatePortfolioContagion,
  Shock,
  Intervention,
  createPolicyRefinancingCutoffShock,
} from './engine';
import { CanvasGraph } from './graph/CanvasGraph';
import { TimelineSequencer } from './components/TimelineSequencer';
import { AttributionDossier } from './components/AttributionDossier';
import { ScenarioDrawer } from './components/ScenarioDrawer';
import { InterventionSimulator } from './components/InterventionSimulator';
import { WardHeatMatrix } from './components/WardHeatMatrix';
import { EvidenceExport } from './components/EvidenceExport';
import { AccessibleBorrowerTable } from './components/AccessibleBorrowerTable';
import { useUrlState } from './hooks/useUrlState';
import './styles/tokens.css';

export const App: React.FC = () => {
  const { state: urlState, setWeek, setBorrowerId, setScenario, setSeed } = useUrlState({
    seed: 481516,
    week: 12,
    borrowerId: '', // Default to empty per Part 4.4 empty state rule
    scenario: 'baseline',
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [activeShock, setActiveShock] = useState<Shock | null>(null);
  const [activeIntervention, setActiveIntervention] = useState<Intervention | null>(null);
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<'matrix' | 'table'>('matrix');
  const [isTableExpanded, setIsTableExpanded] = useState(false);

  // Portfolio generation
  const portfolio = useMemo(() => {
    return generateSyntheticPortfolio(urlState.seed);
  }, [urlState.seed]);

  // Contagion simulation
  const simulation = useMemo(() => {
    return simulatePortfolioContagion(
      portfolio.wards,
      portfolio.officers,
      portfolio.centres,
      portfolio.jlgs,
      portfolio.borrowers,
      portfolio.edges,
      {
        totalWeeks: 78,
        shock: activeShock,
        intervention: activeIntervention,
      }
    );
  }, [portfolio, activeShock, activeIntervention]);

  // Compute 78-week average portfolio stress for Timeline Sequencer
  const weeklyStressScores = useMemo(() => {
    return Array.from({ length: 78 }).map((_, wIdx) => {
      const snaps = simulation.snapshotsByWeek[wIdx] || [];
      if (snaps.length === 0) return 0.12;
      const total = snaps.reduce((acc, s) => acc + s.latentStress, 0);
      return total / snaps.length;
    });
  }, [simulation]);

  const currentWeekSnapshots = useMemo(() => {
    const weekIndex = Math.min(78, Math.max(1, urlState.week));
    const snapshotsList = simulation.snapshotsByWeek[weekIndex - 1] || [];
    const map = new Map<string, typeof snapshotsList[0]>();
    for (let i = 0; i < snapshotsList.length; i++) {
      map.set(snapshotsList[i].borrowerId, snapshotsList[i]);
    }
    return map;
  }, [simulation, urlState.week]);

  const currentWardAggregates = useMemo(() => {
    const weekIndex = Math.min(78, Math.max(1, urlState.week));
    return simulation.wardAggregatesByWeek[weekIndex - 1] || [];
  }, [simulation, urlState.week]);

  const currentTransientMetric = useMemo(() => {
    const weekIndex = Math.min(78, Math.max(1, urlState.week));
    return simulation.transientMetrics[weekIndex - 1];
  }, [simulation, urlState.week]);

  const selectedBorrower = useMemo(() => {
    if (!urlState.borrowerId) return null;
    return portfolio.borrowers.find(b => b.id === urlState.borrowerId) || null;
  }, [portfolio.borrowers, urlState.borrowerId]);

  const selectedSnapshot = useMemo(() => {
    if (!selectedBorrower) return null;
    return currentWeekSnapshots.get(selectedBorrower.id) || null;
  }, [currentWeekSnapshots, selectedBorrower]);

  const selectedJlg = useMemo(() => {
    if (!selectedBorrower) return null;
    return portfolio.jlgs.find(j => j.id === selectedBorrower.jlgId) || null;
  }, [portfolio.jlgs, selectedBorrower]);

  const selectedCentre = useMemo(() => {
    if (!selectedBorrower) return null;
    return portfolio.centres.find(c => c.id === selectedBorrower.centreId) || null;
  }, [portfolio.centres, selectedBorrower]);

  const selectedWard = useMemo(() => {
    if (!selectedBorrower) return null;
    return portfolio.wards.find(w => w.id === selectedBorrower.wardId) || null;
  }, [portfolio.wards, selectedBorrower]);

  // Scenario handlers
  const handleApplyShock = (shock: Shock) => {
    setActiveShock(shock);
    setScenario(shock.type);
    if (shock.type === 'borrower') {
      setBorrowerId(shock.targetId);
    }
  };

  const handleClearShock = () => {
    setActiveShock(null);
    setActiveIntervention(null);
    setScenario('baseline');
  };

  const handleApplyPolicyPreset = () => {
    const policyShock = createPolicyRefinancingCutoffShock(urlState.week);
    setActiveShock(policyShock);
    setScenario('policy_cutoff');
  };

  // Keyboard shortcut listener for spacebar transport
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle URL scenario='lakshmi-shock' or 'lakshmi_shock'
  useEffect(() => {
    if (urlState.scenario === 'lakshmi-shock' || urlState.scenario === 'lakshmi_shock') {
      setActiveShock({
        type: 'borrower',
        targetId: 'b-411',
        targetName: 'Lakshmi R. (Medical Shock)',
        startWeek: 19,
        magnitude: 0.92,
      });
    }
  }, [urlState.scenario]);

  return (
    <div className="cockpit-container">
      {/* 1. TOP BAR (56px, sticky header z-index 20) */}
      <header
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
              Group-Contagion Diagnostic
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
            <span>Mumbai Central & Suburban</span>
            <span>·</span>
            <span>4 wards · 24 centres · 425 borrowers</span>
          </div>
        </div>

        {/* Right: PROC SEED · Evidence Export Slide-over Trigger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)' }}>
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
              {urlState.seed}
            </span>
            <button
              onClick={() => setSeed(urlState.seed === 481516 ? 928374 : 481516)}
              className="btn-ghost"
              style={{ padding: '0 4px', height: '22px', fontSize: '11px' }}
              title="Cycle deterministic seed"
            >
              ⇄
            </button>
          </div>

          {/* 6. Demo Shortcut Button (Part 6: Week 22, Sunita b-413, Lakshmi Shock) */}
          <button
            className="btn-secondary"
            onClick={() => {
              setSeed(481516);
              setWeek(22);
              setBorrowerId('b-413');
              setScenario('lakshmi-shock');
              setActiveShock({
                type: 'borrower',
                targetId: 'b-411',
                targetName: 'Lakshmi R. (Medical Shock)',
                startWeek: 19,
                magnitude: 0.92,
              });
            }}
            style={{
              height: '28px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              borderColor: 'var(--focus)',
              color: 'var(--focus)',
              padding: '0 var(--space-8)',
            }}
            title="Jump directly to demo state: Week 22, Sunita K. (b-413), Lakshmi Shock"
          >
            ⚡ Demo: Sunita W22
          </button>

          <EvidenceExport
            seed={urlState.seed}
            currentWeek={urlState.week}
            borrower={selectedBorrower}
            centre={selectedCentre}
            ward={selectedWard}
            jlg={selectedJlg}
            snapshot={selectedSnapshot}
          />
        </div>
      </header>

      {/* 2. SCRUBBER (64px, z-index 20) */}
      <TimelineSequencer
        currentWeek={urlState.week}
        totalWeeks={78}
        isPlaying={isPlaying}
        onWeekChange={w => setWeek(w)}
        onTogglePlay={() => setIsPlaying(prev => !prev)}
        onStepForward={() => setWeek(Math.min(78, urlState.week + 1))}
        onStepBackward={() => setWeek(Math.max(1, urlState.week - 1))}
        weeklyStressScores={weeklyStressScores}
      />

      {/* 3. MAIN COCKPIT: Asymmetric 62% (Graph) / 38% (Attribution Rail) Split */}
      <main className="cockpit-main">
        {/* Left Column: Contagion Graph Canvas + Scenario Chips (44px) */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-12)',
            height: '100%',
            minHeight: 0,
          }}
          aria-label="Contagion Network Visualization"
        >
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <CanvasGraph
              wards={portfolio.wards}
              centres={portfolio.centres}
              jlgs={portfolio.jlgs}
              borrowers={portfolio.borrowers}
              edges={portfolio.edges}
              currentWeekSnapshots={currentWeekSnapshots}
              selectedBorrowerId={urlState.borrowerId || null}
              onSelectBorrower={id => setBorrowerId(id)}
              cascadeOriginBorrowerId={activeShock?.type === 'borrower' ? activeShock.targetId : 'b-411'}
              currentWeek={urlState.week}
            />
          </div>

          {/* 4. SCENARIO INJECTION CHIPS (44px) */}
          <ScenarioDrawer
            wards={portfolio.wards}
            officers={portfolio.officers}
            activeShock={activeShock}
            currentWeek={urlState.week}
            onApplyShock={handleApplyShock}
            onClearShock={handleClearShock}
            onApplyPolicyPreset={handleApplyPolicyPreset}
          />
        </section>

        {/* Right Column: Borrower Detail Rail (38% width) */}
        <section
          style={{
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
          aria-label="Borrower Attribution Dossier"
        >
          <AttributionDossier
            borrower={selectedBorrower}
            centre={selectedCentre}
            ward={selectedWard}
            jlg={selectedJlg}
            snapshot={selectedSnapshot}
            transientMetric={currentTransientMetric}
            onSelectBorrowerId={id => setBorrowerId(id)}
            onOpenInterventionModal={() => setIsInterventionModalOpen(true)}
          />
        </section>
      </main>

      {/* 5. TABS & COLLAPSIBLE DATA TABLE DRAWER (36px Tab bar, variable drawer) */}
      <footer
        style={{
          flexShrink: 0,
          borderTop: '1px solid var(--hairline)',
          backgroundColor: 'var(--surface-0)',
          zIndex: 'var(--z-panel)' as any,
        }}
      >
        {/* 36px Tab Bar */}
        <div
          style={{
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 var(--space-24)',
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
            <button
              className={`btn-secondary ${isTableExpanded && bottomTab === 'matrix' ? 'active' : ''}`}
              onClick={() => {
                if (isTableExpanded && bottomTab === 'matrix') {
                  setIsTableExpanded(false);
                } else {
                  setBottomTab('matrix');
                  setIsTableExpanded(true);
                }
              }}
              style={{
                height: '26px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                borderColor: isTableExpanded && bottomTab === 'matrix' ? 'var(--ink-0)' : 'var(--hairline)',
                color: isTableExpanded && bottomTab === 'matrix' ? 'var(--ink-0)' : 'var(--ink-1)',
              }}
            >
              Ward Exposure Matrix
            </button>
            <button
              className={`btn-secondary ${isTableExpanded && bottomTab === 'table' ? 'active' : ''}`}
              onClick={() => {
                if (isTableExpanded && bottomTab === 'table') {
                  setIsTableExpanded(false);
                } else {
                  setBottomTab('table');
                  setIsTableExpanded(true);
                }
              }}
              style={{
                height: '26px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                borderColor: isTableExpanded && bottomTab === 'table' ? 'var(--ink-0)' : 'var(--hairline)',
                color: isTableExpanded && bottomTab === 'table' ? 'var(--ink-0)' : 'var(--ink-1)',
              }}
            >
              Borrower Ledger Table
            </button>
          </div>

          {isTableExpanded && (
            <button
              onClick={() => setIsTableExpanded(false)}
              className="btn-ghost"
              style={{
                fontSize: '11px',
                height: '24px',
                color: 'var(--ink-2)',
              }}
              title="Collapse bottom table drawer"
            >
              Collapse ✕
            </button>
          )}
        </div>

        {/* Expandable Table Container */}
        {isTableExpanded && (
          <div
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              borderTop: '1px solid var(--hairline)',
              backgroundColor: 'var(--surface-1)',
            }}
          >
            {bottomTab === 'matrix' ? (
              <WardHeatMatrix
                wardAggregates={currentWardAggregates}
                selectedWardId={selectedWardId}
                onSelectWard={wId => setSelectedWardId(wId)}
              />
            ) : (
              <AccessibleBorrowerTable
                borrowers={portfolio.borrowers}
                centres={portfolio.centres}
                wards={portfolio.wards}
                jlgs={portfolio.jlgs}
                snapshots={currentWeekSnapshots}
                selectedBorrowerId={urlState.borrowerId}
                onSelectBorrower={id => setBorrowerId(id)}
              />
            )}
          </div>
        )}
      </footer>

      {/* 6. MODAL: Intervention Trajectory Simulator (z-index 60) */}
      {isInterventionModalOpen && selectedBorrower && (
        <InterventionSimulator
          wards={portfolio.wards}
          officers={portfolio.officers}
          centres={portfolio.centres}
          jlgs={portfolio.jlgs}
          borrowers={portfolio.borrowers}
          edges={portfolio.edges}
          activeShock={activeShock}
          targetBorrower={selectedBorrower}
          currentWeek={urlState.week}
          onApplyIntervention={intv => {
            setActiveIntervention(intv);
            setIsInterventionModalOpen(false);
          }}
          onClose={() => setIsInterventionModalOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
