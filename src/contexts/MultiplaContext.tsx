import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ApiFixture } from '@/types/fixture';

export interface MultiplaSelection {
  fixture: ApiFixture;
  pick: 'home' | 'draw' | 'away';
  odd: number;
}

interface MultiplaContextType {
  selections: MultiplaSelection[];
  addSelection: (fixture: ApiFixture, pick: 'home' | 'draw' | 'away', odd: number) => void;
  removeSelection: (fixtureId: number) => void;
  toggleSelection: (fixture: ApiFixture, pick: 'home' | 'draw' | 'away', odd: number) => void;
  clearAll: () => void;
  isSelected: (fixtureId: number) => boolean;
  getSelection: (fixtureId: number) => MultiplaSelection | undefined;
  combinedOdds: number;
  maxReached: boolean;
}

const MultiplaContext = createContext<MultiplaContextType | null>(null);

const MAX_SELECTIONS = 8;

export function MultiplaProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<MultiplaSelection[]>([]);

  const addSelection = useCallback((fixture: ApiFixture, pick: 'home' | 'draw' | 'away', odd: number) => {
    setSelections(prev => {
      if (prev.length >= MAX_SELECTIONS) return prev;
      const filtered = prev.filter(s => s.fixture.fixture.id !== fixture.fixture.id);
      return [...filtered, { fixture, pick, odd }];
    });
  }, []);

  const removeSelection = useCallback((fixtureId: number) => {
    setSelections(prev => prev.filter(s => s.fixture.fixture.id !== fixtureId));
  }, []);

  const toggleSelection = useCallback((fixture: ApiFixture, pick: 'home' | 'draw' | 'away', odd: number) => {
    setSelections(prev => {
      const existing = prev.find(s => s.fixture.fixture.id === fixture.fixture.id);
      if (existing && existing.pick === pick) {
        return prev.filter(s => s.fixture.fixture.id !== fixture.fixture.id);
      }
      if (existing) {
        return prev.map(s => s.fixture.fixture.id === fixture.fixture.id ? { fixture, pick, odd } : s);
      }
      if (prev.length >= MAX_SELECTIONS) return prev;
      return [...prev, { fixture, pick, odd }];
    });
  }, []);

  const clearAll = useCallback(() => setSelections([]), []);

  const isSelected = useCallback((fixtureId: number) => {
    return selections.some(s => s.fixture.fixture.id === fixtureId);
  }, [selections]);

  const getSelection = useCallback((fixtureId: number) => {
    return selections.find(s => s.fixture.fixture.id === fixtureId);
  }, [selections]);

  const combinedOdds = selections.reduce((acc, s) => acc * s.odd, 1);

  return (
    <MultiplaContext.Provider value={{
      selections, addSelection, removeSelection, toggleSelection,
      clearAll, isSelected, getSelection, combinedOdds,
      maxReached: selections.length >= MAX_SELECTIONS,
    }}>
      {children}
    </MultiplaContext.Provider>
  );
}

export function useMultipla() {
  const ctx = useContext(MultiplaContext);
  if (!ctx) throw new Error('useMultipla must be used within MultiplaProvider');
  return ctx;
}
