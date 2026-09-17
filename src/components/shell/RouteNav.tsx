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
            color: var(--ink-2);
            border-bottom: 2px solid transparent;
            transition: color 120ms cubic-bezier(.2,0,.4,1), border-color 120ms cubic-bezier(.2,0,.4,1);
            display: flex;
            align-items: center;
            box-sizing: border-box;
          }
          .route-nav-btn:hover {
            color: var(--ink-1);
          }
          .route-nav-btn.active {
            color: var(--ink-0);
            border-bottom: 2px solid var(--ink-0);
          }
          .route-nav-btn:focus-visible {
            outline: 2px solid var(--ink-0);
            outline-offset: -2px;
            border-radius: 2px;
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
