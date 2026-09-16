import { useState, useEffect, useCallback } from 'react';

export interface UrlState {
  seed: number;
  week: number;
  borrowerId: string;
  scenario: string;
}

export function useUrlState(defaults: UrlState) {
  // Parse initial state from window.location.search
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
      };
    } catch (err) {
      console.warn('[Tremor URL State] Failed to parse query string, using defaults:', err);
      return defaults;
    }
  };

  const [state, setState] = useState<UrlState>(parseUrl);

  // Sync to URL query string whenever state changes without full page reload
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('seed', state.seed.toString());
    params.set('week', state.week.toString());
    params.set('borrower', state.borrowerId);
    params.set('scenario', state.scenario);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [state]);

  // Handle popstate for back/forward browser buttons
  useEffect(() => {
    const handlePopState = () => {
      setState(parseUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
    setWeek,
    setBorrowerId,
    setScenario,
    setSeed,
  };
}
