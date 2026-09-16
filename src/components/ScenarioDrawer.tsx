import React from 'react';
import { Officer, Shock, Ward } from '../engine/types';

interface ScenarioDrawerProps {
  wards: Ward[];
  officers: Officer[];
  activeShock: Shock | null;
  currentWeek: number;
  onApplyShock: (shock: Shock) => void;
  onClearShock: () => void;
  onApplyPolicyPreset: () => void;
}

export const ScenarioDrawer: React.FC<ScenarioDrawerProps> = ({
  wards,
  officers,
  activeShock,
  currentWeek,
  onApplyShock,
  onClearShock,
  onApplyPolicyPreset,
}) => {
  const isPolicyActive = activeShock?.targetName?.includes('Refinancing') ?? false;
  const isLakshmiActive = activeShock?.type === 'borrower' && activeShock.targetId === 'b-001' && !isPolicyActive;
  const isWardActive = activeShock?.type === 'ward';
  const isOfficerActive = activeShock?.type === 'officer';

  return (
    <div
      style={{
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-12)',
        backgroundColor: 'var(--surface-1)',
        borderRadius: 'var(--radius-panel)',
        border: '1px solid var(--hairline)',
        gap: 'var(--space-8)',
        overflowX: 'auto',
      }}
      role="region"
      aria-label="Simulation Scenario Injections"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', flexShrink: 0 }}>
        <span
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--ink-2)',
            fontFamily: 'var(--font-mono)',
            marginRight: 'var(--space-4)',
          }}
        >
          Scenarios
        </span>

        {/* 1. Lakshmi R. Shock (Idiosyncratic: amber ● circle) */}
        <button
          className="scenario-chip"
          onClick={() => {
            onApplyShock({
              type: 'borrower',
              targetId: 'b-001',
              targetName: 'Lakshmi R. (Medical Shock)',
              startWeek: currentWeek,
              magnitude: 0.9,
            });
          }}
          style={{
            borderColor: isLakshmiActive ? 'var(--idio)' : 'var(--hairline)',
            color: isLakshmiActive ? 'var(--ink-0)' : 'var(--ink-1)',
          }}
          title="Inject severe idiosyncratic health shock to Lakshmi R."
        >
          <span style={{ color: 'var(--idio)', fontSize: '8px' }}>●</span>
          <span>Lakshmi R. Shock</span>
        </button>

        {/* 2. Ward 11 Flood (Covariate: blue ■ square) */}
        <button
          className="scenario-chip"
          onClick={() => {
            const targetWard = wards[2] || wards[0];
            onApplyShock({
              type: 'ward',
              targetId: targetWard.id,
              targetName: `${targetWard.name} (Flood)`,
              startWeek: currentWeek,
              magnitude: 0.75,
            });
          }}
          style={{
            borderColor: isWardActive ? 'var(--covariate)' : 'var(--hairline)',
            color: isWardActive ? 'var(--ink-0)' : 'var(--ink-1)',
          }}
          title="Simulate flash flood affecting Ward 11 Govandi"
        >
          <span style={{ color: 'var(--covariate)', fontSize: '8px' }}>■</span>
          <span>Ward 11 Flood</span>
        </button>

        {/* 3. Officer Resignation Shock (Structural) */}
        <button
          className="scenario-chip"
          onClick={() => {
            const officer = officers[0];
            onApplyShock({
              type: 'officer',
              targetId: officer.id,
              targetName: `${officer.name} (Resigned)`,
              startWeek: currentWeek,
              magnitude: 0.85,
            });
          }}
          style={{
            borderColor: isOfficerActive ? 'var(--ink-0)' : 'var(--hairline)',
            color: isOfficerActive ? 'var(--ink-0)' : 'var(--ink-1)',
          }}
          title="Simulate sudden officer departure (F11 channel degradation)"
        >
          <span style={{ color: 'var(--ink-1)', fontSize: '8px' }}>▲</span>
          <span>Officer 101 Fired</span>
        </button>

        {/* 4. Policy: 60+ DPD Freeze (Induced: red ▲ triangle) */}
        <button
          className="scenario-chip"
          onClick={onApplyPolicyPreset}
          style={{
            borderColor: isPolicyActive ? 'var(--induced)' : 'var(--hairline)',
            color: isPolicyActive ? 'var(--ink-0)' : 'var(--ink-1)',
          }}
          title="Guardrails-style refinancing freeze for 60+ DPD borrowers (F13)"
        >
          <span style={{ color: 'var(--induced)', fontSize: '8px' }}>▲</span>
          <span>Policy: 60+ DPD Freeze</span>
        </button>
      </div>

      {/* Active State Indicator & Reset Control */}
      {activeShock && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', flexShrink: 0 }}>
          <div
            className="status-badge"
            style={{
              borderColor: 'var(--induced)',
              color: 'var(--induced)',
              backgroundColor: 'var(--surface-2)',
            }}
          >
            Cascading from WK{activeShock.startWeek}
          </div>
          <button
            onClick={onClearShock}
            className="btn-ghost"
            style={{ height: '26px', fontSize: '11px', padding: '0 var(--space-8)' }}
            title="Reset active scenario shock"
          >
            Reset ✕
          </button>
        </div>
      )}
    </div>
  );
};
