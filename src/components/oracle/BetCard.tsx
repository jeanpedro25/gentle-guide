import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Zap, Loader2, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { useBets, useCreateBet } from '@/hooks/useBets';
import { useBankroll, useUpdateBankroll } from '@/hooks/usePredictions';
import { useBankrollManager } from '@/hooks/useBankrollManager';

interface BetCardProps {
  homeTeam: string;
  awayTeam: string;
  league: string;
  fixtureId: number;
  prediction: string;
  matchDate?: string;
  odd?: number;
}

export function BetCard({ homeTeam, awayTeam, league, fixtureId, prediction, matchDate }: BetCardProps) {
  const [betAmount, setBetAmount] = useState('');
  const [totalReturnInput, setTotalReturnInput] = useState('');
  
  const createBet = useCreateBet();
  const { data: bets = [] } = useBets();
  
  // Calcula limites considerando a DATA DO JOGO (se fornecida), não hoje!
  const targetDateForLimit = matchDate ? new Date(matchDate) : new Date();
  const { stopStatus } = useBankrollManager(bets, targetDateForLimit);
  
  const { data: bankroll } = useBankroll();

  const bankrollAmount = bankroll?.amount ?? 200;
  const stake = parseFloat(betAmount.replace(',', '.')) || 0;
  const totalReturn = parseFloat(totalReturnInput.replace(',', '.')) || 0;
  const isBlockedByBankroll = stopStatus.blocked;
  
  // Lucro real = O que eu ganho além do que apostei
  const potentialProfit = totalReturn > stake ? totalReturn - stake : 0;
  const calculatedOdd = stake > 0 ? totalReturn / stake : 0;
  
  const exceedsBankroll = stake > bankrollAmount;

  const quickValues = [10, 20, 50, 100];

  const handleConfirmBet = async () => {
    if (stake <= 0 || totalReturn <= 0 || exceedsBankroll) {
      toast.error('Verifique os valores da aposta.');
      return;
    }

    try {
      // Codifica a data do jogo na prediction para o bankroll manager ler depois
      const predictionPayload = matchDate ? `${prediction}@@${matchDate}` : prediction;

      await createBet.mutateAsync({
        home_team: homeTeam,
        away_team: awayTeam,
        league: league,
        fixture_id: fixtureId,
        prediction: predictionPayload as any,
        stake: stake,
        potential_profit: potentialProfit,
        odd: calculatedOdd,
      });

      toast.success('Aposta registrada!', {
        description: `Apostou R$ ${stake.toFixed(2)} para ganhar R$ ${potentialProfit.toFixed(2)} de lucro.`,
      });
      
      setBetAmount('');
      setTotalReturnInput('');
    } catch (error: any) {
      console.error('[BetCard] Error detail:', error);
      toast.error('Erro ao registrar aposta', {
        description: error.message || 'Verifique sua conexão ou saldo.'
      });
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,rgba(22,22,22,0.9),rgba(30,30,30,0.95))] p-5 shadow-[0_16px_44px_rgba(0,0,0,0.38)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-foreground">Sua Aposta Manual</p>
        </div>
        {calculatedOdd > 0 && (
          <span className="text-[10px] font-bold text-primary/60">ODD ESTIMADA: @{calculatedOdd.toFixed(2)}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Quanto vou apostar?
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">R$</span>
            <input
              type="text"
              inputMode="decimal"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="0,00"
              className="h-11 w-full rounded-lg border border-white/10 bg-black/40 pl-8 pr-3 text-sm font-bold text-foreground outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Quanto vou receber?
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary">R$</span>
            <input
              type="text"
              inputMode="decimal"
              value={totalReturnInput}
              onChange={(e) => setTotalReturnInput(e.target.value)}
              placeholder="0,00"
              className="h-11 w-full rounded-lg border border-white/10 bg-black/40 pl-8 pr-3 text-sm font-bold text-primary outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {stake > 0 && totalReturn > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-white/5 p-3 border border-white/5">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Lucro Líquido:</span>
          </div>
          <span className="text-sm font-black text-oracle-win">
            + R$ {potentialProfit.toFixed(2)}
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {quickValues.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setBetAmount(value.toFixed(2))}
            className="flex-1 min-w-[50px] rounded-lg border border-white/10 bg-white/5 py-2 text-[11px] font-bold text-foreground transition-all hover:border-primary/40 hover:bg-white/10"
          >
            R$ {value}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleConfirmBet}
        disabled={stake <= 0 || totalReturn <= 0 || exceedsBankroll || createBet.isPending || isBlockedByBankroll}
        className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold uppercase tracking-[0.08em] text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${isBlockedByBankroll ? 'bg-destructive/50' : 'bg-[linear-gradient(135deg,#ff4d4f,#ff2f2f)] shadow-[0_10px_20px_rgba(255,58,58,0.2)] hover:brightness-110'}`}
      >
        {createBet.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-current" />}
        {isBlockedByBankroll ? 'Operaçaõ Bloqueada' : 'Confirmar Aposta'}
      </button>

      {isBlockedByBankroll && (
        <p className="text-center text-[11px] font-bold text-destructive">
          {stopStatus.message}
        </p>
      )}

      {exceedsBankroll && !isBlockedByBankroll && (
        <p className="text-center text-[10px] font-bold text-destructive animate-pulse">
          VALOR ACIMA DO SALDO DISPONÍVEL!
        </p>
      )}
    </div>
  );
}