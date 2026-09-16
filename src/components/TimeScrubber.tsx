import React, { useEffect, useRef } from 'react';

interface TimeScrubberProps {
  currentWeek: number;
  totalWeeks?: number;
  isPlaying: boolean;
  onWeekChange: (week: number) => void;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
}

export const TimeScrubber: React.FC<TimeScrubberProps> = ({
  currentWeek,
  totalWeeks = 78,
  isPlaying,
  onWeekChange,
  onTogglePlay,
  onStepForward,
  onStepBackward,
}) => {
  const playbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = window.setInterval(() => {
        onWeekChange(currentWeek >= totalWeeks ? 1 : currentWeek + 1);
      }, 600);
    } else if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, currentWeek, totalWeeks, onWeekChange]);

  const simulatedDate = new Date(2025, 0, 1 + (currentWeek - 1) * 7);
  const formattedDate = simulatedDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-20)',
        padding: '12px 20px',
        backgroundColor: 'var(--surface-1)',
        borderRadius: 'var(--radius-panel)',
        border: '1px solid var(--hairline)',
        width: '100%',
      }}
      role="region"
      aria-label="Contagion Timeline Scrubber"
    >
      {/* Transport Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          className={`btn-control ${isPlaying ? 'active' : ''}`}
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause simulation' : 'Play cascade simulation'}
          title="Play/Pause (Space)"
          style={{ width: '32px', padding: 0 }}
        >
          {isPlaying ? (
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
              <rect width="3" height="12" rx="1" />
              <rect x="7" width="3" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
              <path d="M1 0.5V11.5L9.5 6L1 0.5Z" />
            </svg>
          )}
        </button>

        <button
          className="btn-control"
          onClick={onStepBackward}
          disabled={currentWeek <= 1}
          style={{ width: '28px', padding: 0 }}
          title="Step back 1 week"
        >
          <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
            <path d="M7 1L2 5L7 9V1Z" />
          </svg>
        </button>

        <button
          className="btn-control"
          onClick={onStepForward}
          disabled={currentWeek >= totalWeeks}
          style={{ width: '28px', padding: 0 }}
          title="Step forward 1 week"
        >
          <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
            <path d="M1 1L6 5L1 9V1Z" />
          </svg>
        </button>
      </div>

      {/* Week Readout */}
      <div style={{ minWidth: '130px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-0)' }}>
          Week <span className="mono-num">{String(currentWeek).padStart(2, '0')}</span>
          <span style={{ color: 'var(--ink-2)', fontWeight: 400, fontSize: '11px', marginLeft: '4px' }}>/ {totalWeeks}</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--ink-2)' }}>
          {formattedDate}
        </div>
      </div>

      {/* Timeline Slider */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="range"
          min={1}
          max={totalWeeks}
          value={currentWeek}
          onChange={e => onWeekChange(Number(e.target.value))}
          className="tremor-slider"
          aria-label="Timeline scrubber"
        />
      </div>

      {/* Milestone Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--ink-2)' }}>
        <button
          onClick={() => onWeekChange(12)}
          className="btn-control"
          style={{ height: '22px', fontSize: '10px', padding: '0 6px', borderRadius: '4px' }}
        >
          W12 Shock
        </button>
        <button
          onClick={() => onWeekChange(34)}
          className="btn-control"
          style={{ height: '22px', fontSize: '10px', padding: '0 6px', borderRadius: '4px' }}
        >
          W34 Flood
        </button>
        <button
          onClick={() => onWeekChange(52)}
          className="btn-control"
          style={{ height: '22px', fontSize: '10px', padding: '0 6px', borderRadius: '4px' }}
        >
          W52 Renewal
        </button>
      </div>
    </div>
  );
};
