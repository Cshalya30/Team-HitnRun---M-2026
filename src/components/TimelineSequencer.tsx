import React, { useEffect, useRef, useState } from 'react';

interface TimelineSequencerProps {
  currentWeek: number;
  totalWeeks?: number;
  isPlaying: boolean;
  onWeekChange: (week: number) => void;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  weeklyStressScores: number[]; // 78 numbers between 0 and 1
}

export const TimelineSequencer: React.FC<TimelineSequencerProps> = ({
  currentWeek,
  totalWeeks = 78,
  isPlaying,
  onWeekChange,
  onTogglePlay,
  onStepForward,
  onStepBackward,
  weeklyStressScores,
}) => {
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const playbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(120, 600 / speed);
      playbackTimerRef.current = window.setInterval(() => {
        onWeekChange(currentWeek >= totalWeeks ? 1 : currentWeek + 1);
      }, intervalMs);
    } else if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, currentWeek, totalWeeks, speed, onWeekChange]);

  const simulatedDate = new Date(2025, 0, 1 + (currentWeek - 1) * 7);
  const formattedDate = simulatedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Milestones pinned to timeline
  const milestones = [
    { week: 12, label: 'Borrower Shock', tag: '🚩' },
    { week: 34, label: 'Ward Flood', tag: '🌊' },
    { week: 52, label: 'Renewal', tag: '↻' },
    { week: 60, label: 'Refinancing Freeze', tag: '⚡' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '10px 18px',
        backgroundColor: 'rgba(14, 16, 23, 0.95)',
        borderBottom: '1px solid var(--border-subtle)',
        backdropFilter: 'blur(16px)',
        zIndex: 30,
      }}
      role="region"
      aria-label="Contagion Timeline Sequencer"
    >
      {/* Transport Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          className={`btn-action ${isPlaying ? 'active' : ''}`}
          onClick={onTogglePlay}
          style={{ width: '32px', height: '32px', padding: 0, borderRadius: '8px' }}
          title={isPlaying ? 'Pause (Space)' : 'Play simulation (Space)'}
        >
          {isPlaying ? (
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
              <rect width="3.5" height="12" rx="1" />
              <rect x="6.5" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
              <path d="M1 0.8V11.2L9.5 6L1 0.8Z" />
            </svg>
          )}
        </button>

        <button
          className="btn-action"
          onClick={onStepBackward}
          disabled={currentWeek <= 1}
          style={{ width: '28px', height: '28px', padding: 0 }}
          title="Step backward 1 week"
        >
          <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
            <path d="M7 1L2 5L7 9V1Z" />
          </svg>
        </button>

        <button
          className="btn-action"
          onClick={onStepForward}
          disabled={currentWeek >= totalWeeks}
          style={{ width: '28px', height: '28px', padding: 0 }}
          title="Step forward 1 week"
        >
          <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
            <path d="M1 1L6 5L1 9V1Z" />
          </svg>
        </button>

        {/* Speed multiplier pill */}
        <button
          className="btn-action"
          onClick={() => setSpeed(speed === 1 ? 2 : speed === 2 ? 4 : 1)}
          style={{ fontSize: '11px', height: '28px', padding: '0 8px', color: 'var(--text-secondary)' }}
          title="Change simulation playback speed"
        >
          {speed}x
        </button>
      </div>

      {/* Week & Date Label */}
      <div style={{ minWidth: '130px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
            WEEK <span className="font-mono-num">{String(currentWeek).padStart(2, '0')}</span>
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ 78</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          {formattedDate}
        </div>
      </div>

      {/* Interactive 78-Week Stress Volume Histogram & Scrubber */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          height: '36px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '2px',
          cursor: 'pointer',
          padding: '0 4px',
        }}
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = Math.max(0, Math.min(1, clickX / rect.width));
          const targetWeek = Math.max(1, Math.min(totalWeeks, Math.round(ratio * totalWeeks)));
          onWeekChange(targetWeek);
        }}
      >
        {/* Milestone Markers on Timeline */}
        {milestones.map(m => {
          const leftPct = ((m.week - 1) / (totalWeeks - 1)) * 100;
          return (
            <div
              key={m.week}
              onClick={e => {
                e.stopPropagation();
                onWeekChange(m.week);
              }}
              style={{
                position: 'absolute',
                top: '-4px',
                left: `${leftPct}%`,
                transform: 'translateX(-50%)',
                fontSize: '10px',
                cursor: 'pointer',
                zIndex: 10,
                opacity: currentWeek === m.week ? 1 : 0.6,
                transition: 'opacity 120ms',
              }}
              title={`Jump to W${m.week}: ${m.label}`}
            >
              {m.tag}
            </div>
          );
        })}

        {/* 78 Histogram Bars */}
        {Array.from({ length: totalWeeks }).map((_, idx) => {
          const w = idx + 1;
          const stressVal = weeklyStressScores[idx] ?? 0.12;
          const isPassed = w <= currentWeek;
          const isCurrent = w === currentWeek;

          let barColor = isPassed ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)';
          if (stressVal > 0.35) {
            barColor = isPassed ? 'var(--color-induced)' : 'rgba(244, 63, 94, 0.35)';
          } else if (stressVal > 0.22) {
            barColor = isPassed ? 'var(--color-idio)' : 'rgba(229, 184, 92, 0.35)';
          }

          if (isCurrent) {
            barColor = '#FFFFFF';
          }

          const barHeight = Math.max(4, Math.round(stressVal * 28));

          return (
            <div
              key={w}
              style={{
                flex: 1,
                height: `${barHeight}px`,
                backgroundColor: barColor,
                borderRadius: '1px',
                transition: 'height 100ms ease, background-color 100ms ease',
              }}
              title={`Week ${w} Portfolio Stress: ${(stressVal * 100).toFixed(0)}%`}
            />
          );
        })}

        {/* Playhead Indicator Line */}
        <div
          style={{
            position: 'absolute',
            left: `${((currentWeek - 1) / (totalWeeks - 1)) * 100}%`,
            top: 0,
            bottom: 0,
            width: '2px',
            backgroundColor: '#fff',
            boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      </div>

      {/* Quick Jump Buttons */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          className="btn-action"
          onClick={() => onWeekChange(12)}
          style={{ fontSize: '11px', height: '26px', padding: '0 8px' }}
        >
          🚩 W12
        </button>
        <button
          className="btn-action"
          onClick={() => onWeekChange(34)}
          style={{ fontSize: '11px', height: '26px', padding: '0 8px' }}
        >
          🌊 W34
        </button>
        <button
          className="btn-action"
          onClick={() => onWeekChange(60)}
          style={{ fontSize: '11px', height: '26px', padding: '0 8px', color: 'var(--color-induced)' }}
        >
          ⚡ W60
        </button>
      </div>
    </div>
  );
};
