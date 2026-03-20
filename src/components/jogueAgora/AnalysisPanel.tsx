import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Loader2, TrendingUp, BarChart3, ChevronDown, ChevronUp, AlertTriangle, Check, DollarSign } from 'lucide-react';
import { ApiFixture } from '@/types/fixture';
import { AnaliseJogo, PICK_LABELS_FULL, PICK_LABELS } from '@/lib/jogueAgora';
import { useCreateBet } from '@/hooks/useBets';
import { useBankroll } from '@/hooks/usePredictions';
import { toast } from 'sonner';

interface Props {
  fixture: ApiFixture | null;
  analysis: AnaliseJogo | null;
  analyzing: boolean;
  onBet: (analise: AnaliseJogo) => void;
  onClose: () => void;
}

function ConfidenceBar({ value }: { value: number }) {
  const filled = Math.round(value / 10);
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-3 rounded-sm ${i < filled ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>
      <span className="text-xs font-bold text-foreground">{value}%</span>
    </div>
  );
}

function ProbabilityBar({ label, value }: { label: string; value: number }) {
  const pct = (value * 100).toFixed(0);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  );
}

export function AnalysisPanel({ fixture, analysis, analyzing, onClose }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const [betAmount, setBetAmount] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const createBet = useCreateBet();
  const { data: bankroll } = useBankroll();

  const bankrollAmount = bankroll?.amount ?? 100;
  const safeBet = bankrollAmount * 0.02;
  const betValue = parseFloat(betAmount) || 0;
  const potentialProfit = analysis ? betValue * (analysis.melhor_odd - 1) : 0;
  const totalReturn = betValue + potentialProfit;
  const isExcessive = betValue > safeBet;
  const isDangerous = betValue > bankrollAmount * 0.05;
  const exceedsBankroll = betValue > bankrollAmount;

  const handleConfirmBet = async () => {
    if (!analysis || betValue <= 0 || exceedsBankroll) return;
    try {
      await createBet.mutateAsync({
        home_team: analysis.fixture.teams.home.name,
        away_team: analysis.fixture.teams.away.name,
        league: analysis.fixture.league.name,
        fixture_id: analysis.fixture.fixture.id,
        prediction: analysis.melhor_resultado,
        stake: betValue,
        potential_profit: potentialProfit,
        odd: analysis.melhor_odd,
      });
      toast.success('‚úÖ Aposta registrada no hist√≥rico! Aguardando resultado do jogo.');
      setBetAmount('');
      setShowConfirm(false);
      onClose();
    } catch {
      toast.error('Erro ao registrar aposta');
    }
  };

  const handleClose = () => {
    setBetAmount('');
    setShowConfirm(false);
    setShowDetails(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {fixture && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[60] bg-black/50"
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-background border-t-2 border-primary/30 rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="p-5 pb-28 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm text-foreground">AN√ÅLISE PROFETA</span>
                </div>
                <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Match info */}
              <div className="bg-card border border-border rounded-lg p-4 space-y-1">
                <p className="text-[10px] text-muted-foreground">{fixture.league.name}</p>
                <p className="text-base font-extrabold text-foreground">{fixture.teams.home.name}</p>
                <p className="text-sm text-muted-foreground">vs {fixture.teams.away.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(fixture.fixture.date).toLocaleString('pt-BR', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Manaus',
                    timeZoneName: 'short',
                  })}
                </p>
              </div>

              {analyzing ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm font-bold text-foreground">Gerando an√°lise...</p>
                  <p className="text-[10px] text-muted-foreground">Calculando Poisson, EV e Kelly Criterion</p>
                </div>
              ) : analysis ? (
                <>
                  {/* Prediction badge */}
                  <div className="flex items-center justify-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary/30">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-primary">
                        {PICK_LABELS_FULL[analysis.melhor_resultado]}
                      </span>
                    </div>
                  </div>

                  {/* Predicted score */}
                  <div className="bg-secondary/60 rounded-lg p-4 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Placar Prov√°vel</p>
                    <p className="text-3xl font-black text-foreground tracking-widest">{analysis.placar_provavel}</p>
                    <p className="text-[10px] text-muted-foreground">{analysis.prob_placar.toFixed(1)}% de probabilidade</p>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-card border border-border rounded-lg p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">EV</p>
                      <p className={`text-lg font-bold ${analysis.melhor_ev > 0 ? 'text-primary' : 'text-destructive'}`}>
                        {analysis.melhor_ev > 0 ? '+' : ''}{analysis.melhor_ev.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">Odd</p>
                      <p className="text-lg font-bold text-foreground">{analysis.melhor_odd.toFixed(2)}</p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">Kelly</p>
                      <p className="text-lg font-bold text-foreground">{(analysis.kellyFraction * 100).toFixed(1)}%</p>
                    </div>
                  </div>

                  {/* Confidence */}
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Confian√ßa</p>
                    <ConfidenceBar value={analysis.confianca} />
                  </div>

                  {/* Toggle detailed analysis */}
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50 border border-border text-sm font-bold text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <span>üìä Ver An√°lise Detalhada</span>
                    {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <AnimatePresence>
                    {showDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden space-y-3"
                      >
                        {/* Probability bars */}
                        <div className="space-y-2">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Probabilidades (Poisson)</p>
                          <ProbabilityBar label={`Casa (${fixture.teams.home.name})`} value={analysis.prob_casa} />
                          <ProbabilityBar label="Empate" value={analysis.prob_empate} />
                          <ProbabilityBar label={`Fora (${fixture.teams.away.name})`} value={analysis.prob_fora} />
                        </div>

                        {/* EV breakdown */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'EV Casa', value: analysis.ev_casa },
                            { label: 'EV Empate', value: analysis.ev_empate },
                            { label: 'EV Fora', value: analysis.ev_fora },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-secondary/50 rounded-lg p-2 text-center">
                              <p className="text-[10px] text-muted-foreground">{label}</p>
                              <p className={`text-xs font-bold ${value > 0 ? 'text-primary' : 'text-destructive'}`}>
                                {value > 0 ? '+' : ''}{value.toFixed(1)}%
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Odds comparison */}
                        <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Odds Estimadas</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-[10px] text-muted-foreground">Casa</p>
                              <p className="text-sm font-bold text-foreground">{analysis.odd_casa.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Empate</p>
                              <p className="text-sm font-bold text-foreground">{analysis.odd_empate.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Fora</p>
     