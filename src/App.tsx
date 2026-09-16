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
    borrowerId: 'b-001',
    scenario: 'baseline',
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [activeShock, setActiveShock] = useState<Shock | null>(null);
  const [activeIntervention, setActiveIntervention] = useState<Intervention | null>(null);
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [bottomView, setBottomView] = useState<'matrix' | 'table' | 'closed'>('matrix');

  const portfolio = useMemo(() => {
    return generateSyntheticPortfolio(urlState.seed);
  }, [urlState.seed]);

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

  // Compute 78-week average portfolio stress for Timeline Sequencer Histogram
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
    return portfolio.borrowers.find(b => b.id === urlState.borrowerId) || portfolio.borrowers[0] || null;
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

  // Keyboard shortcut listener: Space to toggle play/pause
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

  const handleApplyShock = (shock: Shock) => {
    setActiveShock(shock);
    setScenario(shock.type);
    setBorrowerId(shock.type === 'borrower' ? shock.targetId : urlState.borrowerId);
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
    setBorrowerId('b-001');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-app)',
        overflow: 'hidden',
      }}
    >
      {/* Top Cockpit Navigation Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          backgroundColor: 'rgba(14, 16, 23, 0.95)',
          borderBottom: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(20px)',
          zIndex: 40,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-signal)', display: 'inline-block', boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)' }} />
            <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
              TREMOR
            </span>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Group-Contagion Diagnostic
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>Mumbai Central & Suburban</span>
            <span>•</span>
            <span className="font-mono-num">{portfolio.wards.length} Wards · {portfolio.centres.length} Centres · {portfolio.borrowers.length} Borrowers</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span>RNG SEED</span>
            <span className="font-mono-num" style={{ color: '#fff', fontWeight: 600 }}>
              {urlState.seed}
            </span>
            <button
              onClick={() => setSeed(urlState.seed === 481516 ? 928374 : 481516)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '11px',
                padding: '0 2px',
              }}
              title="Cycle deterministic seed"
            >
              ⇄
            </button>
          </div>

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

      {/* 78-Week Stress Volume Histogram Sequencer */}
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

      {/* Primary Split View: 62% Network Canvas / 38% Attribution Dossier */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 62%) minmax(0, 38%)',
          gap: '12px',
          padding: '12px 16px',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Left Column: Network Canvas + Scenario Injections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', minHeight: 0 }}>
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <CanvasGraph
              wards={portfolio.wards}
              centres={portfolio.centres}
              jlgs={portfolio.jlgs}
              borrowers={portfolio.borrowers}
              edges={portfolio.edges}
              currentWeekSnapshots={currentWeekSnapshots}
              selectedBorrowerId={urlState.borrowerId}
              onSelectBorrower={id => setBorrowerId(id)}
              cascadeOriginBorrowerId={activeShock?.type === 'borrower' ? activeShock.targetId : 'b-001'}
            />
          </div>

          <ScenarioDrawer
            wards={portfolio.wards}
            officers={portfolio.officers}
            activeShock={activeShock}
            currentWeek={urlState.week}
            onApplyShock={handleApplyShock}
            onClearShock={handleClearShock}
            onApplyPolicyPreset={handleApplyPolicyPreset}
          />
        </div>

        {/* Right Column: Three-Way Causal Attribution Dossier */}
        <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
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
        </div>
      </div>

      {/* Bottom Collapsible Ledger & Exposure Tray Bar */}
      <footer
        style={{
          flexShrink: 0,
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className={`btn-action ${bottomView === 'matrix' ? 'active' : ''}`}
              onClick={() => setBottomView(bottomView === 'matrix' ? 'closed' : 'matrix')}
              style={{ fontSize: '11px', height: '24px' }}
            >
              Ward Exposure Matrix (F12)
            </button>
            <button
              className={`btn-action ${bottomView === 'table' ? 'active' : ''}`}
              onClick={() => setBottomView(bottomView === 'table' ? 'closed' : 'table')}
              style={{ fontSize: '11px', height: '24px' }}
            >
              Borrower Ledger Table
            </button>
          </div>

          {bottomView !== 'closed' && (
            <button
              onClick={() => setBottomView('closed')}
              className="btn-action"
              style={{ fontSize: '10px', height: '22px', border: 'none', background: 'none', color: 'var(--text-muted)' }}
            >
              Collapse ✕
            </button>
          )}
        </div>

        {/* Expanded Drawer Surface */}
        {bottomView !== 'closed' && (
          <div style={{ maxHeight: '240px', overflowY: 'auto', borderTop: '1px solid var(--border-subtle)' }}>
            {bottomView === 'matrix' ? (
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

      {/* Intervention Trajectory Simulator Modal */}
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
