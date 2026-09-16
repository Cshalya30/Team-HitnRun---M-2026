import React, { useState } from 'react';
import { WardAggregate } from '../engine/types';

interface WardHeatMatrixProps {
  wardAggregates: WardAggregate[];
  selectedWardId?: string | null;
  onSelectWard?: (wardId: string) => void;
}

type SortField = 'name' | 'flaggedCount' | 'escalatedCount' | 'avgLatentStress' | 'contagionVelocity';

export const WardHeatMatrix: React.FC<WardHeatMatrixProps> = ({
  wardAggregates,
  selectedWardId,
  onSelectWard,
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
        padding: '16px 20px',
        backgroundColor: 'var(--surface-1)',
        borderRadius: 'var(--radius-panel)',
        border: '1px solid var(--hairline)',
        width: '100%',
        overflowX: 'auto',
      }}
      role="region"
      aria-label="Ward Contagion Matrix"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-1)' }}>
          Ward Contagion Exposure Matrix (F12)
        </span>
        <span style={{ fontSize: '11px', color: 'var(--ink-2)' }}>
          Sortable · Click row to focus
        </span>
      </div>

      <table className="dense-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
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
            <th>Dominant Channel</th>
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
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.04)' : undefined,
                }}
              >
                <td style={{ fontWeight: 500, color: 'var(--ink-0)' }}>{w.name}</td>
                <td style={{ textAlign: 'right' }} className="mono-num">{w.totalBorrowers}</td>
                <td style={{ textAlign: 'right' }} className="mono-num">
                  <span style={{ color: w.flaggedCount > 0 ? 'var(--idio)' : 'var(--ink-1)' }}>
                    {w.flaggedCount}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }} className="mono-num">
                  <span style={{ color: w.escalatedCount > 0 ? 'var(--induced)' : 'var(--ink-1)', fontWeight: 600 }}>
                    {w.escalatedCount}
                  </span>
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    color: w.avgLatentStress >= 0.35 ? 'var(--induced)' : w.avgLatentStress >= 0.2 ? 'var(--idio)' : 'var(--ink-0)',
                    fontWeight: 600,
                  }}
                  className="mono-num"
                >
                  {avgStressPct}%
                </td>
                <td style={{ textAlign: 'right' }} className="mono-num">
                  {w.contagionVelocity.toFixed(1)}x
                </td>
                <td>
                  <span className="badge-pill" style={{ textTransform: 'uppercase', fontSize: '10px' }}>
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
