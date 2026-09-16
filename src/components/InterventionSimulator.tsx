import React, { useState } from 'react';
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
  onApplyIntervention,
  onClose,
}) => {
  const [selectedType, setSelectedType] = useState<InterventionType>('moratorium');

  const preset = INTERVENTION_PRESETS[selectedType];
  const intervention: Intervention = {
    id: `intv-${selectedType}`,
    type: selectedType,
    title: preset.title,
    description: preset.shortDescription,
    targetBorrowerId: targetBorrower.id,
    targetCentreId: targetBorrower.centreId,
    targetWardId: targetBorrower.wardId,
    appliedWeek: currentWeek,
    durationWeeks: preset.defaultDurationWeeks,
  };

  const trajectory: TrajectoryPoint[] = simulateInterventionComparison(
    wards,
    officers,
    centres,
    jlgs,
    borrowers,
    edges,
    activeShock,
    intervention,
    targetBorrower.id
  );

  const maxBase = Math.max(...trajectory.map(t => t.baselineStress));
  const maxMitigated = Math.max(...trajectory.map(t => t.interventionStress));
  const peakReductionPct = Math.round((maxBase - maxMitigated) * 100);
  const totalPreventedPoints = trajectory.reduce((sum, t) => sum + t.preventedContagionDelta, 0);
  const defaultsPrevented = Math.max(1, Math.round(totalPreventedPoints * 2.8));

  const chartWidth = 580;
  const chartHeight = 180;
  const padding = { top: 20, right: 20, bottom: 26, left: 40 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const getX = (week: number) => padding.left + ((week - 1) / 77) * innerWidth;
  const getY = (stress: number) => padding.top + innerHeight - stress * innerHeight;

  const baselinePoints = trajectory.map(t => `${getX(t.week)},${getY(t.baselineStress)}`).join(' ');
  const mitigatedPoints = trajectory.map(t => `${getX(t.week)},${getY(t.interventionStress)}`).join(' ');

  // SVG Area Paths for soft gradient fill
  const baselineArea = `${baselinePoints} ${getX(78)},${getY(0)} ${getX(1)},${getY(0)}`;
  const mitigatedArea = `${mitigatedPoints} ${getX(78)},${getY(0)} ${getX(1)},${getY(0)}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(8, 9, 13, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: '20px',
        backdropFilter: 'blur(16px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Intervention Simulator"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--radius-panel)',
          padding: '24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-2)' }}>
              Counterfactual Simulation
            </span>
            <h2 style={{ fontSize: '18px', color: 'var(--ink-0)', marginTop: '2px' }}>
              Intervention Trajectory Comparison (F8)
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--ink-1)', marginTop: '2px' }}>
              Target: <strong style={{ color: 'var(--ink-0)' }}>{targetBorrower.displayName}</strong> · Applied at Week {currentWeek}
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-control"
            style={{ width: '28px', height: '28px', padding: 0, borderRadius: '50%' }}
          >
            ✕
          </button>
        </div>

        {/* 6 Intervention Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {(Object.keys(INTERVENTION_PRESETS) as InterventionType[]).map(typeKey => {
            const p = INTERVENTION_PRESETS[typeKey];
            const isSelected = selectedType === typeKey;
            return (
              <button
                key={typeKey}
                className={`btn-control ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedType(typeKey)}
                style={{
                  height: 'auto',
                  padding: '8px 10px',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 600, color: isSelected ? '#fff' : 'var(--ink-0)' }}>
                  {p.title.split('(')[0].trim()}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--ink-2)', marginTop: '2px' }}>
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
            borderRadius: '6px',
            fontSize: '12px',
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: 'var(--ink-0)', fontWeight: 500 }}>{preset.title}: </span>
          <span style={{ color: 'var(--ink-1)' }}>{preset.shortDescription} </span>
          <div style={{ color: 'var(--signal)', fontSize: '11px', marginTop: '4px' }}>
            {preset.mechanism}
          </div>
        </div>

        {/* Dual-Trajectory Chart on Single Axis */}
        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--surface-2)',
            borderRadius: '8px',
            border: '1px solid var(--hairline)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--ink-2)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              78-Week Trajectory (Dual-Path)
            </span>
            <div style={{ display: 'flex', gap: '14px', fontSize: '11px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--induced)' }}>
                <span style={{ width: '10px', height: '2px', backgroundColor: 'var(--induced)' }} />
                Baseline (Unmitigated)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--signal)' }}>
                <span style={{ width: '10px', height: '2px', backgroundColor: 'var(--signal)' }} />
                Mitigated Path
              </span>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--induced)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--induced)" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="mitigatedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--signal)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            <line x1={padding.left} y1={getY(0.5)} x2={padding.left + innerWidth} y2={getY(0.5)} stroke="var(--hairline)" strokeDasharray="3 3" />
            <line x1={padding.left} y1={getY(0.35)} x2={padding.left + innerWidth} y2={getY(0.35)} stroke="rgba(226, 85, 99, 0.25)" strokeDasharray="3 3" />

            {/* Week of action marker */}
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
              W{currentWeek} Action
            </text>

            {/* Axis text */}
            <text x={padding.left - 6} y={getY(1.0) + 4} fill="var(--ink-2)" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">100%</text>
            <text x={padding.left - 6} y={getY(0.5) + 4} fill="var(--ink-2)" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">50%</text>
            <text x={padding.left - 6} y={getY(0.0) + 4} fill="var(--ink-2)" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">0%</text>

            <text x={padding.left} y={chartHeight - 6} fill="var(--ink-2)" fontSize="10" fontFamily="var(--font-mono)">W01</text>
            <text x={padding.left + innerWidth / 2} y={chartHeight - 6} fill="var(--ink-2)" fontSize="10" textAnchor="middle" fontFamily="var(--font-mono)">W39</text>
            <text x={padding.left + innerWidth} y={chartHeight - 6} fill="var(--ink-2)" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">W78</text>

            {/* Fills */}
            <polygon points={baselineArea} fill="url(#baselineGrad)" />
            <polygon points={mitigatedArea} fill="url(#mitigatedGrad)" />

            {/* Lines */}
            <polyline fill="none" stroke="var(--induced)" strokeWidth="1.75" points={baselinePoints} />
            <polyline fill="none" stroke="var(--signal)" strokeWidth="2" points={mitigatedPoints} />
          </svg>
        </div>

        {/* Quantified Impact Numbers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--ink-2)' }}>PEAK STRESS DROP</div>
            <div className="mono-num" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--signal)', marginTop: '2px' }}>
              -{peakReductionPct}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--ink-2)' }}>PEER DEFAULTS AVERTED</div>
            <div className="mono-num" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink-0)', marginTop: '2px' }}>
              ~{defaultsPrevented} Members
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--ink-2)' }}>ACTION WINDOW</div>
            <div className="mono-num" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--focus)', marginTop: '2px' }}>
              {preset.defaultDurationWeeks} Weeks
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--hairline)', paddingTop: '16px' }}>
          <button className="btn-control" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-control active"
            onClick={() => {
              onApplyIntervention(intervention);
              onClose();
            }}
            style={{ backgroundColor: '#fff', color: '#000', border: 'none', fontWeight: 600 }}
          >
            Commit Intervention to Simulation
          </button>
        </div>
      </div>
    </div>
  );
};
