import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, DollarSign, TrendingUp, TrendingDown, Target, BarChart3,
  Edit2, Check, Trophy, XCircle, Clock, Shield, AlertTriangle, Plus, Loader2, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBankroll, useUpdateBankroll } from '@/hooks/usePredictions';
import { useBets, useCreateBet, useResolveBet, BetRow } from '@/hooks/useBets';
import { BottomNav } from '@/components/oracle/BottomNav';
import { fetchTodayMatches } from '@/services/footballApi';
import { ApiFixture } from '@/types/fixture';
import { AnalyzeModal } from '@/components/oracle/AnalyzeModal';
import { analyzeMatch } from '@/services/oracleService';
import { OracleAnalysis } from '@/types/prediction';
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
  
  // Modal de Análise
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [selectedBetForAnalysis, setSelectedBetForAnalysis] = useState<BetRow | null>(null);
  const [oracleResult, setOracleResult] = useState<OracleAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const bankrollAmount = bankroll?.amount ?? 100;
  const initialBankroll = 100;

  const resolved = bets.filter(b => b.status !== 'pending');
  const wins = resolved.filter(b => b.status === 'won');
  const losses = resolved.filter(b => b.status === 'lost');
  const pending = bets.filter(b => b.status === 'pending');
  const totalProfitLoss = resolved.reduce((s, b) => s + (b.profit_loss ?? 0), 0);
  const hitRate = resolved.length > 0 ? (wins.length / resolved.length) * 100 : 0;

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

  const handleOpenAnalysis = async (bet: BetRow) => {
    if (!bet.fixture_id) {
      toast.error('Esta aposta manual não possui dados de análise.');
      return;
    }
    
    setSelectedBetForAnalysis(bet);
    setShowAnalyzeModal(true);
    setIsAnalyzing(true);
    setOracleResult(null);

    try {
      // Simulando a busca do fixture para análise
      const matches = await fetchTodayMatches();
      const fixture = matches.find(m => m.fixture.id === bet.fixture_id);
      
      if (fixture) {
        const result = await analyzeMatch(fixture, null, null, []);
        setOracleResult(result);
      } else {
        toast.error('Dados do jogo não encontrados para análise.');
        setShowAnalyzeModal(false);
      }
    } catch (err) {
      console.error('Erro ao carregar análise:', err);
      toast.error('Erro ao carregar análise.');
    } finally {
      setIsAnalyzing(false);
    }
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
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 px-4 py-4 bg-background/80 backdrop-blur-lg border-b border-border flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <img src={profetaLogo} alt="Profeta" className="w-7 h-7" />
        <h1 className="text-lg font-extrabold tracking-tight gold-gradient-text">💰 GESTÃO DE BANCA</h1>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
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
        </motion.div>

        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Apostas" value={bets.length} color="text-foreground" />
          <StatCard label="Pendente" value={pending.length} color="text-primary" icon={<Clock className="w-3 h-3" />} />
          <StatCard label="Green ✅" value={wins.length} color="text-primary" />
          <StatCard label="Red ❌" value={losses.length} color="text-destructive" />
        </div>

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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-5">
          <h2 className="font-extrabold text-sm tracking-wider text-foreground uppercase mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            HISTÓRICO DE APOSTAS
          </h2>

          {bets.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Nenhuma aposta registrada.
            </p>
          ) : (
            <div className="space-y-2">
              {bets.map((bet, i) => (
                <button 
                  key={bet.id} 
                  onClick={() => handleOpenAnalysis(bet)}
                  className="w-full text-left transition-transform active:scale-[0.98]"
                >
                  <BetHistoryRow bet={bet} index={i} />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      <AnalyzeModal
        isOpen={showAnalyzeModal}
        onClose={() => setShowAnalyzeModal(false)}
        oracle={oracleResult}
        homeTeam={selectedBetForAnalysis?.home_team ?? ''}
        awayTeam={selectedBetForAnalysis?.away_team ?? ''}
        isLoading={isAnalyzing}
        bankrollAmount={bankrollAmount}
      />

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
      className={`p-3 rounded-lg border ${statusConfig.border} ${statusConfig.bg} space-y-2 hover:border-primary/40 transition-colors`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">{bet.home_team} vs {bet.away_team}</p>
          <p className="text-[10px] text-muted-foreground">{new Date(bet.created_at).toLocaleDateString('pt-BR')} • Clique para ver análise</p>
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
          <p className="text-[9px] text-muted-foreground">Aposta</p>
          <p className="text-xs font-bold text-foreground">R$ {bet.stake.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground">Resultado</p>
          <p className="text-xs font-bold text-foreground">{bet.actual_score ?? '—'}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground">Lucro Real</p>
          <p className={`text-xs font-bold ${bet.profit_loss >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {bet.status === 'pending' ? '—' : `${bet.profit_loss >= 0 ? '+' : ''}R$ ${bet.profit_loss.toFixed(2)}`}
          </p>
        </div>
      </div>
    </motion.div>
  );
}