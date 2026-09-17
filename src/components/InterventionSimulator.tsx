import React, { useState, useMemo } from 'react';
import {
  INTERVENTION_PRESETS,
  simulateInterventionComparison,
  TrajectoryPoint,
} from '../engine/interventions';
import {
  Borrower,
  Centre,
  Edge,
  Intervention,
  InterventionType,
  JLG,
  Officer,
  Shock,
  StressSnapshot,
  Ward,
} from '../engine/types';

interface InterventionSimulatorProps {
  wards: Ward[];
  officers: Officer[];
  centres: Centre[];
  jlgs: JLG[];
  borrowers: Borrower[];
  edges: Edge[];
  activeShock: Shock | null;
  targetBorrower: Borrower;
  currentWeek: number;
  baselineSnapshots?: StressSnapshot[];
  onApplyIntervention: (intervention: Intervention) => void;
  onClose: () => void;
}

export const InterventionSimulator: React.FC<InterventionSimulatorProps> = ({
  wards,
  officers,
  centres,
  jlgs,
  borrowers,
  edges,
  activeShock,
  targetBorrower,
  currentWeek,
  baselineSnapshots,
  onApplyIntervention,
  onClose,
}) => {
  const [selectedType, setSelectedType] = useState<InterventionType>('moratorium');

  const preset = INTERVENTION_PRESETS[selectedType];
  const intervention: Intervention = useMemo(() => ({
    id: `intv-${selectedType}`,
    type: selectedType,
    title: preset.title,
    description: preset.shortDescription,
    targetBorrowerId: targetBorrower.id,
    targetCentreId: targetBorrower.centreId,
    targetWardId: targetBorrower.wardId,
    appliedWeek: currentWeek,
    durationWeeks: preset.defaultDurationWeeks,
  }), [selectedType, preset, targetBorrower, currentWeek]);

  const trajectory: TrajectoryPoint[] = useMemo(() => {
    return simulateInterventionComparison(
      wards,
      officers,
      centres,
      jlgs,
      borrowers,
      edges,
      activeShock,
      intervention,
      targetBorrower.id,
      baselineSnapshots
    );
  }, [wards, officers, centres, jlgs, borrowers, edges, activeShock, intervention, targetBorrower.id, baselineSnapshots]);

  const maxBase = Math.max(...trajectory.map(t => t.baselineStress));
  const maxMitigated = Math.max(...trajectory.map(t => t.interventionStress));
  const peakReductionPct = ((maxBase - maxMitigated) * 100).toFixed(1);
  const totalPreventedPoints = trajectory.reduce((sum, t) => sum + t.preventedContagionDelta, 0);
  const defaultsPrevented = Math.max(1, Math.round(totalPreventedPoints * 2.8));

  const chartWidth = 580;
  const chartHeight = 180;
  const padding = { top: 20, right: 20, bottom: 26, left: 42 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const getX = (week: number) => padding.left + ((week - 1) / 77) * innerWidth;
  const getY = (stress: number) => padding.top + innerHeight - stress * innerHeight;

  const baselinePoints = trajectory.map(t => `${getX(t.week)},${getY(t.baselineStress)}`).join(' ');
  const mitigatedPoints = trajectory.map(t => `${getX(t.week)},${getY(t.interventionStress)}`).join(' ');

  const baselineArea = `${baselinePoints} ${getX(78)},${getY(0)} ${getX(1)},${getY(0)}`;
  const mitigatedArea = `${mitigatedPoints} ${getX(78)},${getY(0)} ${getX(1)},${getY(0)}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 'var(--space-24)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Intervention Trajectory Simulator"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--radius-panel)',
          padding: 'var(--space-24)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-16)',
          boxShadow: 'rgba(0,0,0,0.1) 0px 2px 10px 0px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--ink-2)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Counterfactual Simulation
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '18px',
                color: 'var(--ink-0)',
                margin: '2px 0 0 0',
                fontWeight: 600,
              }}
            >
              Intervention Trajectory Comparison
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--ink-1)', marginTop: '4px' }}>
              Target: <strong style={{ color: 'var(--ink-0)' }}>{targetBorrower.displayName}</strong> · Applied at Week {currentWeek}
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ width: '28px', height: '28px', padding: 0 }}
            title="Close modal"
          >
            ✕
          </button>
        </div>

        {/* 6 Intervention Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-8)' }}>
          {(Object.keys(INTERVENTION_PRESETS) as InterventionType[]).map(typeKey => {
            const p = INTERVENTION_PRESETS[typeKey];
            const isSelected = selectedType === typeKey;
            return (
              <button
                key={typeKey}
                onClick={() => setSelectedType(typeKey)}
                style={{
                  height: 'auto',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  backgroundColor: isSelected ? 'var(--surface-2)' : 'var(--surface-0)',
                  border: `1px solid ${isSelected ? 'var(--signal)' : 'var(--hairline)'}`,
                  borderRadius: 'var(--radius-control)',
                  cursor: 'pointer',
                  transition: 'background 120ms, border-color 120ms',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 500, color: isSelected ? 'var(--ink-0)' : 'var(--ink-1)' }}>
                  {p.title.split('(')[0].trim()}
                </span>
                <span className="tabular-num" style={{ fontSize: '10px', color: 'var(--ink-2)', marginTop: '2px' }}>
                  {p.defaultDurationWeeks} weeks duration
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Mechanism Details */}
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: 'var(--surface-2)',
            borderRadius: 'var(--radius-control)',
            fontSize: '12px',
            lineHeight: 1.5,
            border: '1px solid var(--hairline)',
          }}
        >
          <span style={{ color: 'var(--ink-0)', fontWeight: 500 }}>{preset.title}: </span>
          <span style={{ color: 'var(--ink-1)' }}>{preset.shortDescription} </span>
          <div style={{ color: 'var(--signal)', fontSize: '11px', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            Mechanism: {preset.mechanism}
          </div>
        </div>

        {/* Dual-Trajectory Chart on Single Axis */}
        <div
          style={{
            padding: 'var(--space-16)',
            backgroundColor: 'var(--surface-0)',
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--hairline)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--ink-2)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              78-Week Trajectory (Dual-Path)
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-12)', fontSize: '11px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--induced)' }}>
                <span style={{ width: '10px', height: '2px', backgroundColor: 'var(--induced)' }} />
                Baseline (Unmitigated)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--signal)' }}>
                <span style={{ width: '10px', height: '2px', backgroundColor: 'var(--signal)' }} />
                Mitigated Path
              </span>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
          >
            {/* Gridlines */}
            <line x1={padding.left} y1={getY(0.5)} x2={padding.left + innerWidth} y2={getY(0.5)} stroke="var(--hairline)" strokeDasharray="3 3" />
            <line x1={padding.left} y1={getY(0.35)} x2={padding.left + innerWidth} y2={getY(0.35)} stroke="rgba(224, 90, 107, 0.25)" strokeDasharray="3 3" />

            {/* Week of Action Vertical Marker */}
            <line
              x1={getX(currentWeek)}
              y1={padding.top}
              x2={getX(currentWeek)}
              y2={padding.top + innerHeight}
              stroke="var(--focus)"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <text x={getX(currentWeek) + 4} y={padding.top + 10} fill="var(--focus)" fontSize="9" fontFamily="var(--font-mono)">
              WK{currentWeek} Action
            </text>

            {/* Y-Axis Labels */}
            <text x={padding.left - 6} y={getY(1.0) + 3} fill="var(--ink-2)" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">100%</text>
            <text x={padding.left - 6} y={getY(0.5) + 3} fill="var(--ink-2)" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">50%</text>
            <text x={padding.left - 6} y={getY(0.0) + 3} fill="var(--ink-2)" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">0%</text>

            {/* X-Axis Labels strictly WK[N] */}
            <text x={padding.left} y={chartHeight - 6} fill="var(--ink-2)" fontSize="10" fontFamily="var(--font-mono)">WK01</text>
            <text x={padding.left + innerWidth / 2} y={chartHeight - 6} fill="var(--ink-2)" fontSize="10" textAnchor="middle" fontFamily="var(--font-mono)">WK39</text>
            <text x={padding.left + innerWidth} y={chartHeight - 6} fill="var(--ink-2)" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">WK78</text>

            {/* Fills without gradients */}
            <polygon points={baselineArea} fill="rgba(224, 90, 107, 0.12)" />
            <polygon points={mitigatedArea} fill="rgba(123, 224, 176, 0.12)" />

            {/* Lines */}
            <polyline fill="none" stroke="var(--induced)" strokeWidth="1.75" points={baselinePoints} />
            <polyline fill="none" stroke="var(--signal)" strokeWidth="2" points={mitigatedPoints} />
          </svg>
        </div>

        {/* Quantified Impact Numbers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-12)' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--ink-2)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Peak Stress Drop</div>
            <div className="tabular-num" style={{ fontSize: '20px', fontWeight: 600, color: 'var(--signal)', marginTop: '2px' }}>
              -{peakReductionPct}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--ink-2)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Peer Defaults Averted</div>
            <div className="tabular-num" style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ink-0)', marginTop: '2px' }}>
              ~{defaultsPrevented} Members
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--ink-2)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Action Window</div>
            <div className="tabular-num" style={{ fontSize: '20px', fontWeight: 600, color: 'var(--focus)', marginTop: '2px' }}>
              {preset.defaultDurationWeeks} Weeks
            </div>
          </div>
        </div>

        {/* Modal Footer with Primary and Secondary Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-8)', borderTop: '1px solid var(--hairline)', paddingTop: 'var(--space-16)' }}>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              onApplyIntervention(intervention);
              onClose();
            }}
          >
            Commit Intervention to Simulation
          </button>
        </div>
      </div>
    </div>
  );
};
