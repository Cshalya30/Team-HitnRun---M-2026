import React, { useState, useMemo } from 'react';
import { Ward, Officer, Centre, JLG, Borrower, Edge, StressSnapshot, WardAggregate, TransientWeeklyMetrics, Shock } from '../../engine/types';
import { WardHeatMatrix } from '../../components/WardHeatMatrix';

interface PortfolioPageProps {
  portfolio: { wards: Ward[]; officers: Officer[]; centres: Centre[]; jlgs: JLG[]; borrowers: Borrower[]; edges: Edge[] };
  simulation: { snapshotsByWeek: StressSnapshot[][]; wardAggregatesByWeek: WardAggregate[][]; transientMetrics: TransientWeeklyMetrics[] };
  currentWeek: number;
  onApplyPolicyPreset: () => void;
  activeShock: Shock | null;
}

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ portfolio, simulation, currentWeek, onApplyPolicyPreset, activeShock }) => {
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);

  // Generate sparkline data for each ward
  const sparklines = useMemo(() => {
    return portfolio.wards.map(ward => {
      // Collect avgLatentStress over 78 weeks
      const points: number[] = [];
      const numWeeks = 78;
      
      for (let w = 0; w < numWeeks; w++) {
        const aggs = simulation.wardAggregatesByWeek[w];
        if (aggs) {
          const wardAgg = aggs.find(a => a.wardId === ward.id);
          points.push(wardAgg ? wardAgg.avgLatentStress : 0);
        } else {
          points.push(0);
        }
      }

      // Build SVG polyline points string (scale to 120x32)
      const maxStress = Math.max(...points, 1);
      const pointsStr = points.map((val, idx) => {
        const x = (idx / (numWeeks - 1)) * 120;
        const y = 32 - (val / maxStress) * 32;
        return `${x},${y}`;
      }).join(' ');

      // Use a distinct colour based on index for the mock "dominant channel colour"
      const colors = ['var(--idio)', 'var(--induced)', 'var(--covariate)', 'var(--signal)'];
      const color = colors[parseInt(ward.id.replace(/\D/g, '')) % colors.length] || 'var(--ink-1)';

      return {
        wardId: ward.id,
        name: ward.name,
        pointsStr,
        color
      };
    });
  }, [portfolio.wards, simulation.wardAggregatesByWeek]);

  return (
    <div style={{ 
      padding: 'var(--space-24)', 
      backgroundColor: 'var(--surface-0)', 
      color: 'var(--ink-0)', 
      fontFamily: 'var(--font-body)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-24)'
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--hairline)', paddingBottom: 'var(--space-16)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', margin: 0 }}>Portfolio Overview</h1>
        <div style={{ fontSize: '12px', color: 'var(--ink-1)', fontFamily: 'var(--font-mono)' }}>Week {currentWeek}</div>
      </header>

      {/* Ward Heat Matrix Full Width */}
      <section style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--radius-panel)', backgroundColor: 'var(--surface-1)', padding: 'var(--space-16)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', margin: '0 0 var(--space-16) 0', color: 'var(--ink-1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ward Stress Matrix</h2>
        <div style={{ width: '100%' }}>
        {simulation.wardAggregatesByWeek[Math.max(0, currentWeek - 1)] && (
             <WardHeatMatrix 
              wardAggregates={simulation.wardAggregatesByWeek[Math.max(0, currentWeek - 1)]} 
              selectedWardId={selectedWardId} 
              onSelectWard={setSelectedWardId} 
            />
          )}
        </div>
      </section>

      <div style={{ display: 'flex', gap: 'var(--space-24)' }}>
        {/* Sparklines */}
        <section style={{ flex: 2, border: '1px solid var(--hairline)', borderRadius: 'var(--radius-panel)', backgroundColor: 'var(--surface-1)', padding: 'var(--space-16)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', margin: '0 0 var(--space-16) 0', color: 'var(--ink-1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ward 78-Week Trajectories</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-16)' }}>
            {sparklines.map(sp => (
              <div key={sp.wardId} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', border: '1px solid var(--hairline)', padding: 'var(--space-8)', backgroundColor: 'var(--surface-0)' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{sp.name}</div>
                <svg width="120" height="32" style={{ display: 'block' }}>
                  <polyline points={sp.pointsStr} fill="none" stroke={sp.color} strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </div>
            ))}
          </div>
        </section>

        {/* Policy Sandbox */}
        <section style={{ flex: 1, border: '1px solid var(--hairline)', borderRadius: 'var(--radius-panel)', backgroundColor: 'var(--surface-1)', padding: 'var(--space-16)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', margin: '0 0 var(--space-16) 0', color: 'var(--ink-1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Policy Sandbox</h2>
          
          <div style={{ marginBottom: 'var(--space-24)' }}>
            <button 
              onClick={onApplyPolicyPreset}
              style={{
                width: '100%',
                padding: 'var(--space-8) var(--space-16)',
                backgroundColor: 'var(--ink-0)',
                color: 'var(--surface-0)',
                border: 'none',
                borderRadius: 'var(--radius-control)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Apply Refinancing Freeze
            </button>
          </div>

          <div style={{ fontSize: '12px' }}>
            <div style={{ color: 'var(--ink-1)', marginBottom: 'var(--space-8)' }}>Status:</div>
            {activeShock ? (
              <div style={{ padding: 'var(--space-8)', backgroundColor: 'var(--surface-2)', borderLeft: '2px solid var(--covariate)' }}>
                <strong>Policy Active:</strong> {activeShock.type} (Magnitude: {activeShock.magnitude})
              </div>
            ) : (
              <div style={{ padding: 'var(--space-8)', backgroundColor: 'var(--surface-0)', border: '1px solid var(--hairline)' }}>
                Baseline Mode
              </div>
            )}
          </div>
        </section>
      </div>

    </div>
  );
};
