import { TrendingUp, Minus, TrendingDown } from 'lucide-react';
import { getBadgeJogo } from '@/lib/evDecision';

interface EVBadgeProps {
  fixtureId: number;
}

/**
 * Calculates a simulated EV for a fixture and renders a colored badge.
 * APOSTAR (green): EV > +5%
 * NEUTRO (yellow): EV 0% to 5%
 * EVITAR (red): EV < 0%
 */
export function EVBadge({ fixtureId }: EVBadgeProps) {
  // Simulate EV from fixture ID (deterministic pseudo-random)
  const seed = fixtureId;
  const homeGoalAvg = 1.2 + ((seed % 15) / 10);
  const awayGoalAvg = 0.8 + (((seed * 3) % 15) / 10);

  // Simple Poisson probabilities
  const factorial = (n: number) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
  const poisson = (l: number, k: number) => (Math.pow(l, k) * Math.exp(-l)) / factorial(k);

  let pH = 0, pD = 0, pA = 0;
  for (let h = 0; h <= 6; h++) {
    for (let a = 0; a <= 6; a++) {
      const p = poisson(homeGoalAvg, h) * poisson(awayGoalAvg, a);
      if (h > a) pH += p;
      else if (h === a) pD += p;
      else pA += p;
    }
  }

  // Simulated odds
  const oddH = 1.4 + (seed % 30) / 10;
  const oddD = 2.8 + ((seed * 7) % 20) / 10;
  const oddA = 2.0 + ((seed * 13) % 40) / 10;

  // Best EV
  const evH = (pH * oddH - 1) * 100;
  const evD = (pD * oddD - 1) * 100;
  const evA = (pA * oddA - 1) * 100;
  const bestEV = Math.max(evH, evD, evA);

  const badge = getBadgeJogo(bestEV);

  if (badge.texto === 'APOSTAR') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-oracle-win/15 text-oracle-win border border-oracle-win/30">
        <TrendingUp className="w-3 h-3" /> APOSTAR
      </span>
    );
  }

  if (badge.texto === 'NEUTRO') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
        <Minus className="w-3 h-3" /> NEUTRO
      </span>
    );
  }

  if (badge.texto === 'EV FRACO') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <Minus className="w-3 h-3" /> EV FRACO
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
      <TrendingDown className="w-3 h-3" /> EVITAR
    </span>
  );
}
