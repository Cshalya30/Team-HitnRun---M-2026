import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  generateSyntheticPortfolio,
  simulatePortfolioContagion,
  Shock,
  Intervention,
  createPolicyRefinancingCutoffShock,
} from './engine';
import { TopBar } from './components/shell/TopBar';
import { RouteNav } from './components/shell/RouteNav';
import { NetworkPage } from './app/network/NetworkPage';
import { QueuePage } from './app/queue/QueuePage';
import { PortfolioPage } from './app/portfolio/PortfolioPage';
import { SystemPage } from './app/system/SystemPage';
import { InterventionSimulator } from './components/InterventionSimulator';
import { useUrlState } from './hooks/useUrlState';
import './styles/tokens.css';

export const App: React.FC = () => {
  const { state: urlState, setWeek, setBorrowerId, setScenario, setSeed, setRoute } = useUrlState({
    seed: 481516,
    week: 12,
    borrowerId: '',
    scenario: 'baseline',
  });

  const [activeShock, setActiveShock] = useState<Shock | null>(null);
  const [activeIntervention, setActiveIntervention] = useState<Intervention | null>(null);
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);

  const [networkFirstVisit, setNetworkFirstVisit] = useState(true);

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


  const currentTransientMetric = useMemo(() => {
    const weekIndex = Math.min(78, Math.max(1, urlState.week));
    return simulation.transientMetrics[weekIndex - 1];
  }, [simulation, urlState.week]);

  // Selected borrower lookups for TopBar
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

  const handleDemoShortcut = () => {
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
    setRoute('network');
  };

  // Keyboard shortcut listener for spacebar transport
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space' && urlState.route === 'network') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [urlState.route]);

  // Handle URL scenario='lakshmi-shock'
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

  const handleBootComplete = () => {
    setNetworkFirstVisit(false);
  };

  // Determine if this is a first visit to network (boot sequence check)
  const isNetworkFirstVisit = urlState.route === 'network' && networkFirstVisit;

  // Render active route
  const renderRoute = () => {
    switch (urlState.route) {
      case 'queue':
        return (
          <QueuePage
            portfolio={portfolio}
            currentWeekSnapshots={currentWeekSnapshots}
            currentTransientMetric={currentTransientMetric}
            selectedBorrowerId={urlState.borrowerId}
            onSelectBorrower={setBorrowerId}
            onOpenInterventionModal={() => setIsInterventionModalOpen(true)}
          />
        );
      case 'network':
        return (
          <NetworkPage
            portfolio={portfolio}
            currentWeekSnapshots={currentWeekSnapshots}
            currentTransientMetric={currentTransientMetric}
            weeklyStressScores={weeklyStressScores}
            currentWeek={urlState.week}
            onWeekChange={setWeek}
            selectedBorrowerId={urlState.borrowerId}
            onSelectBorrower={setBorrowerId}
            activeShock={activeShock}
            activeIntervention={activeIntervention}
            onApplyShock={handleApplyShock}
            onClearShock={handleClearShock}
            onApplyPolicyPreset={handleApplyPolicyPreset}
            onApplyIntervention={intv => setActiveIntervention(intv)}
            onOpenInterventionModal={() => setIsInterventionModalOpen(true)}
            isFirstVisit={isNetworkFirstVisit}
            onBootComplete={handleBootComplete}
          />
        );
      case 'portfolio':
        return (
          <PortfolioPage
            portfolio={portfolio}
            simulation={simulation}
            currentWeek={urlState.week}
            onApplyPolicyPreset={handleApplyPolicyPreset}
            activeShock={activeShock}
          />
        );
      case 'system':
        return <SystemPage />;
      case '404':
        return (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 'var(--space-16)',
              color: 'var(--ink-0)',
              fontFamily: 'var(--font-body)',
              textAlign: 'center',
              padding: 'var(--space-24)',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '32px', fontWeight: 700 }}>404</div>
            <div style={{ color: 'var(--ink-1)', fontSize: '14px' }}>Route not found</div>
            <div style={{ color: 'var(--ink-2)', fontSize: '12px' }}>
              Available routes: /queue · /network · /portfolio · /system
            </div>
            <button className="btn-primary" onClick={() => setRoute('network')}>
              Return to Network
            </button>
          </div>
        );
      default:
        return (
          <NetworkPage
            portfolio={portfolio}
            currentWeekSnapshots={currentWeekSnapshots}
            currentTransientMetric={currentTransientMetric}
            weeklyStressScores={weeklyStressScores}
            currentWeek={urlState.week}
            onWeekChange={setWeek}
            selectedBorrowerId={urlState.borrowerId}
            onSelectBorrower={setBorrowerId}
            activeShock={activeShock}
            activeIntervention={activeIntervention}
            onApplyShock={handleApplyShock}
            onClearShock={handleClearShock}
            onApplyPolicyPreset={handleApplyPolicyPreset}
            onApplyIntervention={intv => setActiveIntervention(intv)}
            onOpenInterventionModal={() => setIsInterventionModalOpen(true)}
            isFirstVisit={isNetworkFirstVisit}
            onBootComplete={handleBootComplete}
          />
        );
    }
  };

  return (
    <div className="cockpit-container">
      <TopBar
        seed={urlState.seed}
        onCycleSeed={() => setSeed(urlState.seed === 481516 ? 928374 : 481516)}
        onDemoShortcut={handleDemoShortcut}
        selectedBorrower={selectedBorrower}
        selectedCentre={selectedCentre}
        selectedWard={selectedWard}
        selectedJlg={selectedJlg}
        selectedSnapshot={selectedSnapshot}
        currentWeek={urlState.week}
        activeRoute={urlState.route}
        portfolioStats={{
          wards: portfolio.wards.length,
          centres: portfolio.centres.length,
          borrowers: portfolio.borrowers.length,
        }}
        activeIntervention={activeIntervention}
        onClearIntervention={() => setActiveIntervention(null)}
      />

      <RouteNav
        activeRoute={urlState.route}
        onRouteChange={setRoute}
      />

      {/* Route content area with 280ms transition per §4.1 */}
      <div style={{ flex: 1, minHeight: 0, overflow: urlState.route === 'system' ? 'auto' : 'hidden' }}>
        <div key={urlState.route} className="route-enter" style={{ height: '100%' }}>
          {renderRoute()}
        </div>
      </div>

      {/* Hoisted Intervention Simulator Modal (rendered at root to avoid CSS transform stacking clipping) */}
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
          baselineSnapshots={simulation.snapshotsByBorrower.get(selectedBorrower.id)}
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
