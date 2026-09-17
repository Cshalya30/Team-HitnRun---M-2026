import React from 'react';
import type { Route } from '../../hooks/useUrlState';

interface RouteNavProps {
  activeRoute: Route;
  onRouteChange: (route: Route) => void;
}

export const RouteNav: React.FC<RouteNavProps> = ({ activeRoute, onRouteChange }) => {
  const routes: ('queue' | 'network' | 'portfolio' | 'system')[] = ['queue', 'network', 'portfolio', 'system'];

  return (
    <nav
      style={{
        display: 'flex',
        height: '36px',
        backgroundColor: 'var(--surface-0)',
        borderBottom: '1px solid var(--hairline)',
        padding: '0 var(--space-24)',
        gap: 'var(--space-24)'
      }}
    >
      <style>
        {`
          .route-nav-btn {
            height: 100%;
            background: none;
            border: none;
            padding: 0 4px;
            cursor: pointer;
            font-family: var(--font-mono);
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
            color: var(--ink-1);
            border-bottom: 2px solid transparent;
            transition: color 120ms cubic-bezier(.2,0,.4,1), border-color 120ms cubic-bezier(.2,0,.4,1);
            display: flex;
            align-items: center;
            box-sizing: border-box;
          }
          .route-nav-btn:hover {
            color: var(--ink-0);
          }
          .route-nav-btn.active {
            color: var(--ink-0);
            font-weight: 700;
            border-bottom: 2px solid var(--ink-0);
          }
          .route-nav-btn:focus-visible {
            outline: 2px solid var(--ink-0);
            outline-offset: -2px;
            border-radius: 2px;
          }
          [data-theme="maximalist"] .route-nav-btn {
            font-weight: 800 !important;
            border: 2px solid transparent !important;
            padding: 2px 14px !important;
            margin: 4px 0 !important;
            border-radius: 4px !important;
            color: #000000 !important;
            transition: all 120ms ease !important;
          }
          [data-theme="maximalist"] .route-nav-btn:hover {
            background-color: #FFE600 !important;
            border-color: #000000 !important;
            box-shadow: 2px 2px 0px #000000 !important;
            transform: translate(-1px, -1px);
          }
          [data-theme="maximalist"] .route-nav-btn.active {
            background-color: #0038FF !important;
            color: #FFFFFF !important;
            border: 2px solid #000000 !important;
            box-shadow: 3px 3px 0px #000000 !important;
            border-bottom: 2px solid #000000 !important;
          }
        `}
      </style>
      {routes.map((route) => (
        <button
          key={route}
          className={`route-nav-btn ${activeRoute === route ? 'active' : ''}`}
          onClick={() => onRouteChange(route)}
        >
          {route}
        </button>
      ))}
    </nav>
  );
};
