import { useEffect, useRef } from 'react';
import { useBets, useResolveBet, type BetRow } from '@/hooks/useBets';
import { fetchFixtureById } from '@/services/footballApi';

const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN']);

function getResultFromScore(home: number, away: number): '1' | 'X' | '2' {
  if (home > away) return '1';
  if (away > home) return '2';
  return 'X';
}

export function useAutoResolveBets() {
  const { data: bets = [] } = useBets();
  const resolveBet = useResolveBet();
  const latestBets = useRef<BetRow[]>(bets);
  const isRunning = useRef(false);
  const inFlight = useRef(new Set<string>());

  useEffect(() => {
    latestBets.current = bets;
  }, [bets]);

  useEffect(() => {
    let active = true;

    const checkPending = async () => {
      if (isRunning.current) return;
      isRunning.current = true;

      try {
        const pending = latestBets.current.filter(
          (bet) => bet.status === 'pending' && typeof bet.fixture_id === 'number',
        );

        for (const bet of pending) {
          if (!active || inFlight.current.has(bet.id) || bet.fixture_id === null) continue;
          inFlight.current.add(bet.id);

          try {
            const fixture = await fetchFixtureById(bet.fixture_id);
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
  }, [resolveBet]);
}
