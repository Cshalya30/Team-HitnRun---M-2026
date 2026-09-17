import { useState, useEffect, useCallback } from 'react';

export type Route = 'queue' | 'network' | 'portfolio' | 'system' | '404';

export interface UrlState {
  seed: number;
  week: number;
  borrowerId: string;
  scenario: string;
  route: Route;
}

const VALID_ROUTES: ('queue' | 'network' | 'portfolio' | 'system')[] = ['queue', 'network', 'portfolio', 'system'];

function parseRouteFromPath(pathname: string): Route {
  const cleaned = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (!cleaned) return 'network';
  if (VALID_ROUTES.includes(cleaned as any)) {
    return cleaned as Route;
  }
  return '404';
}

export function useUrlState(defaults: Omit<UrlState, 'route'>) {
  // Parse initial state from URL
  const parseUrl = (): UrlState => {
    try {
      const params = new URLSearchParams(window.location.search);
      const seedParam = params.get('seed');
      const weekParam = params.get('week');
      const borrowerParam = params.get('selected') || params.get('borrower');
      const resolvedBorrowerId =
        borrowerParam?.toLowerCase() === 'sunita' ? 'b-413' : borrowerParam || defaults.borrowerId;
      const scenarioParam = params.get('scenario');

      return {
        seed: seedParam ? parseInt(seedParam, 10) : defaults.seed,
        week: weekParam ? Math.min(78, Math.max(1, parseInt(weekParam, 10))) : defaults.week,
        borrowerId: resolvedBorrowerId,
        scenario: scenarioParam || defaults.scenario,
        route: parseRouteFromPath(window.location.pathname),
      };
    } catch (err) {
      console.warn('[Tremor URL State] Failed to parse query string, using defaults:', err);
      return { ...defaults, route: 'network' };
    }
  };

  const [state, setState] = useState<UrlState>(parseUrl);

  // Sync to URL whenever state changes
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('seed', state.seed.toString());
    params.set('week', state.week.toString());
    if (state.borrowerId) {
      params.set('borrower', state.borrowerId);
    }
    params.set('scenario', state.scenario);

    const newUrl = `/${state.route}?${params.toString()}`;
    // Use replaceState for parameter changes, pushState for route changes
    window.history.replaceState(null, '', newUrl);
  }, [state]);

  // Handle popstate for back/forward browser buttons
  useEffect(() => {
    const handlePopState = () => {
      setState(parseUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setRoute = useCallback((route: Route) => {
    setState(prev => {
      // Push a new history entry for route changes
      const params = new URLSearchParams();
      params.set('seed', prev.seed.toString());
      params.set('week', prev.week.toString());
      if (prev.borrowerId) {
        params.set('borrower', prev.borrowerId);
      }
      params.set('scenario', prev.scenario);
      window.history.pushState(null, '', `/${route}?${params.toString()}`);

      return { ...prev, route };
    });
  }, []);

  const setWeek = useCallback((week: number) => {
    setState(prev => ({ ...prev, week }));
  }, []);

  const setBorrowerId = useCallback((borrowerId: string) => {
    setState(prev => ({ ...prev, borrowerId }));
  }, []);

  const setScenario = useCallback((scenario: string) => {
    setState(prev => ({ ...prev, scenario }));
  }, []);

  const setSeed = useCallback((seed: number) => {
    setState(prev => ({ ...prev, seed }));
  }, []);

  return {
    state,
    setRoute,
    setWeek,
    setBorrowerId,
    setScenario,
    setSeed,
  };
}
