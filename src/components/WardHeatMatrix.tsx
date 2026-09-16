import React, { useState } from 'react';
import { WardAggregate } from '../engine/types';

interface WardHeatMatrixProps {
  wardAggregates: WardAggregate[];
  selectedWardId?: string | null;
  onSelectWard?: (wardId: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

type SortField = 'name' | 'flaggedCount' | 'escalatedCount' | 'avgLatentStress' | 'contagionVelocity';

export const WardHeatMatrix: React.FC<WardHeatMatrixProps> = ({
  wardAggregates,
  selectedWardId,
  onSelectWard,
  isLoading = false,
  error = null,
}) => {
  const [sortField, setSortField] = useState<SortField>('avgLatentStress');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // 1. Loading State: 32px skeleton rows, no shimmer
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
        aria-label="Loading Ward Contagion Exposure Matrix"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: '32px',
                backgroundColor: 'var(--surface-2)',
                borderRadius: '0px',
              }}
            />
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
        Error loading ward exposure matrix: {error}
      </div>
    );
  }

  // 3. Empty State
  if (wardAggregates.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--space-24)',
          backgroundColor: 'var(--surface-1)',
          borderRadius: 'var(--radius-table)',
          borderTop: '1px solid var(--hairline)',
          textAlign: 'center',
          color: 'var(--ink-1)',
          fontSize: '12px',
        }}
        role="region"
      >
        No wards match the current filter.
      </div>
    );
  }

  // 4. Loaded State
  const sortedWards = [...wardAggregates].sort((a, b) => {
    let diff = 0;
    if (sortField === 'name') {
      diff = a.name.localeCompare(b.name);
    } else {
      diff = (a[sortField] as number) - (b[sortField] as number);
    }
    return sortAsc ? diff : -diff;
  });

  return (
    <div
      style={{
        padding: 'var(--space-12) var(--space-16)',
        backgroundColor: 'var(--surface-1)',
        borderRadius: 'var(--radius-table)',
        borderTop: '1px solid var(--hairline)',
        width: '100%',
        overflowX: 'auto',
      }}
      role="region"
      aria-label="Ward Contagion Exposure Matrix"
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-8)',
        }}
      >
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
          Ward Contagion Exposure Matrix
        </span>
        <span style={{ fontSize: '11px', color: 'var(--ink-2)' }}>
          Sortable · Click row to focus
        </span>
      </div>

      <table className="dense-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ height: '32px' }}>
            <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', textAlign: 'left' }}>
              Ward Cluster {sortField === 'name' ? (sortAsc ? '↑' : '↓') : ''}
            </th>
            <th style={{ textAlign: 'right' }}>Borrowers</th>
            <th onClick={() => handleSort('flaggedCount')} style={{ textAlign: 'right', cursor: 'pointer' }}>
              Flagged (&gt;35%) {sortField === 'flaggedCount' ? (sortAsc ? '↑' : '↓') : ''}
            </th>
            <th onClick={() => handleSort('escalatedCount')} style={{ textAlign: 'right', cursor: 'pointer' }}>
              Escalated Alerts {sortField === 'escalatedCount' ? (sortAsc ? '↑' : '↓') : ''}
            </th>
            <th onClick={() => handleSort('avgLatentStress')} style={{ textAlign: 'right', cursor: 'pointer' }}>
              Mean Stress {sortField === 'avgLatentStress' ? (sortAsc ? '↑' : '↓') : ''}
            </th>
            <th onClick={() => handleSort('contagionVelocity')} style={{ textAlign: 'right', cursor: 'pointer' }}>
              Contagion Velocity {sortField === 'contagionVelocity' ? (sortAsc ? '↑' : '↓') : ''}
            </th>
            <th style={{ textAlign: 'left' }}>Dominant Channel</th>
          </tr>
        </thead>
        <tbody>
          {sortedWards.map(w => {
            const isSelected = selectedWardId === w.wardId;
            const avgStressPct = (w.avgLatentStress * 100).toFixed(1);

            return (
              <tr
                key={w.wardId}
                onClick={() => onSelectWard && onSelectWard(w.wardId)}
                style={{
                  height: '32px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'var(--surface-2)' : 'transparent',
                  borderBottom: '1px solid var(--hairline)',
                  transition: 'background-color 120ms ease',
                }}
              >
                <td style={{ fontWeight: 500, color: 'var(--ink-0)' }}>{w.name}</td>
                <td style={{ textAlign: 'right' }} className="tabular-num">{w.totalBorrowers}</td>
                <td style={{ textAlign: 'right' }} className="tabular-num">
                  <span style={{ color: w.flaggedCount > 0 ? 'var(--idio)' : 'var(--ink-1)' }}>
                    {w.flaggedCount > 0 ? `● ${w.flaggedCount}` : w.flaggedCount}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }} className="tabular-num">
                  <span style={{ color: w.escalatedCount > 0 ? 'var(--induced)' : 'var(--ink-1)', fontWeight: 500 }}>
                    {w.escalatedCount > 0 ? `▲ ${w.escalatedCount}` : w.escalatedCount}
                  </span>
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    color: w.avgLatentStress >= 0.35 ? 'var(--induced)' : w.avgLatentStress >= 0.2 ? 'var(--idio)' : 'var(--ink-0)',
                    fontWeight: 500,
                  }}
                  className="tabular-num"
                >
                  {avgStressPct}%
                </td>
                <td style={{ textAlign: 'right' }} className="tabular-num">
                  {w.contagionVelocity.toFixed(1)}x
                </td>
                <td>
                  <span
                    className="status-badge"
                    style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      padding: '1px 6px',
                    }}
                  >
                    {w.dominantChannel}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
