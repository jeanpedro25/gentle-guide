import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, Edit2, Check, Target, History, ArrowRight, 
  Loader2, Wallet, ShieldCheck, TrendingUp 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBankroll, useUpdateBankroll } from '@/hooks/usePredictions';
import { useBets, useResolveBet } from '@/hooks/useBets';
import { fetchTodayMatches } from '@/services/footballApi';
import { ApiFixture } from '@/types/fixture';
import { toast } from 'sonner';

export default function BankrollPage() {
  const navigate = useNavigate();
  const { data: bankroll, isLoading: loadingBankroll } = useBankroll();
  const updateBankroll = useUpdateBankroll();
  const { data: bets = [], refetch: refetchBets } = useBets();
  const resolveBet = useResolveBet();

  const [editingBankroll, setEditingBankroll] = useState(false);
  const [bankrollInput, setBankrollInput] = useState('');
  const [resolving, setResolving] = useState(false);

  const bankrollAmount = bankroll?.amount ?? 0;
  const isNewUser = !loadingBankroll && !bankroll;

  const resolved = bets.filter(b => b.status !== 'pending');
  const wins = resolved.filter(b => b.status === 'won');
  const pending = bets.filter(b => b.status === 'pending');
  
  const safePct = 2;
  const maxPct = 5;
  const weeklyStopPct = 20;
  const safeStake = bankrollAmount * (safePct / 100);
  const maxStake = bankrollAmount * (maxPct / 100);
  const weeklyStop = bankrollAmount * (weeklyStopPct / 100);
  const lastBet = bets[0];
  const lastBetPct = bankrollAmount > 0 && lastBet ? (lastBet.stake / bankrollAmount) * 100 : null;
  const riskPerOpPct = lastBetPct !== null ? Math.min(100, lastBetPct) : safePct;
  const riskProfileLabel = riskPerOpPct <= 2 ? 'Conservador' : riskPerOpPct <= 4 ? 'Moderado' : 'Agressivo';
  const riskProfileDescription =
    riskProfileLabel === 'Conservador'
      ? 'Prioriza proteção da banca e consistência.'
      : riskProfileLabel === 'Moderado'
        ? 'Equilíbrio entre crescimento e proteção.'
        : 'Busca crescimento mais rápido com maior exposição.';

  const handleSaveBankroll = async () => {
    const amount = parseFloat(bankrollInput.replace(',', '.'));
    if (isNaN(amount) || amount < 0) {
      toast.error('Insira um valor válido');
      return;
    }
    try {
      await updateBankroll.mutateAsync(amount);
      setEditingBankroll(false);
      toast.success('Banca configurada com sucesso!');
    } catch {
      toast.error('Erro ao salvar banca');
    }
  };

  if (isNewUser) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 w-full max-w-md text-center space-y-6 border-primary/30"
        >
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
            <Wallet className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Bem-vindo ao Profeta!</h1>
            <p className="text-sm text-muted-foreground">Para começar a analisar e lucrar, defina o valor total da sua banca atual.</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-primary">R$</span>
              <input
                type="number"
                value={bankrollInput}
                onChange={e => setBankrollInput(e.target.value)}
                placeholder="Ex: 500,00"
                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-xl font-black text-white focus:border-primary outline-none transition-all"
              />
            </div>
            <button
              onClick={handleSaveBankroll}
              disabled={updateBankroll.isPending || !bankrollInput}
              className="w-full py-4 rounded-xl bg-primary text-black font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updateBankroll.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Confirmar Banca Inicial
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-left">
              <ShieldCheck className="w-4 h-4 text-oracle-win mb-1" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Segurança</p>
              <p className="text-[11px] text-white font-medium">Gestão de banca automática</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-left">
              <TrendingUp className="w-4 h-4 text-primary mb-1" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Lucratividade</p>
              <p className="text-[11px] text-white font-medium">Foco em valor esperado (EV)</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black gold-gradient-text uppercase tracking-tighter">Gestão de Banca</h1>
        <p className="text-xs text-muted-foreground">Controle financeiro e saúde da sua conta</p>
      </header>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-6 border border-primary/20">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Saldo Disponível</span>
            {editingBankroll ? (
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold">R$</span>
                <input
                  type="number"
                  value={bankrollInput}
                  onChange={e => setBankrollInput(e.target.value)}
                  className="bg-secondary border border-border rounded-lg px-3 py-2 text-foreground text-lg w-32 focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSaveBankroll()}
                />
                <button onClick={handleSaveBankroll} className="p-2 bg-primary rounded text-primary-foreground">
                  <Check className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="font-black text-4xl text-primary">R$ {bankrollAmount.toFixed(2)}</span>
                <button
                  onClick={() => { setEditingBankroll(true); setBankrollInput(String(bankrollAmount)); }}
                  className="p-1.5 bg-secondary rounded-full text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Status</p>
            <p className="text-sm font-black text-primary">ATIVO</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4 text-center border border-border/50">
          <p className="font-black text-2xl text-white">{bets.length}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Apostas</p>
        </div>
        <div className="glass-card p-4 text-center border border-border/50">
          <p className="font-black text-2xl text-primary">{pending.length}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Pendentes</p>
        </div>
        <div className="glass-card p-4 text-center border border-border/50">
          <p className="font-black text-2xl text-oracle-win">{wins.length}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Greens</p>
        </div>
        <div className="glass-card p-4 text-center border border-border/50">
          <p className="font-black text-2xl text-destructive">{bets.filter(b => b.status === 'lost').length}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Reds</p>
        </div>
      </div>

      <div className="glass-card p-5 space-y-4 border border-border/50">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Visão de risco</span>
            <p className="text-sm text-foreground">Quanto posso perder e porcentagem de risco</p>
          </div>
          <ShieldCheck className="w-5 h-5 text-[#C9A84C]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl bg-secondary/40 border border-border p-4 text-center">
            <Target className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Stake segura</p>
            <p className="font-black text-xl text-white">R$ {safeStake.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">{safePct}% da banca</p>
          </div>
          <div className="rounded-xl bg-secondary/40 border border-border p-4 text-center">
            <TrendingUp className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Risco máximo</p>
            <p className="font-black text-xl text-white">R$ {maxStake.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">{maxPct}% da banca</p>
          </div>
          <div className="rounded-xl bg-secondary/40 border border-border p-4 text-center">
            <DollarSign className="w-5 h-5 text-destructive mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Stop semanal</p>
            <p className="font-black text-xl text-white">R$ {weeklyStop.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">{weeklyStopPct}% da banca</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Percentual de risco por operação</p>
              <p className="text-sm font-semibold text-foreground">
                {riskPerOpPct.toFixed(1)}% atual{lastBet ? ' (última aposta)' : ''} · {safePct}% recomendado · {maxPct}% máximo
              </p>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[11px] font-bold uppercase tracking-wider">
              Perfil {riskProfileLabel}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/60 bg-background/30 p-3">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Configuração recomendada</p>
              <p className="text-sm text-foreground">Stake segura {safePct}%, risco máximo {maxPct}% e stop semanal {weeklyStopPct}%.</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/30 p-3">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Classificação de perfil</p>
              <p className="text-sm text-foreground">{riskProfileLabel} — {riskProfileDescription}</p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate('/historico')}
        className="w-full py-4 rounded-xl bg-secondary/50 border border-border text-foreground font-bold text-sm flex items-center justify-between px-6 hover:bg-secondary transition-all"
      >
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-[#C9A84C]" />
          <span>VER HISTÓRICO COMPLETO</span>
        </div>
        <ArrowRight className="w-5 h-5 text-muted-foreground" />
      </button>
    </div>
  );
}
