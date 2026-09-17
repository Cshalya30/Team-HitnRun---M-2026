import React from 'react';
import type { Route } from '../../hooks/useUrlState';

interface RouteNavProps {
  activeRoute: Route;
  onRouteChange: (route: Route) => void;
}

export const RouteNav: React.FC<RouteNavProps> = ({ activeRoute, onRouteChange }) => {
  const routes: { id: Route; label: string; badge?: string }[] = [
    { id: 'network', label: 'NETWORK CONTAGION' },
    { id: 'queue', label: 'WORKLIST QUEUE' },
    { id: 'portfolio', label: 'PORTFOLIO EXPOSURE' },
    { id: 'system', label: 'SYSTEM METHODOLOGY' },
  ];

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '42px',
        backgroundColor: 'var(--surface-0)',
        borderBottom: '2.5px solid var(--hairline)',
        padding: '0 var(--space-24)',
        gap: 'var(--space-12)',
        overflowX: 'auto',
      }}
    >
      <style>
        {`
          .route-nav-btn {
            height: 30px;
            background: var(--surface-1);
            border: 2px solid var(--hairline);
            border-radius: var(--radius-control);
            padding: 0 14px;
            cursor: pointer;
            font-family: var(--font-mono);
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--ink-0);
            box-shadow: 2px 2px 0px var(--hairline);
            transition: all 100ms ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
          }
          .route-nav-btn:hover {
            transform: translate(-1px, -1px);
            box-shadow: 3px 3px 0px var(--hairline);
            background-color: var(--surface-2);
          }
          .route-nav-btn:active {
            transform: translate(2px, 2px);
            box-shadow: 1px 1px 0px var(--hairline);
          }
          [data-theme="light"] .route-nav-btn.active {
            background-color: #0038FF !important;
            color: #FFFFFF !important;
            border: 2.5px solid #000000 !important;
            box-shadow: 3px 3px 0px #000000 !important;
          }
          :root:not([data-theme="light"]) .route-nav-btn.active {
            background-color: #00FF66 !important;
            color: #000000 !important;
            border: 2.5px solid #00FF66 !important;
            box-shadow: 3px 3px 0px #00FF66 !important;
          }
        `}
      </style>
      {routes.map((r) => (
        <button
          key={r.id}
          className={`route-nav-btn ${activeRoute === r.id ? 'active' : ''}`}
          onClick={() => onRouteChange(r.id)}
        >
          {r.label}
        </button>
      ))}
    </nav>
  );
};
