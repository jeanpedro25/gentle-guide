import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Loader2,
  Target,
  Trophy,
  X,
  Zap,
  Calculator,
  BrainCircuit
} from 'lucide-react';
import { toast } from 'sonner';
import { useCreateBet } from '@/hooks/useBets';
import { useBankroll } from '@/hooks/usePredictions';
import { AnaliseJogo } from '@/lib/jogueAgora';
import { ApiFixture } from '@/types/fixture';
import { analyzeMatch as analyzeWithAI } from '@/services/oracleService';
import { fetchMatchContext } from '@/services/footballApi';
import { OracleAnalysis, probAsPercent } from '@/types/prediction';

interface Props {
  fixture: ApiFixture | null;
  analysis: AnaliseJogo | null;
  analyzing: boolean;
  onClose: () => void;
}

function ProbabilityBar({ label, value }: { label: string; value: number }) {
  const pct = value * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AnalysisPanel({ fixture, analysis, onClose }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const [betAmount, setBetAmount] = useState('');
  const [totalReturnInput, setTotalReturnInput] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<OracleAnalysis | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  
  const createBet = useCreateBet();
  const { data: bankroll } = useBankroll();

  useEffect(() => {
    setAiAnalysis(null);
    setBetAmount('');
    setTotalReturnInput('');
  }, [fixture?.fixture.id]);

  const bankrollAmount = bankroll?.amount ?? 100;
  const betValue = Number.parseFloat(betAmount.replace(',', '.')) || 0;
  const totalReturnValue = Number.parseFloat(totalReturnInput.replace(',', '.')) || 0;
  const potentialProfit = totalReturnValue > betValue ? totalReturnValue - betValue : 0;
  const calculatedOdd = betValue > 0 ? totalReturnValue / betValue : 0;
  const exceedsBankroll = betValue > bankrollAmount;

  const handleDeepAnalysis = async () => {
    if (!fixture) return;
    setIsAiAnalyzing(true);
    try {
      const context = await fetchMatchContext(fixture);
      const result = await analyzeWithAI(fixture, context.homeStats, context.awayStats, context.h2h);
      setAiAnalysis(result);
      toast.success('Análise profunda concluída!');
    } catch (err) {
      toast.error('Erro na análise profunda. Tente novamente.');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleConfirmBet = async () => {
    if (!analysis || betValue <= 0 || totalReturnValue <= 0 || exceedsBankroll) return;
    try {
      await createBet.mutateAsync({
        home_team: analysis.fixture.teams.home.name,
        away_team: analysis.fixture.teams.away.name,
        league: analysis.fixture.league.name,
        fixture_id: analysis.fixture.fixture.id,
        prediction: analysis.melhor_resultado,
        stake: betValue,
        potential_profit: potentialProfit,
        odd: calculatedOdd,
      });
      toast.success('Aposta registrada!');
      onClose();
    } catch {
      toast.error('Erro ao registrar aposta.');
    }
  };

  return (
    <AnimatePresence>
      {fixture && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[60] bg-black/50" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed bottom-0 left-0 right-0 z-[60] max-h-[95vh] overflow-y-auto rounded-t-2xl border-t-2 border-primary/30 bg-background shadow-2xl">
            <div className="space-y-4 p-5 pb-28">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">ANÁLISE RÁPIDA</span>
                </div>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>

              <div className="space-y-1 rounded-lg border border-border bg-card p-4">
                <p className="text-[10px] text-muted-foreground">{fixture.league.name}</p>
                <p className="text-base font-extrabold text-foreground">{fixture.teams.home.name} vs {fixture.teams.away.name}</p>
              </div>

              {/* Botão de Análise Profunda */}
              {!aiAnalysis && (
                <button
                  onClick={handleDeepAnalysis}
                  disabled={isAiAnalyzing}
                  className="w-full py-4 rounded-xl bg-primary/10 border border-primary/30 text-primary font-black text-sm flex items-center justify-center gap-3 hover:bg-primary/20 transition-all disabled:opacity-50"
                >
                  {isAiAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                  {isAiAnalyzing ? 'PROFETA PENSANDO...' : 'SOLICITAR ANÁLISE PROFUNDA (IA)'}
                </button>
              )}

              {aiAnalysis && (
                <div className="rounded-xl border border-oracle-win/40 bg-oracle-win/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-oracle-win">
                    <Zap className="w-4 h-4 fill-current" />
                    <span className="text-xs font-black uppercase">Veredito da IA</span>
                  </div>
                  <p className="text-2xl font-black text-white tracking-tighter">{aiAnalysis.verdict} - {aiAnalysis.primaryBet.market}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{aiAnalysis.primaryBet.reasoning}</p>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="bg-black/20 p-2 rounded-lg">
                      <p className="text-[8px] text-muted-foreground uppercase">Confiança</p>
                      <p className="text-sm font-bold text-primary">GRAU {aiAnalysis.primaryBet.confidence}</p>
                    </div>
                    <div className="bg-black/20 p-2 rounded-lg">
                      <p className="text-[8px] text-muted-foreground uppercase">Valor (EV)</p>
                      <p className="text-sm font-bold text-oracle-win">+{aiAnalysis.primaryBet.ev.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bloco de Aposta */}
              <div className="space-y-4 rounded-2xl border border-primary/20 bg-card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <p className="text-sm font-extrabold uppercase text-foreground">Sua Aposta</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Aposta (R$)</label>
                    <input type="text" inputMode="decimal" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} placeholder="0,00" className="h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm font-bold text-foreground outline-none focus:border-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Retorno (R$)</label>
                    <input type="text" inputMode="decimal" value={totalReturnInput} onChange={(e) => setTotalReturnInput(e.target.value)} placeholder="0,00" className="h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm font-bold text-primary outline-none focus:border-primary/50" />
                  </div>
                </div>
                {betValue > 0 && totalReturnValue > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-white/5 p-3">
                    <span className="text-xs text-muted-foreground">Lucro Líquido:</span>
                    <span className="text-sm font-black text-oracle-win">+ R$ {potentialProfit.toFixed(2)}</span>
                  </div>
                )}
                <button onClick={handleConfirmBet} disabled={betValue <= 0 || totalReturnValue <= 0 || exceedsBankroll || createBet.isPending} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-black text-sm font-extrabold uppercase hover:brightness-110 disabled:opacity-50">
                  {createBet.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-current" />}
                  Confirmar Aposta
                </button>
              </div>

              <button onClick={() => setShowDetails(!showDetails)} className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm font-bold text-foreground">
                <span>Ver probabilidades rápidas</span>
                {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              <AnimatePresence>
                {showDetails && analysis && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden">
                    <ProbabilityBar label="Casa" value={analysis.prob_casa} />
                    <ProbabilityBar label="Empate" value={analysis.prob_empate} />
                    <ProbabilityBar label="Fora" value={analysis.prob_fora} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}