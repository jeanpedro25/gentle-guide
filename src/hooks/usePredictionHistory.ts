import { useState, useCallback, useEffect } from 'react';
import { MatchAnalysis } from '@/types/prediction';

const STORAGE_KEY = 'oracle-bet-history';
const MAX_HISTORY = 8;

function clampText(value: string | undefined, max: number): string {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function compactAnalysis(analysis: MatchAnalysis): MatchAnalysis {
  return {
    id: analysis.id,
    homeTeam: clampText(analysis.homeTeam, 80),
    awayTeam: clampText(analysis.awayTeam, 80),
    homeTeamLogo: analysis.homeTeamLogo,
    awayTeamLogo: analysis.awayTeamLogo,
    sport: clampText(analysis.sport, 40),
    league: clampText(analysis.league, 120),
    date: analysis.date,
    result: {
      ...analysis.result,
      reasoning: clampText(analysis.result.reasoning, 380),
      keyFactors: Array.isArray(analysis.result.keyFactors)
        ? analysis.result.keyFactors.slice(0, 5).map((factor) => clampText(factor, 80))
        : [],
      suggestedBet: clampText(analysis.result.suggestedBet, 120),
      oddsTrend: clampText(analysis.result.oddsTrend, 120),
    },
    timestamp: analysis.timestamp,
    fixtureId: analysis.fixtureId,
    // Oracle payload can be very large; keep history lightweight in storage.
    oracle: undefined,
  };
}

function toStoragePayload(history: MatchAnalysis[]): MatchAnalysis[] {
  return history.slice(0, MAX_HISTORY).map(compactAnalysis);
}

export function usePredictionHistory() {
  const [history, setHistory] = useState<MatchAnalysis[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return toStoragePayload(parsed as MatchAnalysis[]);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const payload = toStoragePayload(history);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Fallback: persist only essential newest entries when storage quota is tight.
      try {
        localStorage.removeItem(STORAGE_KEY);
        const minimal = payload.slice(0, 2).map((entry) => ({
          ...entry,
          result: {
            ...entry.result,
            reasoning: '',
            keyFactors: [],
            oddsTrend: '',
          },
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
      } catch {
        // Storage is completely full — skip persistence to avoid runtime crash.
      }
    }
  }, [history]);

  const addPrediction = useCallback((analysis: MatchAnalysis) => {
    setHistory((prev) => [compactAnalysis(analysis), ...prev].slice(0, MAX_HISTORY));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, addPrediction, clearHistory };
}
