import { useEffect, useRef } from 'react';
import { useBets, useResolveBet, type BetRow } from '@/hooks/useBets';
import { fetchFixtureById } from '@/services/footballApi';
import { useAuth } from '@/contexts/AuthContext';

const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN']);

function normalizeFixtureId(value: BetRow['fixture_id'] | string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getResultFromScore(home: number, away: number): '1' | 'X' | '2' {
  if (home > away) return '1';
  if (away > home) return '2';
  return 'X';
}

export function useAutoResolveBets() {
  const { data: bets = [] } = useBets();
  const resolveBet = useResolveBet();
  const { user } = useAuth();
  const latestBets = useRef<BetRow[]>(bets);
  const isRunning = useRef(false);
  const inFlight = useRef(new Set<string>());

  useEffect(() => {
    latestBets.current = bets;
  }, [bets]);

  useEffect(() => {
    let active = true;

    const checkPending = async () => {
      if (!user) return;
      if (isRunning.current) return;
      isRunning.current = true;

      try {
        const pending = latestBets.current.filter((bet) => {
          if (bet.status !== 'pending') return false;
          return normalizeFixtureId(bet.fixture_id) !== null;
        });

        for (const bet of pending) {
          if (!active || inFlight.current.has(bet.id)) continue;
          const fixtureId = normalizeFixtureId(bet.fixture_id);
          if (fixtureId === null) continue;
          inFlight.current.add(bet.id);

          try {
            const fixture = await fetchFixtureById(fixtureId);
            if (!fixture) continue;

            const statusShort = fixture.fixture.status.short;
            const homeGoals = fixture.goals.home;
            const awayGoals = fixture.goals.away;

            if (!FINISHED_STATUSES.has(statusShort) || homeGoals === null || awayGoals === null) {
              continue;
            }

            const actualResult = getResultFromScore(homeGoals, awayGoals);
            const status = actualResult === bet.prediction ? 'won' : 'lost';
            const profitLoss = status === 'won' ? bet.potential_profit : -bet.stake;
            const actualScore = `${homeGoals}-${awayGoals}`;

            if (active) {
              await resolveBet.mutateAsync({
                id: bet.id,
                status,
                actual_result: actualResult,
                actual_score: actualScore,
                profit_loss: profitLoss,
              });
            }
          } finally {
            inFlight.current.delete(bet.id);
          }
        }
      } finally {
        isRunning.current = false;
      }
    };

    checkPending();
    const interval = window.setInterval(checkPending, 60000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [resolveBet, user]);
}
