import React, { useState, useEffect } from 'react';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme]);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    window.dispatchEvent(new Event('themechange'));
  };

  return (
    <button
      onClick={toggle}
      className="btn-ghost"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        height: '28px',
        padding: '0 10px',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-control)',
        backgroundColor: 'var(--surface-2)',
        color: 'var(--ink-0)',
        cursor: 'pointer',
      }}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <span>{theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}</span>
    </button>
  );
};
