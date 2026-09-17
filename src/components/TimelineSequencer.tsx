import React, { useEffect, useRef, useState, useCallback } from 'react';

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
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const playbackTimerRef = useRef<number | null>(null);

  // Playback loop with cascade timing (~600ms / speed)
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
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    };
  }, [isPlaying, currentWeek, totalWeeks, speed, onWeekChange]);

  // Global keyboard shortcuts (Space, ArrowLeft, ArrowRight, Home, End)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        onStepForward();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        onStepBackward();
      } else if (e.code === 'Home') {
        e.preventDefault();
        onWeekChange(1);
      } else if (e.code === 'End') {
        e.preventDefault();
        onWeekChange(totalWeeks);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePlay, onStepForward, onStepBackward, onWeekChange, totalWeeks]);

  // Handle Scrubbing Live (0ms lag)
  const calculateWeekFromEvent = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return currentWeek;
      const rect = trackRef.current.getBoundingClientRect();
      const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const ratio = offsetX / rect.width;
      const targetWeek = Math.max(1, Math.min(totalWeeks, Math.round(ratio * (totalWeeks - 1)) + 1));
      return targetWeek;
    },
    [totalWeeks, currentWeek]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    const newWeek = calculateWeekFromEvent(e.clientX);
    onWeekChange(newWeek);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const newWeek = calculateWeekFromEvent(e.clientX);
    if (newWeek !== currentWeek) {
      onWeekChange(newWeek);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {
        console.warn('[TimeScrubber] Pointer capture release failed:', err);
      }
    }
  };

  // Calendar date derivation
  const simulatedDate = new Date(2025, 0, 1 + (currentWeek - 1) * 7);
  const formattedDate = simulatedDate.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Shock milestones with exact v2 compact badge copy and shape pairings
  const milestones = [
    { week: 12, code: 'WK12', label: 'Idiosyncratic Shock', shape: '●', color: 'var(--idio)' },
    { week: 34, code: 'WK34', label: 'Ward Flood (Covariate)', shape: '■', color: 'var(--covariate)' },
    { week: 52, code: 'WK52', label: 'Annual Loan Cycle Renewal', shape: '▲', color: 'var(--ink-1)' },
    { week: 60, code: 'WK60', label: '60+ DPD Refinancing Freeze', shape: '▲', color: 'var(--induced)' },
  ];

  return (
    <div
      style={{
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-16)',
        padding: '0 var(--space-24)',
        backgroundColor: 'var(--surface-0)',
        borderBottom: '1px solid var(--hairline)',
        zIndex: 'var(--z-sticky)' as any,
        userSelect: 'none',
      }}
      role="region"
      aria-label="Simulation Scrubber and Timeline"
    >
      {/* Transport Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexShrink: 0 }}>
        {/* Play/Pause */}
        <button
          className="btn-primary"
          onClick={onTogglePlay}
          style={{
            width: '32px',
            height: '32px',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isPlaying ? 'Pause (Space)' : 'Play cascade (Space)'}
          aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
        >
          {isPlaying ? (
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
              <rect width="3.5" height="12" rx="1" />
              <rect x="6.5" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
              <path d="M1 1L9 6L1 11V1Z" />
            </svg>
          )}
        </button>

        {/* Step Backward */}
        <button
          className="btn-secondary"
          onClick={onStepBackward}
          disabled={currentWeek <= 1}
          style={{
            width: '28px',
            height: '28px',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Step backward 1 week (Left Arrow)"
          aria-label="Step backward 1 week"
        >
          <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
            <path d="M7 1L2 5L7 9V1Z" />
          </svg>
        </button>

        {/* Step Forward */}
        <button
          className="btn-secondary"
          onClick={onStepForward}
          disabled={currentWeek >= totalWeeks}
          style={{
            width: '28px',
            height: '28px',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Step forward 1 week (Right Arrow)"
          aria-label="Step forward 1 week"
        >
          <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
            <path d="M1 1L6 5L1 9V1Z" />
          </svg>
        </button>

        {/* Segmented Speed Toggle: 1x / 2x / 4x */}
        <div
          style={{
            display: 'inline-flex',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-control)',
            backgroundColor: 'var(--surface-1)',
            marginLeft: 'var(--space-4)',
            overflow: 'hidden',
          }}
          role="group"
          aria-label="Playback speed"
        >
          {([1, 2, 4] as const).map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={{
                height: '26px',
                padding: '0 8px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: speed === s ? 600 : 400,
                color: speed === s ? 'var(--ink-0)' : 'var(--ink-2)',
                backgroundColor: speed === s ? 'var(--surface-2)' : 'transparent',
                border: 'none',
                borderRight: s !== 4 ? '1px solid var(--hairline)' : 'none',
                cursor: 'pointer',
                transition: 'background 120ms ease, color 120ms ease',
              }}
              title={`Set speed to ${s}x`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Week Label in Display Face & Date in ink-1 */}
      <div style={{ minWidth: '130px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--ink-0)',
              letterSpacing: '-0.02em',
            }}
          >
            Week {currentWeek}
          </span>
          <span
            className="tabular-num"
            style={{ fontSize: '11px', color: 'var(--ink-2)' }}
          >
            / {totalWeeks}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--ink-1)', lineHeight: 1.2 }}>
          {formattedDate}
        </div>
      </div>

      {/* Timeline Track with Shock Milestones & Histogram */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          flex: 1,
          position: 'relative',
          height: '48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          cursor: isDragging ? 'grabbing' : 'pointer',
          touchAction: 'none',
        }}
        role="slider"
        aria-valuemin={1}
        aria-valuemax={totalWeeks}
        aria-valuenow={currentWeek}
        aria-label="Simulation timeline week scrubber"
      >
        {/* Shock Marker Row above track */}
        <div
          style={{
            position: 'relative',
            height: '18px',
            width: '100%',
            marginBottom: '4px',
            pointerEvents: 'none',
          }}
        >
          {milestones.map(m => {
            const leftRatio = (m.week - 1) / (totalWeeks - 1);
            const isTarget = currentWeek === m.week;
            return (
              <div
                key={m.week}
                onClick={e => {
                  e.stopPropagation();
                  onWeekChange(m.week);
                }}
                style={{
                  position: 'absolute',
                  left: `${leftRatio * 100}%`,
                  transform: 'translateX(-50%)',
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-control)',
                  backgroundColor: isTarget ? 'var(--surface-3)' : 'var(--surface-1)',
                  border: `1px solid ${isTarget ? m.color : 'var(--hairline)'}`,
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  color: isTarget ? 'var(--ink-0)' : 'var(--ink-1)',
                  zIndex: isTarget ? 15 : 10,
                  transition: 'border-color 120ms, color 120ms',
                }}
                title={`Week ${m.week}: ${m.label}`}
              >
                <span style={{ color: m.color, fontSize: '8px' }}>{m.shape}</span>
                <span>{m.code}</span>
              </div>
            );
          })}
        </div>

        {/* 78 Histogram Bars Track */}
        <div
          style={{
            position: 'relative',
            height: '24px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '1px',
            backgroundColor: 'var(--surface-1)',
            borderRadius: 'var(--radius-table)',
            border: '1px solid var(--hairline)',
            padding: '2px 3px',
            overflow: 'hidden',
          }}
        >
          {Array.from({ length: totalWeeks }).map((_, idx) => {
            const w = idx + 1;
            const stressVal = weeklyStressScores[idx] ?? 0.12;
            const isPassed = w <= currentWeek;
            const isCurrent = w === currentWeek;

            let barColor = isPassed ? 'rgba(167, 175, 194, 0.4)' : 'rgba(108, 118, 137, 0.2)';
            if (stressVal > 0.35) {
              barColor = isPassed ? 'var(--induced)' : 'rgba(224, 90, 107, 0.3)';
            } else if (stressVal > 0.22) {
              barColor = isPassed ? 'var(--idio)' : 'rgba(232, 196, 104, 0.3)';
            }

            if (isCurrent) {
              barColor = 'var(--ink-0)';
            }

            const barHeight = Math.max(3, Math.round(stressVal * 20));

            return (
              <div
                key={w}
                style={{
                  flex: 1,
                  height: `${barHeight}px`,
                  backgroundColor: barColor,
                  borderRadius: '0px',
                  transition: 'height 80ms ease, background-color 80ms ease',
                }}
              />
            );
          })}

          {/* Draggable Playhead Needle */}
          <div
            style={{
              position: 'absolute',
              left: `${((currentWeek - 1) / (totalWeeks - 1)) * 100}%`,
              top: 0,
              bottom: 0,
              width: '2px',
              backgroundColor: 'var(--ink-0)',
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
              zIndex: 20,
            }}
          >
            {/* Playhead Handle Top indicator */}
            <div
              style={{
                position: 'absolute',
                top: '-3px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '6px',
                height: '6px',
                backgroundColor: 'var(--ink-0)',
                borderRadius: '50%',
              }}
            />
          </div>
        </div>
      </div>

      {/* Direct Jump Pill Buttons */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', flexShrink: 0 }}>
        {milestones.map(m => (
          <button
            key={m.week}
            className="btn-secondary"
            onClick={() => onWeekChange(m.week)}
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              height: '26px',
              padding: '0 8px',
              borderColor: currentWeek === m.week ? m.color : 'var(--hairline)',
              color: currentWeek === m.week ? 'var(--ink-0)' : 'var(--ink-1)',
            }}
            title={`Jump directly to Week ${m.week}`}
          >
            {m.code}
          </button>
        ))}
      </div>
    </div>
  );
};
