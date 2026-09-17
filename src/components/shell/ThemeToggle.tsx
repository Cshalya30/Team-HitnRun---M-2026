import React, { useState, useEffect } from 'react';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    // On mount, resolve from system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = prefersDark ? 'dark' : 'light';
    setTheme(initial);
    // Don't set data-theme on mount - let CSS media query handle it
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <button
      className="btn-ghost"
      onClick={toggle}
      style={{
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        height: '24px',
        padding: '0 8px',
      }}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? 'LIGHT' : 'DARK'}
    </button>
  );
};
