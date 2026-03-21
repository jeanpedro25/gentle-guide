import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, DollarSign, TrendingUp, TrendingDown, Target, BarChart3,
  Edit2, Check, Trophy, XCircle, Clock, Shield, AlertTriangle, Plus, Loader2, Zap, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBankroll, useUpdateBankroll } from '@/hooks/usePredictions';
import { useBets, useResolveBet, BetRow } from '@/hooks/useBets';
import { fetchTodayMatches } from '@/services/footballApi';
import { ApiFixture } from '@/types/fixture';
import profetaLogo from '@/assets/profeta-bet-logo.png';
import { toast } from 'sonner';

function scoreToResult(score: string): '1' | 'X' | '2' | null {
  const m = score.match(/(\d+)\s*[x×\-:]\s*(\d+)/i);
  if (!m) return null;
  const h = parseInt(m[1]), a = parseInt(m[2]);
  if (h > a) return '1';
  if (h < a) return '2';
  return 'X';
}

export default function BankrollPage() {
  const navigate = useNavigate();
  const { data: bankroll } = useBankroll();
  const updateBankroll = useUpdateBankroll();
  const { data: bets = [], refetch: refetchBets } = useBets();
  const resolveBet = useResolveBet();

  const [editingBankroll, setEditingBankroll] = useState(false);
  const [bankrollInput, setBankrollInput] = useState('');
  const [resolving, setResolving] = useState(false);

  const bankrollAmount = bankroll?.amount ?? 100;
  const initialBankroll = 100;

  const resolved = bets.filter(b => b.status !== 'pending');
  const wins = resolved.filter(b => b.status === 'won');
  const pending = bets.filter(b => b.status === 'pending');
  
  const healthPct = Math.min(100, Math.max(0, (bankrollAmount / Math.max(initialBankroll, 1)) * 100));
  const healthLabel = healthPct >= 70 ? 'SAUDÁVEL' : healthPct >= 40 ? 'ATENÇÃO' : 'CRÍTICO';
  const healthBarColor = healthPct >= 70 ? 'bg-primary' : healthPct >= 40 ? 'bg-yellow-500' : 'bg-destructive';
  const healthTextColor = healthPct >= 70 ? 'text-primary' : healthPct >= 40 ? 'text-yellow-500' : 'text-destructive';

  const handleSaveBankroll = async () => {
    const amount = parseFloat(bankrollInput);
    if (isNaN(amount) || amount < 0) return;
    await updateBankroll.mutateAsync(amount);
    setEditingBankroll(false);
  };

  const autoResolve = useCallback(async () => {
    if (pending.length === 0) return;
    setResolving(true);
    try {
      const allMatches = await fetchTodayMatches().catch(() => [] as ApiFixture[]);
      const finished = allMatches.filter(m => ['FT', 'AET', 'PEN'].includes(m.fixture.status.short));

      let bankrollDelta = 0;

      for (const bet of pending) {
        const match = finished.find(m => m.fixture.id === bet.fixture_id) || 
                      finished.find(m => {
                        const hNorm = m.teams.home.name.toLowerCase();
                        const aNorm = m.teams.away.name.toLowerCase();
                        const bH = bet.home_team.toLowerCase();
                        const bA = bet.away_team.toLowerCase();
                        return (hNorm.includes(bH) || bH.includes(hNorm)) && (aNorm.includes(bA) || bA.includes(aNorm));
                      });

        if (!match || match.goals.home === null || match.goals.away === null) continue;

        const actualScore = `${match.goals.home} x ${match.goals.away}`;
        const actualResult = scoreToResult(actualScore);
        if (!actualResult) continue;

        const won = bet.prediction === actualResult;
        const pl = won ? bet.potential_profit : -bet.stake;
        bankrollDelta += pl;

        await resolveBet.mutateAsync({
          id: bet.id,
          status: won ? 'won' : 'lost',
          actual_result: actualResult,
          actual_score: actualScore,
          profit_loss: pl,
        });
      }

      if (bankrollDelta !== 0) {
        await updateBankroll.mutateAsync(bankrollAmount + bankrollDelta);
        toast.success(`Banca atualizada! ${bankrollDelta >= 0 ? '+' : ''}R$ ${bankrollDelta.toFixed(2)}`);
      }
      refetchBets();
    } catch (err) {
      console.error('Auto-resolve error:', err);
    } finally {
      setResolving(false);
    }
  }, [pending, bankrollAmount, resolveBet, updateBankroll, refetchBets]);

  useEffect(() => {
    if (pending.length > 0) {
      autoResolve();
    }
  }, [bets.length]);

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
            <p className={`text-sm font-black ${healthTextColor}`}>{healthLabel}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-muted-foreground font-bold uppercase">Saúde da Banca</span>
            <span className={`text-[10px] font-black ${healthTextColor}`}>{healthPct.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-3 overflow-hidden border border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(healthPct, 100)}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={`h-full rounded-full ${healthBarColor} shadow-[0_0_10px_rgba(201,168,76,0.3)]`}
            />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Apostas" value={bets.length} color="text-foreground" />
        <StatCard label="Pendentes" value={pending.length} color="text-primary" />
        <StatCard label="Greens" value={wins.length} color="text-oracle-win" />
        <StatCard label="Reds" value={bets.filter(b => b.status === 'lost').length} color="text-destructive" />
      </div>

      {pending.length > 0 && (
        <button
          onClick={autoResolve}
          disabled={resolving}
          className="w-full py-4 rounded-xl border border-primary/30 bg-primary/5 text-primary font-black text-sm flex items-center justify-center gap-3 hover:bg-primary/10 transition-all disabled:opacity-50 shadow-lg"
        >
          {resolving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Target className="w-5 h-5" />}
          {resolving ? 'VERIFICANDO RESULTADOS...' : `SINCRONIZAR RESULTADOS (${pending.length})`}
        </button>
      )}

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

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass-card p-4 text-center border border-border/50">
      <p className={`font-black text-2xl ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{label}</p>
    </div>
  );
}