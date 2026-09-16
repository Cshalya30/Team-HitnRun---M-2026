import React, { useState, useMemo, useEffect } from 'react';
import {
  generateSyntheticPortfolio,
  simulatePortfolioContagion,
  Shock,
  Intervention,
  createPolicyRefinancingCutoffShock,
} from './engine';
import { CanvasGraph } from './graph/CanvasGraph';
import { TimeScrubber } from './components/TimeScrubber';
import { AttributionRail } from './components/AttributionRail';
import { ShockInjectionPanel } from './components/ShockInjectionPanel';
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
  const [activeTab, setActiveTab] = useState<'matrix' | 'table'>('matrix');

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
        minHeight: '100vh',
        backgroundColor: 'var(--surface-0)',
      }}
    >
      {/* Sleek Topbar Navigation */}
      <header className="app-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.03em', color: '#fff' }}>
              Tremor
            </span>
            <span style={{ color: 'var(--hairline)' }}>/</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-1)' }}>
              Group Contagion Risk
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--ink-2)' }}>
            <span>Mumbai Central & Suburban</span>
            <span>•</span>
            <span className="mono-num">4 Wards · 24 Centres · {portfolio.borrowers.length} Borrowers</span>
          </div>
        </div>

        {/* Audit, RNG Seed, and Evidence Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--ink-2)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--hairline)',
            }}
          >
            <span>SEED</span>
            <span className="mono-num" style={{ color: 'var(--ink-0)', fontWeight: 600 }}>
              {urlState.seed}
            </span>
            <button
              onClick={() => setSeed(urlState.seed === 481516 ? 928374 : 481516)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ink-1)',
                cursor: 'pointer',
                fontSize: '10px',
                padding: '0 2px',
              }}
              title="Toggle deterministic portfolio seed"
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

      {/* Main Workspace Container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-16)',
          padding: 'var(--space-16) var(--space-24)',
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* Timeline Scrubber (Full Width) */}
        <TimeScrubber
          currentWeek={urlState.week}
          totalWeeks={78}
          isPlaying={isPlaying}
          onWeekChange={w => setWeek(w)}
          onTogglePlay={() => setIsPlaying(prev => !prev)}
          onStepForward={() => setWeek(Math.min(78, urlState.week + 1))}
          onStepBackward={() => setWeek(Math.max(1, urlState.week - 1))}
        />

        {/* Primary Workspace Grid: 62% Contagion Canvas / 38% Attribution Rail */}
        <main
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 62%) minmax(0, 38%)',
            gap: 'var(--space-16)',
            alignItems: 'start',
          }}
          className="tremor-asymmetric-grid"
        >
          {/* Left: 60fps Network Canvas & Scenario Injection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
            <div style={{ height: '560px', width: '100%' }}>
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

            <ShockInjectionPanel
              wards={portfolio.wards}
              officers={portfolio.officers}
              activeShock={activeShock}
              currentWeek={urlState.week}
              onApplyShock={handleApplyShock}
              onClearShock={handleClearShock}
              onApplyPolicyPreset={handleApplyPolicyPreset}
            />
          </div>

          {/* Right: Three-Way Causal Attribution Rail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
            <AttributionRail
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
        </main>

        {/* Lower Multi-View Surface: Ward Exposure Matrix & Accessible Ledger */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--hairline)', paddingBottom: '8px' }}>
            <button
              className={`btn-control ${activeTab === 'matrix' ? 'active' : ''}`}
              onClick={() => setActiveTab('matrix')}
              style={{ border: 'none', background: activeTab === 'matrix' ? 'rgba(255,255,255,0.08)' : 'none' }}
            >
              Ward Exposure Matrix (F12)
            </button>
            <button
              className={`btn-control ${activeTab === 'table' ? 'active' : ''}`}
              onClick={() => setActiveTab('table')}
              style={{ border: 'none', background: activeTab === 'table' ? 'rgba(255,255,255,0.08)' : 'none' }}
            >
              Borrower Ledger Table
            </button>
          </div>

          {activeTab === 'matrix' ? (
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
        </section>
      </div>

      {/* Intervention Simulator Modal */}
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

      <style>{`
        @media (max-width: 1024px) {
          .tremor-asymmetric-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
