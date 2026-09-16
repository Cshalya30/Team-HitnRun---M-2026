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
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '10px',
        border: '1px solid var(--border-subtle)',
        gap: '12px',
        flexWrap: 'wrap',
      }}
      role="region"
      aria-label="Simulation Scenarios"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
          Scenario Injections
        </span>

        {/* Borrower Health Shock */}
        <button
          className={`btn-action ${activeShock?.type === 'borrower' ? 'active' : ''}`}
          onClick={() => {
            onApplyShock({
              type: 'borrower',
              targetId: 'b-001',
              targetName: 'Lakshmi R. (Medical Shock)',
              startWeek: currentWeek,
              magnitude: 0.9,
            });
          }}
          title="Inject severe idiosyncratic health shock to Lakshmi R."
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-idio)' }} />
          Lakshmi R. Shock
        </button>

        {/* Ward Flood Shock */}
        <button
          className={`btn-action ${activeShock?.type === 'ward' ? 'active' : ''}`}
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
          title="Simulate flash flood affecting Ward 11 Govandi"
        >
          <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-covariate)' }} />
          Ward 11 Flood
        </button>

        {/* Officer Resignation Shock */}
        <button
          className={`btn-action ${activeShock?.type === 'officer' ? 'active' : ''}`}
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
          title="Simulate sudden officer departure (F11 channel degradation)"
        >
          <span style={{ width: '6px', height: '6px', backgroundColor: '#6B7280' }} />
          Officer 101 Fired (F11)
        </button>

        {/* Policy Cutoff Shock */}
        <button
          className="btn-action"
          onClick={onApplyPolicyPreset}
          style={{ color: 'var(--color-induced)' }}
          title="Guardrails-style refinancing freeze for 60+ DPD borrowers (F13)"
        >
          ⚡ Policy: 60+ DPD Freeze
        </button>
      </div>

      {activeShock && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="chip" style={{ color: 'var(--color-induced)', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
            Cascading from W{activeShock.startWeek}
          </span>
          <button
            onClick={onClearShock}
            className="btn-action"
            style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
          >
            Reset ✕
          </button>
        </div>
      )}
    </div>
  );
};
