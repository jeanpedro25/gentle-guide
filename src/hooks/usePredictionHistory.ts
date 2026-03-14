import { useState, useCallback, useEffect } from 'react';
import { MatchAnalysis } from '@/types/prediction';

const STORAGE_KEY = 'oracle-bet-history';
const MAX_HISTORY = 8;

export function usePredictionHistory() {
  const [history, setHistory] = useState<MatchAnalysis[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const addPrediction = useCallback((analysis: MatchAnalysis) => {
    setHistory((prev) => [analysis, ...prev].slice(0, MAX_HISTORY));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, addPrediction, clearHistory };
}
