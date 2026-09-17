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

export const GuidedTour: React.FC<GuidedTourProps> = () => {
  return null;
};
