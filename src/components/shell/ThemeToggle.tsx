import React, { useState, useEffect } from 'react';

export type AppTheme = 'dark' | 'light';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<AppTheme>(() => {
    if (typeof document !== 'undefined') {
      const current = document.documentElement.getAttribute('data-theme') as AppTheme;
      if (current === 'light') {
        return 'light';
      }
    }
    return 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    window.dispatchEvent(new Event('themechange'));
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <button
      onClick={toggleTheme}
      className="btn-ghost"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        fontWeight: 800,
        height: '28px',
        padding: '0 12px',
        borderRadius: 'var(--radius-control)',
        cursor: 'pointer',
        border: theme === 'light' ? '2px solid #000000' : '2px solid #00FF66',
        backgroundColor: theme === 'light' ? '#FFE600' : '#000000',
        color: theme === 'light' ? '#000000' : '#00FF66',
        boxShadow: theme === 'light' ? '2px 2px 0px #000000' : '2px 2px 0px #00FF66',
        transition: 'all 120ms cubic-bezier(.2,0,.4,1)',
      }}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
      aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
    >
      <span>{theme === 'dark' ? '⚡ DARK' : '⚡ LIGHT'}</span>
    </button>
  );
};
