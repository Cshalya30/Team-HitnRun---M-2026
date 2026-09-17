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
}

export const QueuePage: React.FC<QueuePageProps> = ({
  portfolio,
  currentWeekSnapshots,
  currentTransientMetric,
  selectedBorrowerId,
  onSelectBorrower,
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
          borderBottom: '1px solid var(--hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--ink-0)',
            }}
          >
            Conversation Queue
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '2px' }}>
            Borrowers needing a conversation this week, ranked by latent stress
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-16)', alignItems: 'center' }}>
          <div className="tabular-num" style={{ fontSize: '12px' }}>
            <span style={{ color: 'var(--induced)', fontWeight: 500 }}>
              {escalatedCount} escalated
            </span>
            <span style={{ color: 'var(--ink-2)', margin: '0 var(--space-8)' }}>/</span>
            <span style={{ color: 'var(--idio)' }}>
              {flaggedCount} flagged
            </span>
            <span style={{ color: 'var(--ink-2)', margin: '0 var(--space-8)' }}>/</span>
            <span style={{ color: 'var(--signal)' }}>
              {flaggedCount - escalatedCount} suppressed
            </span>
          </div>
        </div>
      </div>

      {/* Main content: table + detail rail */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: selectedBorrowerId ? 'minmax(0, 60%) minmax(0, 40%)' : '1fr',
          gap: 'var(--space-16)',
          padding: 'var(--space-16) var(--space-24)',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Borrower worklist */}
        <div style={{ overflow: 'auto', minHeight: 0 }}>
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
              onOpenInterventionModal={() => {
                // No intervention modal on queue page
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
