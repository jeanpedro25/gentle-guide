import { useMemo } from 'react';
import { BetRow } from '@/hooks/useBets';

export interface StopLossStatus {
  /** Daily: lost 3+ bets today */
  dailyTriggered: boolean;
  dailyLosses: number;
  /** Weekly: lost 20%+ of bankroll this week */
  weeklyTriggered: boolean;
  weeklyLossPct: number;
  /** Total: bankroll below 65% of initial */
  totalTriggered: boolean;
  healthPct: number;
  /** Any stop triggered */
  blocked: boolean;
  /** Severity level */
  severity: 'safe' | 'warning' | 'danger' | 'critical';
  /** Message to display */
  message: string;
}

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function startOfWeek(d: Date) {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday start
  r.setDate(r.getDate() - diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function useStopLoss(
  bets: BetRow[],
  currentBankroll: number,
  initialBankroll: number,
): StopLossStatus {
  return useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);

    // Daily: count losses today
    const todayLosses = bets.filter(b =>
      b.status === 'lost' &&
      b.resolved_at &&
      new Date(b.resolved_at) >= todayStart
    ).length;
    const dailyTriggered = todayLosses >= 3;

    // Weekly: sum profit_loss this week
    const weekBets = bets.filter(b =>
      b.resolved_at &&
      new Date(b.resolved_at) >= weekStart &&
      (b.status === 'won' || b.status === 'lost')
    );
    const weekPnL = weekBets.reduce((sum, b) => sum + (b.profit_loss ?? 0), 0);
    const weeklyLossPct = initialBankroll > 0 ? Math.abs(Math.min(weekPnL, 0)) / initialBankroll * 100 : 0;
    const weeklyTriggered = weeklyLossPct >= 20;

    // Total: bankroll below 65% of initial
    const healthPct = initialBankroll > 0 ? (currentBankroll / initialBankroll) * 100 : 100;
    const totalTriggered = healthPct < 65;

    const blocked = weeklyTriggered || totalTriggered;

    let severity: StopLossStatus['severity'] = 'safe';
    let message = '';

    if (totalTriggered) {
      severity = 'critical';
      message = `🔴 STOP TOTAL — Banca abaixo de 65% do inicial (${healthPct.toFixed(0)}%). Revise sua estratégia antes de continuar.`;
    } else if (weeklyTriggered) {
      severity = 'danger';
      message = `🟠 STOP SEMANAL — Perda de ${weeklyLossPct.toFixed(0)}% na semana. Novas apostas bloqueadas por segurança.`;
    } else if (dailyTriggered) {
      severity = 'warning';
      message = `🟡 STOP DIÁRIO — ${todayLosses} perdas hoje. Recomendamos pausar e voltar amanhã.`;
    }

    return {
      dailyTriggered,
      dailyLosses: todayLosses,
      weeklyTriggered,
      weeklyLossPct,
      totalTriggered,
      healthPct,
      blocked,
      severity,
      message,
    };
  }, [bets, currentBankroll, initialBankroll]);
}
