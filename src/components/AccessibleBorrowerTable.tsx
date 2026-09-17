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
  isLoading?: boolean;
  error?: string | null;
}

export const AccessibleBorrowerTable: React.FC<AccessibleBorrowerTableProps> = ({
  borrowers,
  centres,
  wards,
  snapshots,
  selectedBorrowerId,
  onSelectBorrower,
  isLoading = false,
  error = null,
}) => {
  const [filterEscalatedOnly, setFilterEscalatedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Loading State: 32px skeleton rows
  if (isLoading) {
    return (
      <div
        style={{
          padding: 'var(--space-12) var(--space-16)',
          backgroundColor: 'var(--surface-1)',
          borderRadius: 'var(--radius-table)',
          borderTop: '1px solid var(--hairline)',
        }}
        role="region"
        aria-label="Loading Borrower Contagion Ledger"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: '32px', backgroundColor: 'var(--surface-2)', borderRadius: '0px' }} />
          ))}
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div
        style={{
          padding: 'var(--space-16)',
          backgroundColor: 'var(--surface-1)',
          borderRadius: 'var(--radius-table)',
          borderTop: '1px solid var(--danger)',
          color: 'var(--danger)',
          fontSize: '12px',
        }}
        role="alert"
      >
        Error loading borrower ledger: {error}
      </div>
    );
  }

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
        padding: 'var(--space-12) var(--space-16)',
        backgroundColor: 'var(--surface-1)',
        borderRadius: 'var(--radius-table)',
        borderTop: '1px solid var(--hairline)',
        width: '100%',
      }}
      role="region"
      aria-label="Borrower Contagion Ledger"
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-8)',
          flexWrap: 'wrap',
          gap: 'var(--space-8)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--ink-1)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Borrower Contagion Ledger
          </span>
          <span className="tabular-num" style={{ fontSize: '11px', color: 'var(--ink-2)' }}>
            ({rows.length} records)
          </span>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search borrower, ID or ward..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              height: '26px',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-control)',
              color: 'var(--ink-0)',
              padding: '0 var(--space-8)',
              fontSize: '11px',
              fontFamily: 'var(--font-body)',
              outline: 'none',
            }}
          />

          <button
            className={`btn-secondary ${filterEscalatedOnly ? 'active' : ''}`}
            onClick={() => setFilterEscalatedOnly(!filterEscalatedOnly)}
            style={{
              height: '26px',
              fontSize: '11px',
              borderColor: filterEscalatedOnly ? 'var(--induced)' : 'var(--hairline)',
              color: filterEscalatedOnly ? 'var(--ink-0)' : 'var(--ink-1)',
            }}
          >
            {filterEscalatedOnly ? '▲ Escalated Only' : 'Show All'}
          </button>
        </div>
      </div>

      <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
        <table className="dense-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 'var(--z-sticky)' as any }}>
            <tr style={{ height: '32px' }}>
              <th style={{ textAlign: 'left' }}>ID</th>
              <th style={{ textAlign: 'left' }}>Borrower</th>
              <th style={{ textAlign: 'left' }}>Centre</th>
              <th style={{ textAlign: 'right' }}>Latent Stress</th>
              <th style={{ textAlign: 'right' }}>Idio (●)</th>
              <th style={{ textAlign: 'right' }}>Induced (▲)</th>
              <th style={{ textAlign: 'right' }}>Covariate (■)</th>
              <th style={{ textAlign: 'left' }}>Transmission Source</th>
              <th style={{ textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: 'var(--ink-1)', padding: 'var(--space-24)' }}>
                  No borrowers match the current filter.
                </td>
              </tr>
            ) : (
              rows.map(r => {
                const isSelected = selectedBorrowerId === r.borrower.id;
                const stress = r.snapshot?.latentStress ?? 0;
                const stressPct = (stress * 100).toFixed(1);

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
                      height: '32px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'var(--surface-2)' : 'transparent',
                      borderBottom: '1px solid var(--hairline)',
                      outline: isSelected ? '1px solid var(--focus)' : 'none',
                      transition: 'background-color 120ms ease',
                    }}
                  >
                    <td className="tabular-num" style={{ color: 'var(--ink-2)' }}>
                      {r.borrower.id.toUpperCase()}
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--ink-0)' }}>{r.borrower.displayName}</td>
                    <td style={{ color: 'var(--ink-1)', fontSize: '11px' }}>
                      {r.centreName.split('Centre')[0].trim()}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 500,
                        color:
                          stress >= 0.45
                            ? 'var(--induced)'
                            : stress >= 0.35
                            ? 'var(--idio)'
                            : 'var(--ink-0)',
                      }}
                      className="tabular-num"
                    >
                      {stressPct}%
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--idio)' }} className="tabular-num">
                      {(r.snapshot ? r.snapshot.shareIdio * 100 : 0).toFixed(1)}%
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--induced)' }} className="tabular-num">
                      {(r.snapshot ? r.snapshot.shareInduced * 100 : 0).toFixed(1)}%
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--covariate)' }} className="tabular-num">
                      {(r.snapshot ? r.snapshot.shareCovariate * 100 : 0).toFixed(1)}%
                    </td>
                    <td style={{ fontSize: '11px' }}>
                      {r.snapshot?.sourceBorrowerName ? (
                        <span style={{ color: 'var(--induced)' }}>
                          ▲ {r.snapshot.sourceBorrowerName}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--ink-2)' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.snapshot?.isEscalated ? (
                        <span
                          className="status-badge"
                          style={{
                            fontSize: '9px',
                            color: 'var(--induced)',
                            borderColor: 'var(--induced)',
                            padding: '1px 6px',
                          }}
                        >
                          ESCALATED
                        </span>
                      ) : stress >= 0.35 ? (
                        <span
                          className="status-badge"
                          style={{
                            fontSize: '9px',
                            color: 'var(--ink-1)',
                            padding: '1px 6px',
                          }}
                        >
                          SUPPRESSED
                        </span>
                      ) : (
                        <span
                          className="status-badge"
                          style={{
                            fontSize: '9px',
                            color: 'var(--signal)',
                            padding: '1px 6px',
                          }}
                        >
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
