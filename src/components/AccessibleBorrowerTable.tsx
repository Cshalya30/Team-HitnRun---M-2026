import React, { useState } from 'react';
import { Borrower, Centre, JLG, StressSnapshot, Ward } from '../engine/types';

interface AccessibleBorrowerTableProps {
  borrowers: Borrower[];
  centres: Centre[];
  wards: Ward[];
  jlgs: JLG[];
  snapshots: Map<string, StressSnapshot>;
  selectedBorrowerId: string | null;
  onSelectBorrower: (id: string) => void;
}

export const AccessibleBorrowerTable: React.FC<AccessibleBorrowerTableProps> = ({
  borrowers,
  centres,
  wards,
  snapshots,
  selectedBorrowerId,
  onSelectBorrower,
}) => {
  const [filterEscalatedOnly, setFilterEscalatedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const centreMap = new Map(centres.map(c => [c.id, c.name]));
  const wardMap = new Map(wards.map(w => [w.id, w.name]));

  const rows = borrowers
    .map(b => {
      const snap = snapshots.get(b.id);
      return {
        borrower: b,
        snapshot: snap,
        centreName: centreMap.get(b.centreId) || b.centreId,
        wardName: wardMap.get(b.wardId) || b.wardId,
      };
    })
    .filter(row => {
      if (!row.snapshot) return false;
      if (filterEscalatedOnly && !row.snapshot.isEscalated) return false;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        return (
          row.borrower.displayName.toLowerCase().includes(query) ||
          row.borrower.id.toLowerCase().includes(query) ||
          row.wardName.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => (b.snapshot?.latentStress ?? 0) - (a.snapshot?.latentStress ?? 0));

  return (
    <div
      style={{
        padding: '16px 20px',
        backgroundColor: 'var(--surface-1)',
        borderRadius: 'var(--radius-panel)',
        border: '1px solid var(--hairline)',
        width: '100%',
      }}
      role="region"
      aria-label="Borrower Contagion Ledger"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-1)' }}>
            Flagged Borrower Contagion Ledger
          </span>
          <span style={{ fontSize: '11px', color: 'var(--ink-2)', marginLeft: '8px' }}>
            ({rows.length} records)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search borrower or ward..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              height: '28px',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-control)',
              color: 'var(--ink-0)',
              padding: '0 8px',
              fontSize: '11px',
              fontFamily: 'var(--font-body)',
              outline: 'none',
            }}
          />

          <button
            className={`btn-control ${filterEscalatedOnly ? 'active' : ''}`}
            onClick={() => setFilterEscalatedOnly(!filterEscalatedOnly)}
            style={{ height: '28px', fontSize: '11px' }}
          >
            {filterEscalatedOnly ? 'Escalated Only' : 'Show All'}
          </button>
        </div>
      </div>

      <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
        <table className="dense-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Borrower</th>
              <th>Centre</th>
              <th style={{ textAlign: 'right' }}>Latent Stress</th>
              <th style={{ textAlign: 'right' }}>Idio</th>
              <th style={{ textAlign: 'right' }}>Induced</th>
              <th style={{ textAlign: 'right' }}>Covariate</th>
              <th>Transmission Source</th>
              <th style={{ textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: 'var(--ink-2)', padding: '24px' }}>
                  No records matching search.
                </td>
              </tr>
            ) : (
              rows.map(r => {
                const isSelected = selectedBorrowerId === r.borrower.id;
                const stress = r.snapshot?.latentStress ?? 0;
                const stressPct = (stress * 100).toFixed(0);

                return (
                  <tr
                    key={r.borrower.id}
                    tabIndex={0}
                    onClick={() => onSelectBorrower(r.borrower.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectBorrower(r.borrower.id);
                      }
                    }}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.04)' : undefined,
                    }}
                  >
                    <td className="mono-num" style={{ color: 'var(--ink-2)' }}>
                      {r.borrower.id.toUpperCase()}
                    </td>
                    <td style={{ fontWeight: 500 }}>{r.borrower.displayName}</td>
                    <td style={{ color: 'var(--ink-1)', fontSize: '11px' }}>
                      {r.centreName.split('Centre')[0]}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 600,
                        color:
                          stress >= 0.45
                            ? 'var(--induced)'
                            : stress >= 0.35
                            ? 'var(--idio)'
                            : 'var(--ink-0)',
                      }}
                      className="mono-num"
                    >
                      {stressPct}%
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--idio)' }} className="mono-num">
                      {Math.round((r.snapshot?.shareIdio ?? 0) * 100)}%
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--induced)' }} className="mono-num">
                      {Math.round((r.snapshot?.shareInduced ?? 0) * 100)}%
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--covariate)' }} className="mono-num">
                      {Math.round((r.snapshot?.shareCovariate ?? 0) * 100)}%
                    </td>
                    <td style={{ fontSize: '11px' }}>
                      {r.snapshot?.sourceBorrowerName ? (
                        <span style={{ color: 'var(--induced)' }}>
                          {r.snapshot.sourceBorrowerName}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--ink-2)' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.snapshot?.isEscalated ? (
                        <span className="badge-pill badge-induced" style={{ fontSize: '10px' }}>
                          ESCALATED
                        </span>
                      ) : stress >= 0.35 ? (
                        <span className="badge-pill" style={{ fontSize: '10px' }}>
                          SUPPRESSED
                        </span>
                      ) : (
                        <span className="badge-pill badge-signal" style={{ fontSize: '10px' }}>
                          CALM
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
