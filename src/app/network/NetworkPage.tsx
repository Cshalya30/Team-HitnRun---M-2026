import React, { useState, useMemo } from 'react';
import { CanvasGraph } from '../../graph/CanvasGraph';
import { TimelineSequencer } from '../../components/TimelineSequencer';
import { AttributionDossier } from '../../components/AttributionDossier';
import { ScenarioDrawer } from '../../components/ScenarioDrawer';
import {
  Borrower,
  Centre,
  Edge,
  JLG,
  Officer,
  Shock,
  Intervention,
  StressSnapshot,
  TransientWeeklyMetrics,
  Ward,
} from '../../engine/types';

interface NetworkPageProps {
  portfolio: {
    wards: Ward[];
    officers: Officer[];
    centres: Centre[];
    jlgs: JLG[];
    borrowers: Borrower[];
    edges: Edge[];
  };
  currentWeekSnapshots: Map<string, StressSnapshot>;
  currentTransientMetric: TransientWeeklyMetrics | undefined;
  weeklyStressScores: number[];
  currentWeek: number;
  onWeekChange: (w: number) => void;
  selectedBorrowerId: string;
  onSelectBorrower: (id: string) => void;
  activeShock: Shock | null;
  activeIntervention: Intervention | null;
  onApplyShock: (shock: Shock) => void;
  onClearShock: () => void;
  onApplyPolicyPreset: () => void;
  onApplyIntervention: (intv: Intervention) => void;
  onOpenInterventionModal: () => void;
  /** Whether this is the first visit to /network this session (for boot sequence). */
  isFirstVisit: boolean;
  onBootComplete: () => void;
}

export const NetworkPage: React.FC<NetworkPageProps> = ({
  portfolio,
  currentWeekSnapshots,
  currentTransientMetric,
  weeklyStressScores,
  currentWeek,
  onWeekChange,
  selectedBorrowerId,
  onSelectBorrower,
  activeShock,
  activeIntervention,
  onApplyShock,
  onClearShock,
  onApplyPolicyPreset,
  onApplyIntervention: _onApplyIntervention,
  onOpenInterventionModal,
  isFirstVisit,
  onBootComplete,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const selectedBorrower = useMemo(() => {
    if (!selectedBorrowerId) return null;
    return portfolio.borrowers.find(b => b.id === selectedBorrowerId) || null;
  }, [portfolio.borrowers, selectedBorrowerId]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Scrubber */}
      <div className={isFirstVisit ? 'boot-scrubber' : ''}>
        <TimelineSequencer
          currentWeek={currentWeek}
          totalWeeks={78}
          isPlaying={isPlaying}
          onWeekChange={onWeekChange}
          onTogglePlay={() => setIsPlaying(prev => !prev)}
          onStepForward={() => onWeekChange(Math.min(78, currentWeek + 1))}
          onStepBackward={() => onWeekChange(Math.max(1, currentWeek - 1))}
          weeklyStressScores={weeklyStressScores}
        />
      </div>

      {/* Main cockpit: 62% graph / 38% attribution rail */}
      <div className="cockpit-main" style={{ flex: 1, minHeight: 0 }}>
        {/* Left: Graph + scenario chips */}
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
              selectedBorrowerId={selectedBorrowerId || null}
              onSelectBorrower={onSelectBorrower}
              cascadeOriginBorrowerId={activeShock?.type === 'borrower' ? activeShock.targetId : null}
              currentWeek={currentWeek}
              showBootAnimation={isFirstVisit}
              onBootComplete={onBootComplete}
            />
          </div>

          <ScenarioDrawer
            wards={portfolio.wards}
            officers={portfolio.officers}
            activeShock={activeShock}
            currentWeek={currentWeek}
            onApplyShock={onApplyShock}
            onClearShock={onClearShock}
            onApplyPolicyPreset={onApplyPolicyPreset}
          />
        </section>

        {/* Right: Attribution dossier */}
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
            onSelectBorrowerId={onSelectBorrower}
            onOpenInterventionModal={onOpenInterventionModal}
          />
        </section>
      </div>
    </div>
  );
};
