import React from 'react';
import { Officer, Shock, Ward } from '../engine/types';

interface ShockInjectionPanelProps {
  wards: Ward[];
  officers: Officer[];
  activeShock: Shock | null;
  currentWeek: number;
  onApplyShock: (shock: Shock) => void;
  onClearShock: () => void;
  onApplyPolicyPreset: () => void;
}

export const ShockInjectionPanel: React.FC<ShockInjectionPanelProps> = ({
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
        flexDirection: 'column',
        gap: '12px',
        padding: '16px 20px',
        backgroundColor: 'var(--surface-1)',
        borderRadius: 'var(--radius-panel)',
        border: '1px solid var(--hairline)',
        width: '100%',
      }}
      role="region"
      aria-label="Simulation Scenario Controls"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-1)' }}>
            Shock Scenario Injection
          </span>
          {activeShock && (
            <span className="badge-pill badge-induced" style={{ fontSize: '10px' }}>
              Active: {activeShock.targetName.split('(')[0].trim()}
            </span>
          )}
        </div>
        {activeShock && (
          <button
            onClick={onClearShock}
            className="btn-control"
            style={{ height: '22px', fontSize: '11px', padding: '0 8px', border: 'none', background: 'none', color: 'var(--ink-1)' }}
          >
            Reset to Baseline ✕
          </button>
        )}
      </div>

      {/* Sleek Horizontal Scenario Buttons (Asymmetric, not 4 identical cards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '8px',
        }}
      >
        <button
          className={`btn-control ${activeShock?.type === 'borrower' ? 'active' : ''}`}
          onClick={() => {
            onApplyShock({
              type: 'borrower',
              targetId: 'b-001',
              targetName: 'Lakshmi R. (Medical Shock)',
              startWeek: currentWeek,
              magnitude: 0.9,
            });
          }}
          style={{ height: 'auto', padding: '8px 12px', justifyContent: 'flex-start', textAlign: 'left' }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--idio)' }} />
              Borrower Health Shock
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '2px' }}>
              Lakshmi R. · Intra-group cascade
            </div>
          </div>
        </button>

        <button
          className={`btn-control ${activeShock?.type === 'ward' ? 'active' : ''}`}
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
          style={{ height: 'auto', padding: '8px 12px', justifyContent: 'flex-start', textAlign: 'left' }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
              <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--covariate)' }} />
              Ward Climate Shock
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '2px' }}>
              Ward 11 Govandi · Macro disruption
            </div>
          </div>
        </button>

        <button
          className={`btn-control ${activeShock?.type === 'officer' ? 'active' : ''}`}
          onClick={() => {
            const officer = officers[0];
            onApplyShock({
              type: 'officer',
              targetId: officer.id,
              targetName: `${officer.name} (Officer Fired)`,
              startWeek: currentWeek,
              magnitude: 0.85,
            });
          }}
          style={{ height: 'auto', padding: '8px 12px', justifyContent: 'flex-start', textAlign: 'left' }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
              <span style={{ width: '6px', height: '6px', backgroundColor: '#586073' }} />
              Officer Channel Shock
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '2px' }}>
              Ramesh K. · Simultaneous multi-centre drift
            </div>
          </div>
        </button>

        <button
          className="btn-control"
          onClick={onApplyPolicyPreset}
          style={{ height: 'auto', padding: '8px 12px', justifyContent: 'flex-start', textAlign: 'left' }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--induced)' }}>
              Policy: 60+ DPD Cutoff
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '2px' }}>
              Guardrails freeze · 2nd-order liquidity crunch
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
