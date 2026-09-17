import React, { useMemo } from 'react';
import { AccessibleBorrowerTable } from '../../components/AccessibleBorrowerTable';
import { AttributionDossier } from '../../components/AttributionDossier';
import {
  Borrower,
  Centre,
  JLG,
  StressSnapshot,
  TransientWeeklyMetrics,
  Ward,
} from '../../engine/types';

interface QueuePageProps {
  portfolio: {
    wards: Ward[];
    centres: Centre[];
    jlgs: JLG[];
    borrowers: Borrower[];
  };
  currentWeekSnapshots: Map<string, StressSnapshot>;
  currentTransientMetric: TransientWeeklyMetrics | undefined;
  selectedBorrowerId: string;
  onSelectBorrower: (id: string) => void;
  onOpenInterventionModal?: () => void;
}

export const QueuePage: React.FC<QueuePageProps> = ({
  portfolio,
  currentWeekSnapshots,
  currentTransientMetric,
  selectedBorrowerId,
  onSelectBorrower,
  onOpenInterventionModal,
}) => {
  // Sort borrowers by latent stress (highest first), escalated first
  const sortedBorrowers = useMemo(() => {
    return [...portfolio.borrowers].sort((a, b) => {
      const snapA = currentWeekSnapshots.get(a.id);
      const snapB = currentWeekSnapshots.get(b.id);

      // Escalated first
      const escA = snapA?.isEscalated ? 1 : 0;
      const escB = snapB?.isEscalated ? 1 : 0;
      if (escA !== escB) return escB - escA;

      // Then by latent stress descending
      const stressA = snapA?.latentStress ?? 0;
      const stressB = snapB?.latentStress ?? 0;
      return stressB - stressA;
    });
  }, [portfolio.borrowers, currentWeekSnapshots]);

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

  // Count escalated borrowers for summary
  const escalatedCount = useMemo(() => {
    let count = 0;
    currentWeekSnapshots.forEach(snap => {
      if (snap.isEscalated) count++;
    });
    return count;
  }, [currentWeekSnapshots]);

  const flaggedCount = useMemo(() => {
    let count = 0;
    currentWeekSnapshots.forEach(snap => {
      if (snap.latentStress >= 0.35) count++;
    });
    return count;
  }, [currentWeekSnapshots]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Queue header */}
      <div
        style={{
          padding: 'var(--space-16) var(--space-24)',
          borderBottom: '2.5px solid var(--hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-12)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)' }}>
          <span className="synth-jack" />
          <div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 900,
                fontFamily: 'var(--font-display)',
                color: 'var(--ink-0)',
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
              }}
            >
              Loan Officer Worklist Queue
            </div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ink-2)', marginTop: '2px' }}>
              Ranked by latent contagion stress · 8-signal counterfactual decomposition
            </div>
          </div>
        </div>

        {/* Maximalist Stats Badges */}
        <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            className="status-badge"
            style={{
              backgroundColor: 'var(--surface-1)',
              borderColor: 'var(--induced)',
              boxShadow: '2px 2px 0px var(--induced)',
              color: 'var(--induced)',
            }}
          >
            <span>● ESCALATED:</span>
            <span className="tabular-num" style={{ fontWeight: 900 }}>{escalatedCount}</span>
          </div>

          <div
            className="status-badge"
            style={{
              backgroundColor: 'var(--surface-1)',
              borderColor: 'var(--idio)',
              boxShadow: '2px 2px 0px var(--idio)',
              color: 'var(--idio)',
            }}
          >
            <span>● FLAGGED:</span>
            <span className="tabular-num" style={{ fontWeight: 900 }}>{flaggedCount}</span>
          </div>

          <div
            className="status-badge"
            style={{
              backgroundColor: 'var(--surface-1)',
              borderColor: 'var(--signal)',
              boxShadow: '2px 2px 0px var(--signal)',
              color: 'var(--signal)',
            }}
          >
            <span>● SUPPRESSED:</span>
            <span className="tabular-num" style={{ fontWeight: 900 }}>{flaggedCount - escalatedCount}</span>
          </div>
        </div>
      </div>

      {/* Main content: table + detail rail */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: selectedBorrowerId ? 'minmax(0, 58%) minmax(0, 42%)' : '1fr',
          gap: 'var(--space-16)',
          padding: 'var(--space-16) var(--space-24)',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Borrower worklist */}
        <div style={{ overflow: 'auto', minHeight: 0 }} className="surface-panel">
          <AccessibleBorrowerTable
            borrowers={sortedBorrowers}
            centres={portfolio.centres}
            wards={portfolio.wards}
            jlgs={portfolio.jlgs}
            snapshots={currentWeekSnapshots}
            selectedBorrowerId={selectedBorrowerId}
            onSelectBorrower={onSelectBorrower}
          />
        </div>

        {/* Attribution panel (only when borrower selected) */}
        {selectedBorrowerId && (
          <div style={{ overflow: 'auto', minHeight: 0 }}>
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
          </div>
        )}
      </div>
    </div>
  );
};
