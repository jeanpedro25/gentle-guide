import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateBet } from '@/hooks/useBets';
import { useBankroll } from '@/hooks/usePredictions';

interface BetCardProps {
  homeTeam: string;
  awayTeam: string;
  league: string;
  fixtureId: number;
  prediction: string;
  odd: number;
}

export function BetCard({ homeTeam, awayTeam, league, fixtureId, prediction, odd }: BetCardProps) {
  const [betAmount, setBetAmount] = useState('');
  const createBet = useCreateBet();
  const { data: bankroll } = useBankroll();

  const bankrollAmount = bankroll?.amount ?? 200;
  const betValue = parseFloat(betAmount.replace(',', '.')) || 0;
  const potentialProfit = betValue * (odd - 1);
  const totalReturn = betValue + potentialProfit;
  const exceedsBankroll = betValue > bankrollAmount;

  const quickValues = [10, 20, 50, 100];

  const handleBetAmountChange = (value: string) => {
    const normalized = value.replace(',', '.');
    if (!/^\d*(\.\d{0,2})?$/.test(normalized)) return;
    setBetAmount(normalized);
  };

  const applyQuickDelta = (delta: number) => {
    const nextValue = Math.max(0, betValue + delta);
    setBetAmount(nextValue > 0 ? nextValue.toFixed(2) : '');
  };

  const handleConfirmBet = async () => {
    if (betValue <= 0 || exceedsBankroll) return;

    try {
      await createBet.mutateAsync({
        home_team: homeTeam,
        away_team: awayTeam,
        league: league,
        fixture_id: fixtureId,
        prediction: prediction as any,
        stake: betValue,
        potential_profit: potentialProfit,
        odd: odd,
      });

      toast.success('Aposta registrada com sucesso!', {
        description: `R$ ${betValue.toFixed(2)} -> Retorno de R$ ${totalReturn.toFixed(2)}`,
      });
      setBetAmount('');
    } catch {
      toast.error('Erro ao registrar aposta.');
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,rgba(22,22,22,0.9),rgba(30,30,30,0.95))] p-5 shadow-[0_16px_44px_rgba(0,0,0,0.38)]">
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-primary" />
        <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-foreground">Sua Aposta</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Valor apostado (R$)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={betAmount}
            onChange={(e) => handleBetAmountChange(e.target.value)}
            placeholder="0,00"
            className="h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm font-bold text-foreground outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Lucro se ganhar (R$)
          </label>
          <div className="flex h-11 items-center rounded-lg border border-white/5 bg-white/5 px-3">
            <span className={`text-sm font-bold ${betValue > 0 ? 'text-primary' : 'text-muted-foreground/50'}`}>
              {betValue > 0 ? potentialProfit.toFixed(2) : '0.00'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickValues.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => applyQuickDelta(value)}
            className="flex-1 min-w-[50px] rounded-lg border border-white/10 bg-white/5 py-2 text-[11px] font-bold text-foreground transition-all hover:border-primary/40 hover:bg-white/10"
          >
            +{value}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setBetAmount('')}
          className="flex-1 min-w-[70px] rounded-lg border border-white/10 bg-white/5 py-2 text-[11px] font-bold uppercase text-muted-foreground transition-all hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
        >
          Limpar
        </button>
      </div>

      <button
        type="button"
        onClick={handleConfirmBet}
        disabled={betValue <= 0 || exceedsBankroll || createBet.isPending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#ff4d4f,#ff2f2f)] text-sm font-extrabold uppercase tracking-[0.08em] text-white shadow-[0_10px_20px_rgba(255,58,58,0.2)] transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {createBet.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-current" />}
        Registrar Aposta
      </button>

      {betValue > 0 && (
        <p className="text-center text-[10px] text-muted-foreground">
          Aposta de R$ {betValue.toFixed(2)} pode retornar R$ {totalReturn.toFixed(2)}
        </p>
      )}
    </div>
  );
}