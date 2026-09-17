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

  // Generate sparkline data for each ward with rich dynamic scaling
  const sparklines = useMemo(() => {
    return portfolio.wards.map((ward, index) => {
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

      const minVal = Math.min(...points);
      const maxVal = Math.max(...points);
      const range = Math.max(0.12, maxVal - minVal);
      
      // Build scaled polyline and area polygon points
      const pointCoords = points.map((val, idx) => {
        const x = (idx / (numWeeks - 1)) * 140;
        const normalized = (val - minVal) / range;
        const y = 32 - normalized * 24 - 4;
        return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
      });

      const pointsStr = pointCoords.map(p => `${p.x},${p.y}`).join(' ');
      const areaStr = `0,36 ${pointsStr} 140,36`;

      // Current week marker point
      const currentIdx = Math.min(numWeeks - 1, Math.max(0, currentWeek - 1));
      const currentMarker = pointCoords[currentIdx] || { x: 0, y: 18 };

      const latestStress = points[currentIdx] || 0;

      // Channel color
      const colors = ['var(--idio)', 'var(--induced)', 'var(--covariate)', 'var(--signal)'];
      const color = colors[index % colors.length];

      return {
        wardId: ward.id,
        name: ward.name,
        district: ward.district,
        channelNum: `CH-${String(index + 1).padStart(2, '0')}`,
        pointsStr,
        areaStr,
        currentMarker,
        color,
        latestStress: (latestStress * 100).toFixed(1),
        minStress: (minVal * 100).toFixed(0),
        maxStress: (maxVal * 100).toFixed(0),
        isHighRisk: latestStress >= 0.35,
      };
    });
  }, [portfolio.wards, simulation.wardAggregatesByWeek, currentWeek]);

  return (
    <div
      style={{ 
        padding: 'var(--space-24)', 
        backgroundColor: 'var(--surface-0)', 
        color: 'var(--ink-0)', 
        fontFamily: 'var(--font-body)',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-24)',
        boxSizing: 'border-box',
      }}
    >
      {/* Portfolio Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2.5px solid var(--hairline)',
          paddingBottom: 'var(--space-16)',
          flexWrap: 'wrap',
          gap: 'var(--space-12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            Portfolio Exposure
          </h1>
          <span className="brutal-stamp" style={{ backgroundColor: 'var(--idio)', color: '#000000' }}>
            30 WARDS · 5,245 NODES
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)' }}>
          <div
            className="status-badge"
            style={{
              backgroundColor: 'var(--surface-1)',
              borderColor: 'var(--hairline)',
              fontSize: '12px',
            }}
          >
            <span>TIMELINE: WEEK</span>
            <span className="tabular-num" style={{ color: 'var(--idio)', fontWeight: 800 }}>{currentWeek} / 78</span>
          </div>
        </div>
      </header>

      {/* Ward Heat Matrix Full Width */}
      <section className="surface-panel" style={{ width: '100%', overflowX: 'auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-16)',
            flexWrap: 'wrap',
            gap: 'var(--space-8)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
            <span className="synth-jack" />
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '15px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                margin: 0,
              }}
            >
              Ward Stress & Contagion Matrix
            </h2>
          </div>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>
            CLICK ANY WARD ROW TO FILTER EXPOSURE
          </span>
        </div>

        <div style={{ width: '100%', overflowX: 'auto' }}>
          {simulation.wardAggregatesByWeek[Math.max(0, currentWeek - 1)] && (
            <WardHeatMatrix 
              wardAggregates={simulation.wardAggregatesByWeek[Math.max(0, currentWeek - 1)]} 
              selectedWardId={selectedWardId} 
              onSelectWard={setSelectedWardId} 
            />
          )}
        </div>
      </section>

      {/* Trajectories & Policy Sandbox */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'var(--space-24)', alignItems: 'start' }}>
        {/* Hardware Channel Strips: 30 Ward 78-Week Trajectories */}
        <section className="surface-panel">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-16)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
              <span className="synth-jack" />
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '15px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  margin: 0,
                }}
              >
                Ward 78-Week Trajectories (30 Channels)
              </h2>
            </div>
            <span className="tabular-num" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>
              {portfolio.wards.length} ACTIVE CHANNELS
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: 'var(--space-12)',
              maxHeight: '520px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {sparklines.map(sp => (
              <div
                key={sp.wardId}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-6)',
                  border: sp.isHighRisk ? '2.5px solid var(--induced)' : '2px solid var(--hairline)',
                  padding: 'var(--space-10)',
                  backgroundColor: 'var(--surface-0)',
                  borderRadius: 'var(--radius-control)',
                  boxShadow: sp.isHighRisk ? '3px 3px 0px var(--induced)' : '2px 2px 0px var(--hairline)',
                  transition: 'transform 100ms ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      fontWeight: 800,
                      color: 'var(--ink-2)',
                    }}
                  >
                    {sp.channelNum}
                  </span>
                  <span
                    className="tabular-num"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: 900,
                      color: sp.isHighRisk ? 'var(--induced)' : sp.color,
                    }}
                  >
                    {sp.latestStress}%
                  </span>
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={sp.name}
                >
                  {sp.name}
                </div>

                <div style={{ position: 'relative', width: '100%', height: '36px', marginTop: '2px' }}>
                  <svg width="100%" height="36" viewBox="0 0 140 36" preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
                    <polygon
                      points={sp.areaStr}
                      fill={sp.color}
                      opacity="0.15"
                    />
                    <polyline
                      points={sp.pointsStr}
                      fill="none"
                      stroke={sp.color}
                      strokeWidth="2.4"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    <circle
                      cx={sp.currentMarker.x}
                      cy={sp.currentMarker.y}
                      r="3.5"
                      fill={sp.color}
                      stroke="#000000"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--ink-2)', marginTop: '2px' }}>
                  <span>MIN: {sp.minStress}%</span>
                  <span>PEAK: {sp.maxStress}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Policy Sandbox */}
        <section className="surface-panel" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
            <span className="synth-jack" />
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '15px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                margin: 0,
              }}
            >
              Policy Sandbox
            </h2>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--ink-1)', lineHeight: 1.5 }}>
            Simulate macro-prudential stress interventions across all 30 wards and compare counterfactual contagion arrest.
          </p>

          <button 
            className="btn-primary"
            onClick={onApplyPolicyPreset}
            style={{
              width: '100%',
              height: '42px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
            }}
          >
            ⚡ APPLY REFINANCING FREEZE
          </button>

          <div
            style={{
              padding: 'var(--space-12)',
              border: '2px solid var(--hairline)',
              borderRadius: 'var(--radius-control)',
              backgroundColor: 'var(--surface-0)',
              boxShadow: '2px 2px 0px var(--hairline)',
            }}
          >
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ink-2)', marginBottom: 'var(--space-6)' }}>
              SYSTEM POLICY STATUS
            </div>
            {activeShock ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="brutal-stamp" style={{ backgroundColor: 'var(--induced)', color: '#FFFFFF' }}>
                  ACTIVE SHOCK: {activeShock.type.toUpperCase()}
                </span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ink-1)', marginTop: '4px' }}>
                  Magnitude: {activeShock.magnitude} · Injected Wk {activeShock.startWeek ?? currentWeek}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--signal)', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700 }}>
                <span>●</span> Baseline Simulation (No Active Shock)
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
