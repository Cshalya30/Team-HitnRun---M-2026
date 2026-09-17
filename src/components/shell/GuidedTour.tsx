import React, { useState, useEffect } from 'react';

interface GuidedTourProps {
  /** Whether to show the tour (controlled externally). */
  isActive: boolean;
  /** Called when tour is dismissed. */
  onDismiss: () => void;
}

// Shown once per session (in-memory only, never localStorage)
let sessionHasSeenTour = false;

const STOPS = [
  {
    id: 'scrubber',
    label: 'Drag to scrub through 78 weeks of simulated history',
    box: { top: '70px', left: '24px', right: '24px', height: '80px' },
    tooltipPosition: { top: '100%', left: '50%', transform: 'translate(-50%, 24px)' }
  },
  {
    id: 'graph',
    label: 'Borrower network. Click any node to inspect attribution.',
    box: { top: '170px', left: '24px', width: '60%', bottom: '24px' },
    tooltipPosition: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  },
  {
    id: 'rail',
    label: 'Stress decomposition for the selected borrower',
    box: { top: '170px', right: '24px', width: '35%', bottom: '24px' },
    tooltipPosition: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }
];

export const GuidedTour: React.FC<GuidedTourProps> = ({ isActive, onDismiss }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isActive && sessionHasSeenTour) {
      onDismiss();
    }
  }, [isActive, onDismiss]);

  if (!isActive || sessionHasSeenTour) {
    return null;
  }

  const handleDismiss = () => {
    sessionHasSeenTour = true;
    onDismiss();
  };

  const handleNext = () => {
    if (currentStep < STOPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleDismiss();
    }
  };

  const stop = STOPS[currentStep];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(11, 13, 18, 0.6)',
        zIndex: 9999,
        color: 'var(--ink-0)',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px'
      }}
    >
      <div
        style={{
          position: 'absolute',
          ...stop.box,
          pointerEvents: 'none'
        }}
      >
        {/* Top-left corner */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '8px', height: '8px', borderTop: '2px solid var(--ink-0)', borderLeft: '2px solid var(--ink-0)' }} />
        {/* Top-right corner */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', borderTop: '2px solid var(--ink-0)', borderRight: '2px solid var(--ink-0)' }} />
        {/* Bottom-left corner */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '8px', height: '8px', borderBottom: '2px solid var(--ink-0)', borderLeft: '2px solid var(--ink-0)' }} />
        {/* Bottom-right corner */}
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '8px', height: '8px', borderBottom: '2px solid var(--ink-0)', borderRight: '2px solid var(--ink-0)' }} />
        
        {/* Tooltip / Label area */}
        <div
          style={{
            position: 'absolute',
            ...stop.tooltipPosition,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            pointerEvents: 'auto',
            textAlign: 'center',
            width: 'max-content',
            maxWidth: '90vw'
          }}
        >
          <div style={{ whiteSpace: 'normal', maxWidth: '300px' }}>{stop.label}</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleDismiss}
              style={{
                background: 'transparent',
                border: '1px solid var(--ink-0)',
                color: 'var(--ink-0)',
                padding: '4px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              style={{
                background: 'var(--ink-0)',
                border: '1px solid var(--ink-0)',
                color: 'var(--surface-0)',
                padding: '4px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {currentStep === STOPS.length - 1 ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
