import React from 'react';

export const SystemPage: React.FC = () => {
  return (
    <div style={{ 
      padding: 'var(--space-32)', 
      backgroundColor: 'var(--surface-0)', 
      color: 'var(--ink-0)', 
      fontFamily: 'var(--font-body)',
      maxWidth: '1200px',
      margin: '0 auto',
      lineHeight: 1.5
    }}>
      <header style={{ marginBottom: 'var(--space-48)', borderBottom: '1px solid var(--hairline)', paddingBottom: 'var(--space-24)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', margin: '0 0 var(--space-8) 0' }}>Signal Pipeline & Attribution Method</h1>
        <div style={{ color: 'var(--ink-1)', fontSize: '14px' }}>Methodology documentation for technical reviewers and judges.</div>
      </header>

      <section style={{ marginBottom: 'var(--space-48)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: 'var(--space-24)', color: 'var(--ink-0)' }}>1. Five Contagion Channels</h2>
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 'var(--space-16)',
          border: '1px solid var(--hairline)',
          padding: 'var(--space-24)',
          backgroundColor: 'var(--surface-1)',
          borderRadius: 'var(--radius-panel)'
        }}>
          {/* Guarantee Channel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)' }}>
            <div style={{ width: '150px', padding: 'var(--space-8)', border: '1px solid var(--hairline)', backgroundColor: 'var(--surface-2)', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>
              Guarantee
            </div>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--hairline)', position: 'relative' }}>
              <div style={{ position: 'absolute', right: '-4px', top: '-4px', width: '8px', height: '8px', borderTop: '1px solid var(--hairline)', borderRight: '1px solid var(--hairline)', transform: 'rotate(45deg)' }} />
            </div>
            <div style={{ width: '300px', fontSize: '12px', color: 'var(--ink-1)' }}>
              Mechanism: Joint Liability Group default cascade.<br/>
              Strength: Very High (Direct financial liability)
            </div>
          </div>

          {/* Income Channel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)' }}>
            <div style={{ width: '150px', padding: 'var(--space-8)', border: '1px solid var(--hairline)', backgroundColor: 'var(--surface-2)', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>
              Income
            </div>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--hairline)', position: 'relative' }}>
              <div style={{ position: 'absolute', right: '-4px', top: '-4px', width: '8px', height: '8px', borderTop: '1px solid var(--hairline)', borderRight: '1px solid var(--hairline)', transform: 'rotate(45deg)' }} />
            </div>
            <div style={{ width: '300px', fontSize: '12px', color: 'var(--ink-1)' }}>
              Mechanism: Shared supply chain shocks.<br/>
              Strength: High (Correlated sector stress)
            </div>
          </div>

          {/* Social Channel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)' }}>
            <div style={{ width: '150px', padding: 'var(--space-8)', border: '1px solid var(--hairline)', backgroundColor: 'var(--surface-2)', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>
              Social
            </div>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--hairline)', position: 'relative' }}>
              <div style={{ position: 'absolute', right: '-4px', top: '-4px', width: '8px', height: '8px', borderTop: '1px solid var(--hairline)', borderRight: '1px solid var(--hairline)', transform: 'rotate(45deg)' }} />
            </div>
            <div style={{ width: '300px', fontSize: '12px', color: 'var(--ink-1)' }}>
              Mechanism: Norm erosion among neighbors.<br/>
              Strength: Medium (Strategic default observation)
            </div>
          </div>

          {/* Ward Channel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)' }}>
            <div style={{ width: '150px', padding: 'var(--space-8)', border: '1px solid var(--hairline)', backgroundColor: 'var(--surface-2)', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>
              Ward
            </div>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--hairline)', position: 'relative' }}>
              <div style={{ position: 'absolute', right: '-4px', top: '-4px', width: '8px', height: '8px', borderTop: '1px solid var(--hairline)', borderRight: '1px solid var(--hairline)', transform: 'rotate(45deg)' }} />
            </div>
            <div style={{ width: '300px', fontSize: '12px', color: 'var(--ink-1)' }}>
              Mechanism: Local economic covariate shocks.<br/>
              Strength: Variable (Depends on baseline stress)
            </div>
          </div>

          {/* Officer Channel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)' }}>
            <div style={{ width: '150px', padding: 'var(--space-8)', border: '1px solid var(--hairline)', backgroundColor: 'var(--surface-2)', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>
              Officer
            </div>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--hairline)', position: 'relative' }}>
              <div style={{ position: 'absolute', right: '-4px', top: '-4px', width: '8px', height: '8px', borderTop: '1px solid var(--hairline)', borderRight: '1px solid var(--hairline)', transform: 'rotate(45deg)' }} />
            </div>
            <div style={{ width: '300px', fontSize: '12px', color: 'var(--ink-1)' }}>
              Mechanism: Collection leniency / operational friction.<br/>
              Strength: Low (Portfolio-wide effect)
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 'var(--space-48)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: 'var(--space-16)', color: 'var(--ink-0)' }}>2. Three-Step Attribution Algorithm</h2>
        <ol style={{ paddingLeft: 'var(--space-24)', color: 'var(--ink-1)', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
          <li>
            <strong style={{ color: 'var(--ink-0)' }}>Raw latent stress computation:</strong> Derived from 8 primary signals (attendance, cross-payment, instalment delay, loan cycle, multi-lender, DTI burden, social disruption, seasonal mismatch).
          </li>
          <li>
            <strong style={{ color: 'var(--ink-0)' }}>Contagion propagation:</strong> Stress flows iteratively across the borrower network via the defined channels.
          </li>
          <li>
            <strong style={{ color: 'var(--ink-0)' }}>Counterfactual edge ablation:</strong> Attributes final stress to <span style={{ color: 'var(--idio)', fontWeight: 'bold' }}>Idiosyncratic</span> (own shock), <span style={{ color: 'var(--induced)', fontWeight: 'bold' }}>Induced</span> (transmitted from named peer), or <span style={{ color: 'var(--covariate)', fontWeight: 'bold' }}>Covariate</span> (area-wide) sources.
          </li>
          <li>
            <strong style={{ color: 'var(--ink-0)' }}>Monte Carlo confidence bands:</strong> Validated through 200 iterations with Gaussian perturbation to assure robustness.
          </li>
        </ol>
      </section>

      <section style={{ marginBottom: 'var(--space-48)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: 'var(--space-16)', color: 'var(--ink-0)' }}>3. Transient Suppression Gate</h2>
        <div style={{ fontSize: '14px', color: 'var(--ink-1)', padding: 'var(--space-16)', backgroundColor: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-panel)' }}>
          A single missed instalment followed by catch-up does NOT escalate into systemic stress. Escalation strictly requires:
          <ul style={{ marginTop: 'var(--space-12)', paddingLeft: 'var(--space-24)', display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
            <li>Sustained pressure for 2+ consecutive weeks, OR</li>
            <li>Driven by strong induced contagion (&gt;45%), OR</li>
            <li>Days Past Due (DPD) &gt;= 15 days.</li>
          </ul>
        </div>
      </section>

      <section style={{ marginBottom: 'var(--space-48)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: 'var(--space-16)', color: 'var(--ink-0)' }}>4. Calibration Sources</h2>
        <ul style={{ fontSize: '14px', color: 'var(--ink-1)', paddingLeft: 'var(--space-24)', display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          <li><a href="https://mfinindia.org/" target="_blank" rel="noreferrer" style={{ color: 'var(--ink-0)', textDecoration: 'underline' }}>MFIN Micrometer</a> (baseline PAR 31-180 near 2%)</li>
          <li><a href="https://www.rbi.org.in/" target="_blank" rel="noreferrer" style={{ color: 'var(--ink-0)', textDecoration: 'underline' }}>RBI Financial Stability Report</a> (stress-period PAR near 6.2%)</li>
          <li>Household obligation ratios capped at 50%</li>
          <li>Maximum 3 active lenders per borrower</li>
        </ul>
        <div style={{ marginTop: 'var(--space-16)', padding: 'var(--space-12)', borderLeft: '3px solid var(--ink-2)', backgroundColor: 'var(--surface-1)', fontSize: '12px', fontStyle: 'italic' }}>
          All data is synthetic and seed-generated. Results validate recovery of a known generative process, not real-world predictive accuracy.
        </div>
      </section>

      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: 'var(--space-16)', color: 'var(--ink-0)' }}>5. Data Scale</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-16)', textAlign: 'center' }}>
          <div style={{ border: '1px solid var(--hairline)', padding: 'var(--space-16)', borderRadius: 'var(--radius-panel)', backgroundColor: 'var(--surface-1)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', color: 'var(--ink-0)' }}>5000</div>
            <div style={{ fontSize: '12px', color: 'var(--ink-1)' }}>Borrowers</div>
          </div>
          <div style={{ border: '1px solid var(--hairline)', padding: 'var(--space-16)', borderRadius: 'var(--radius-panel)', backgroundColor: 'var(--surface-1)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', color: 'var(--ink-0)' }}>30</div>
            <div style={{ fontSize: '12px', color: 'var(--ink-1)' }}>Wards</div>
          </div>
          <div style={{ border: '1px solid var(--hairline)', padding: 'var(--space-16)', borderRadius: 'var(--radius-panel)', backgroundColor: 'var(--surface-1)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', color: 'var(--ink-0)' }}>3</div>
            <div style={{ fontSize: '12px', color: 'var(--ink-1)' }}>Districts</div>
          </div>
          <div style={{ border: '1px solid var(--hairline)', padding: 'var(--space-16)', borderRadius: 'var(--radius-panel)', backgroundColor: 'var(--surface-1)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', color: 'var(--ink-0)' }}>78</div>
            <div style={{ fontSize: '12px', color: 'var(--ink-1)' }}>Weeks</div>
          </div>
        </div>
      </section>

    </div>
  );
};
