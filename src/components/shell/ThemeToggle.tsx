import React, { useState, useEffect } from 'react';

export type AppTheme = 'maximalist' | 'dark' | 'light';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<AppTheme>(() => {
    if (typeof document !== 'undefined') {
      const current = document.documentElement.getAttribute('data-theme') as AppTheme;
      if (current === 'light' || current === 'dark' || current === 'maximalist') {
        return current;
      }
    }
    return 'maximalist';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    window.dispatchEvent(new Event('themechange'));
  }, [theme]);

  const cycleTheme = () => {
    const sequence: AppTheme[] = ['maximalist', 'dark', 'light'];
    const nextIdx = (sequence.indexOf(theme) + 1) % sequence.length;
    const next = sequence[nextIdx];
    setTheme(next);
  };

  const getLabel = () => {
    switch (theme) {
      case 'maximalist':
        return '⚡ MAXIMALIST';
      case 'dark':
        return '🌙 DARK (PITCH)';
      case 'light':
        return '☀️ LIGHT MINIMAL';
    }
  };

  const getStyle = () => {
    if (theme === 'maximalist') {
      return {
        backgroundColor: '#FFE600',
        color: '#000000',
        border: '2.5px solid #000000',
        boxShadow: '3px 3px 0px #000000',
      };
    }
    return {
      backgroundColor: 'var(--surface-2)',
      color: 'var(--ink-0)',
      border: '1px solid var(--hairline)',
    };
  };

  return (
    <button
      onClick={cycleTheme}
      className="btn-ghost"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        height: '28px',
        padding: '0 12px',
        borderRadius: 'var(--radius-control)',
        cursor: 'pointer',
        transition: 'all 120ms cubic-bezier(.2,0,.4,1)',
        ...getStyle(),
      }}
      title={`Current Theme: ${theme.toUpperCase()}. Click to cycle mode.`}
      aria-label={`Current Theme: ${theme.toUpperCase()}. Click to cycle mode.`}
    >
      <span>{getLabel()}</span>
    </button>
  );
};
