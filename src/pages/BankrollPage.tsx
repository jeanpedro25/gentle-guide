import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, DollarSign, TrendingUp, TrendingDown, Target, BarChart3,
  Edit2, Check, Trophy, XCircle, Clock, Shield, AlertTriangle, Plus, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBankroll, useUpdateBankroll } from '@/hooks/usePredictions';
import { useBets, useCreateBet, useResolveBet, BetRow } from '@/hooks/useBets';
import { BottomNav } from '@/components/oracle/BottomNav';
import { fetchMatchesByDate } from '@/services/footballApi';
import { ApiFixture } from '@/types/fixture';
import profetaLogo from '@/assets/profeta-bet-logo.png';

// Determine 1X2 result from a score string "H x A"
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
  const createBet = useCreateBet();
  const resolveBet = useResolveBet();

  const [editingBankroll, setEditingBankroll] = useState(false);
  const [bankrollInput, setBankrollInput] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Form state
  const [formHome, setFormHome] = useState('');
  const [formAway, setFormAway] = useState('');
  const [formPrediction, setFormPrediction] = useState<'1' | 'X' | '2'>('1');
  const [formStake, setFormStake] = useState('');
  const [formOdd, setFormOdd] = useState('1.50');

  const bankrollAmount = bankroll?.amount ?? 100;
  const initialBankroll = 100; // reference for health

  // Computed metrics
  const resolved = bets.filter(b => b.status !== 'pending');
  const wins = resolved.filter(b => b.status === 'won');
  const losses = resolved.filter(b => b.status === 'lost');
  const pending = bets.filter(b => b.status === 'pending');
  const totalProfitLoss = resolved.reduce((s, b) => s + (b.profit_loss ?? 0), 0);
  const hitRate = resolved.length > 0 ? (wins.length / resolved.length) * 100 : 0;

  // Health bar based on bankroll vs initial
  const healthPct = Math.min(100, Math.max(0, (bankrollAmount / Math.max(initialBankroll, 1)) * 100));
  const healthLabel = healthPct >= 70 ? 'SAUDÁVEL' : healthPct >= 40 ? 'ATENÇÃO' : 'CRÍTICO';
  const healthBarColor = healthPct >= 70 ? 'bg-primary' : healthPct >= 40 ? 'bg-yellow-500' : 'bg-destructive';
  const healthTextColor = healthPct >= 70 ? 'text-primary' : healthPct >= 40 ? 'text-yellow-500' : 'text-destructive';

  const potentialProfit = parseFloat(formStake || '0') * (parseFloat(formOdd || '1') - 1);
  const stakeNum = parseFloat(formStake || '0');
  const stakeExceedsBankroll = stakeNum > bankrollAmount;

  // Save bankroll
  const handleSaveBankroll = async () => {
    const amount = parseFloat(bankrollInput);
    if (isNaN(amount) || amount < 0) return;
    await updateBankroll.mutateAsync(amount);
    setEditingBankroll(false);
  };

  // Register bet
  const handleCreateBet = async () => {
    if (!formHome.trim() || !formAway.trim() || stakeNum <= 0) return;
    if (stakeExceedsBankroll) return;
    await createBet.mutateAsync({
      home_team: formHome.trim(),
      away_team: formAway.trim(),
      league: '',
      fixture_id: null as any,
      prediction: formPrediction,
      stake: stakeNum,
      potential_profit: potentialProfit,
      odd: parseFloat(formOdd || '1.5'),
    });
    setFormHome('');
    setFormAway('');
    setFormStake('');
    setFormOdd('1.50');
    setShowForm(false);
  };

  // Auto-resolve pending bets by checking finished matches
  const autoResolve = useCallback(async () => {
    if (pending.length === 0) return;
    setResolving(true);
    try {
      // Fetch today's and yesterday's finished matches
      const [todayMatches, yesterdayMatches] = await Promise.all([
        fetchMatchesByDate(0).catch(() => [] as ApiFixture[]),
        fetchMatchesByDate(-1).catch(() => [] as ApiFixture[]),
      ]);
      const allMatches = [...(todayMatches || []), ...(yesterdayMatches || [])];
      const finished = allMatches.filter(m => m.fixture.status.short === 'FT' || m.fixture.status.short === 'AET' || m.fixture.status.short === 'PEN');

      let bankrollDelta = 0;

      for (const bet of pending) {
        // Try to find a matching finished game
        const match = finished.find(m => {
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
      }
      refetchBets();
    } catch (err) {
      console.error('Auto-resolve error:', err);
    } finally {
      setResolving(false);
    }
  }, [pending, bankrollAmount]);

  // Auto-resolve on mount
  useEffect(() => {
    if (pending.length > 0) {
      autoResolve();
    }
  }, [bets.length]); // only when bets load

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 bg-background/80 backdrop-blur-lg border-b border-border flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <img src={profetaLogo} alt="Profeta" className="w-7 h-7" />
        <h1 className="text-lg font-extrabold tracking-tight gold-gradient-text">💰 GESTÃO DE BANCA</h1>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        {/* Bankroll Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Minha Banca</span>
            {editingBankroll ? (
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold">R$</span>
                <input
                  type="number"
                  value={bankrollInput}
                  onChange={e => setBankrollInput(e.target.value)}
                  className="bg-secondary border border-border rounded-lg px-2 py-1 text-foreground text-sm w-28 focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSaveBankroll()}
                />
                <button onClick={handleSaveBankroll} className="p-1 bg-primary rounded text-primary-foreground">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl text-primary">R$ {bankrollAmount.toFixed(2)}</span>
                <button
                  onClick={() => { setEditingBankroll(true); setBankrollInput(String(bankrollAmount)); }}
                  className="p-1 bg-secondary rounded text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Health Bar */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-muted-foreground">Saúde da Banca</span>
              <span className={`text-[10px] font-bold ${healthTextColor}`}>{healthLabel} ({healthPct.toFixed(0)}%)</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(healthPct, 100)}%` }}
                transition={{ duration: 1 }}
                className={`h-full rounded-full ${healthBarColor}`}
              />
            </div>
          </div>

          {/* Alerts */}
          <AnimatePresence>
            {healthPct < 40 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/10"
              >
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-destructive">🚨 BANCA CRÍTICA!</p>
                  <p className="text-[10px] text-muted-foreground">Pause as apostas e reavalie sua estratégia. Risco de quebra iminente.</p>
                </div>
              </motion.div>
            )}
            {healthPct >= 40 && healthPct < 70 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10"
              >
                <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-yellow-500">⚠️ ATENÇÃO</p>
                  <p className="text-[10px] text-muted-foreground">Banca em zona de atenção. Reduza os stakes e seja conservador.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Apostas" value={bets.length} color="text-foreground" />
          <StatCard label="Pendente" value={pending.length} color="text-primary" icon={<Clock className="w-3 h-3" />} />
          <StatCard label="Green ✅" value={wins.length} color="text-primary" />
          <StatCard label="Red ❌" value={losses.length} color="text-destructive" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Taxa Acerto" value={`${hitRate.toFixed(0)}%`} color={hitRate >= 50 ? 'text-primary' : 'text-destructive'} />
          <StatCard label="Lucro/Prejuízo" value={`${totalProfitLoss >= 0 ? '+' : ''}R$ ${totalProfitLoss.toFixed(2)}`} color={totalProfitLoss >= 0 ? 'text-primary' : 'text-destructive'} />
          <StatCard label="ROI" value={`${bankrollAmount > 0 ? ((totalProfitLoss / bankrollAmount) * 100).toFixed(1) : '0'}%`} color={totalProfitLoss >= 0 ? 'text-primary' : 'text-destructive'} />
        </div>

        {/* Register Bet */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="font-extrabold text-sm tracking-wider text-foreground uppercase">Registrar Aposta</h2>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="p-2 bg-primary rounded-lg text-primary-foreground">
              <Plus className={`w-4 h-4 transition-transform ${showForm ? 'rotate-45' : ''}`} />
            </button>
          </div>

          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-semibold">Time Casa</label>
                    <input value={formHome} onChange={e => setFormHome(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: Flamengo" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-semibold">Time Fora</label>
                    <input value={formAway} onChange={e => setFormAway(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: Palmeiras" />
                  </div>
                </div>

                {/* Prediction 1X2 */}
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase font-semibold">Sua Previsão (1X2)</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {(['1', 'X', '2'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setFormPrediction(p)}
                        className={`py-2.5 rounded-lg border text-sm font-bold transition-all ${
                          formPrediction === p
                            ? 'border-primary bg-primary/20 text-primary'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {p === '1' ? '1 Casa' : p === 'X' ? 'X Empate' : '2 Fora'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-semibold">Valor Apostado (R$)</label>
                    <input type="number" value={formStake} onChange={e => setFormStake(e.target.value)}
                      className={`w-full bg-secondary border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 ${
                        stakeExceedsBankroll ? 'border-destructive focus:ring-destructive' : 'border-border focus:ring-primary'
                      }`} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-semibold">Odd</label>
                    <input type="number" step="0.01" value={formOdd} onChange={e => setFormOdd(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>

                {stakeNum > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <span className="text-xs text-muted-foreground">Lucro possível:</span>
                    <span className="text-sm font-bold text-primary">+R$ {potentialProfit.toFixed(2)}</span>
                  </div>
                )}

                {stakeExceedsBankroll && (
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-[10px] text-destructive font-semibold">
                      🚫 Valor maior que sua banca! Não é possível registrar.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleCreateBet}
                  disabled={!formHome.trim() || !formAway.trim() || stakeNum <= 0 || stakeExceedsBankroll || createBet.isPending}
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 transition-all hover:brightness-110"
                >
                  {createBet.isPending ? 'Registrando...' : '✅ REGISTRAR APOSTA'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Auto-resolve button */}
        {pending.length > 0 && (
          <button
            onClick={autoResolve}
            disabled={resolving}
            className="w-full py-3 rounded-lg border border-primary/30 bg-primary/5 text-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/10 transition-all disabled:opacity-50"
          >
            {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            {resolving ? 'Verificando resultados...' : `🔄 Verificar Resultados (${pending.length} pendentes)`}
          </button>
        )}

        {/* History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-5">
          <h2 className="font-extrabold text-sm tracking-wider text-foreground uppercase mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            HISTÓRICO DE APOSTAS
          </h2>

          {bets.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Nenhuma aposta registrada. Use o botão + acima para começar.
            </p>
          ) : (
            <div className="space-y-2">
              {bets.map((bet, i) => (
                <BetHistoryRow key={bet.id} bet={bet} index={i} />
              ))}
            </div>
          )}
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon?: React.ReactNode }) {
  return (
    <div className="glass-card p-3 text-center">
      <p className={`font-extrabold text-lg ${color} flex items-center justify-center gap-1`}>{icon}{value}</p>
      <p className="text-[9px] text-muted-foreground font-semibold uppercase">{label}</p>
    </div>
  );
}

function BetHistoryRow({ bet, index }: { bet: BetRow; index: number }) {
  const predLabel = bet.prediction === '1' ? 'Casa' : bet.prediction === 'X' ? 'Empate' : 'Fora';
  const statusConfig = {
    pending: { icon: <Clock className="w-3.5 h-3.5" />, text: 'PENDENTE', color: 'text-muted-foreground', bg: 'bg-secondary', border: 'border-border' },
    won: { icon: <Trophy className="w-3.5 h-3.5" />, text: 'GREEN ✅', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' },
    lost: { icon: <XCircle className="w-3.5 h-3.5" />, text: 'RED ❌', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
  }[bet.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className={`p-3 rounded-lg border ${statusConfig.border} ${statusConfig.bg} space-y-2`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">{bet.home_team} vs {bet.away_team}</p>
          <p className="text-[10px] text-muted-foreground">{new Date(bet.created_at).toLocaleDateString('pt-BR')} • Odd {bet.odd}</p>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusConfig.color} ${statusConfig.bg} border ${statusConfig.border}`}>
          {statusConfig.icon} {statusConfig.text}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-[9px] text-muted-foreground">Previsão</p>
          <p className="text-xs font-bold text-primary">{bet.prediction} ({predLabel})</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground">Stake</p>
          <p className="text-xs font-bold text-foreground">R$ {bet.stake.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground">Resultado</p>
          <p className="text-xs font-bold text-foreground">{bet.actual_score ?? '—'}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground">Lucro/Perda</p>
          <p className={`text-xs font-bold ${bet.profit_loss >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {bet.status === 'pending' ? '—' : `${bet.profit_loss >= 0 ? '+' : ''}R$ ${bet.profit_loss.toFixed(2)}`}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
