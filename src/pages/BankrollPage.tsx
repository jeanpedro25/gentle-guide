import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, DollarSign, TrendingUp, Target, BarChart3, Edit2, Check, Trophy, XCircle, Clock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePredictions, useBankroll, useUpdateBankroll, useBetResults, PredictionRow, BetResultRow } from '@/hooks/usePredictions';
import profetaLogo from '@/assets/profeta-bet-logo.png';

export default function BankrollPage() {
  const navigate = useNavigate();
  const { data: predictions = [] } = usePredictions();
  const { data: bankroll } = useBankroll();
  const updateBankroll = useUpdateBankroll();
  const { data: betResults = [] } = useBetResults();

  const [editingBankroll, setEditingBankroll] = useState(false);
  const [bankrollInput, setBankrollInput] = useState('');

  const bankrollAmount = bankroll?.amount ?? 200;

  // Metrics
  const totalPredictions = predictions.length;
  const resolved = betResults.filter(r => r.won !== null);
  const wins = resolved.filter(r => r.won);
  const hitRate = resolved.length > 0 ? (wins.length / resolved.length) * 100 : 0;
  const totalProfitLoss = resolved.reduce((sum, r) => sum + (r.profit_loss ?? 0), 0);
  const roi = bankrollAmount > 0 ? (totalProfitLoss / bankrollAmount) * 100 : 0;

  // Score accuracy: count predictions where predicted_score matches actual_score
  const resultMap = new Map(betResults.map(r => [r.prediction_id, r]));
  const scoreHits = predictions.filter(p => {
    const result = resultMap.get(p.id);
    if (!result?.actual_score || !p.predicted_score) return false;
    const predicted = p.predicted_score.replace(/\s/g, '').toLowerCase();
    const actual = result.actual_score.replace(/\s/g, '').toLowerCase();
    return predicted === actual;
  }).length;

  // Risk indicator
  const riskLevel = bankrollAmount < 50 ? 'CRÍTICO' : bankrollAmount < 100 ? 'ALTO' : bankrollAmount < 300 ? 'MODERADO' : 'SEGURO';
  const riskColor = bankrollAmount < 50 ? 'text-destructive' : bankrollAmount < 100 ? 'text-orange-500' : bankrollAmount < 300 ? 'text-yellow-500' : 'text-primary';
  const riskBg = bankrollAmount < 50 ? 'bg-destructive/10 border-destructive/30' : bankrollAmount < 100 ? 'bg-orange-500/10 border-orange-500/30' : bankrollAmount < 300 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-primary/10 border-primary/30';

  const handleSaveBankroll = async () => {
    const amount = parseFloat(bankrollInput);
    if (isNaN(amount) || amount < 0) return;
    await updateBankroll.mutateAsync(amount);
    setEditingBankroll(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-3 md:p-6 space-y-4">
        {/* Back */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-body text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </motion.button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <img src={profetaLogo} alt="Profeta" className="w-8 h-8" />
            <h1 className="font-display text-2xl tracking-wider text-foreground">💰 GESTÃO DE BANCA</h1>
          </div>

          {/* Bankroll editor */}
          <div className="flex items-center gap-3">
            <span className="font-body text-muted-foreground text-sm">Minha banca:</span>
            {editingBankroll ? (
              <div className="flex items-center gap-2">
                <span className="text-primary font-display text-xl">R$</span>
                <input
                  type="number"
                  value={bankrollInput}
                  onChange={e => setBankrollInput(e.target.value)}
                  className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-foreground font-body text-sm w-32 focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <button onClick={handleSaveBankroll} className="p-1.5 bg-primary rounded-lg text-primary-foreground">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-display text-3xl text-primary">R$ {bankrollAmount.toFixed(2)}</span>
                <button
                  onClick={() => { setEditingBankroll(true); setBankrollInput(String(bankrollAmount)); }}
                  className="p-1.5 bg-secondary rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Risk indicator */}
          <div className={`mt-4 p-3 rounded-lg border ${riskBg} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${riskColor}`}>⚡ RISCO: {riskLevel}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Aposta segura: <span className="text-primary font-bold">R$ {(bankrollAmount * 0.02).toFixed(2)}</span> (2%)
              {' · '}Máx: <span className="font-bold text-foreground">R$ {(bankrollAmount * 0.05).toFixed(2)}</span> (5%)
            </div>
          </div>

          {/* Potential winnings calculator */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[1.5, 2.0, 3.0].map(odd => {
              const stake = bankrollAmount * 0.02;
              const profit = stake * (odd - 1);
              return (
                <div key={odd} className="glass-card p-2 rounded-lg">
                  <p className="text-[10px] text-muted-foreground">Odd {odd.toFixed(2)}</p>
                  <p className="text-sm font-bold text-primary">+R$ {profit.toFixed(2)}</p>
                  <p className="text-[9px] text-muted-foreground">com 2% (R$ {stake.toFixed(2)})</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard icon={<Target className="w-5 h-5" />} label="Previsões" value={String(totalPredictions)} color="text-primary" />
          <MetricCard icon={<BarChart3 className="w-5 h-5" />} label="Taxa Acerto" value={`${hitRate.toFixed(1)}%`} color={hitRate >= 50 ? 'text-primary' : 'text-destructive'} />
          <MetricCard icon={<TrendingUp className="w-5 h-5" />} label="ROI" value={`${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`} color={roi >= 0 ? 'text-primary' : 'text-destructive'} />
          <MetricCard icon={<DollarSign className="w-5 h-5" />} label="Lucro/Prejuízo" value={`R$ ${totalProfitLoss >= 0 ? '+' : ''}${totalProfitLoss.toFixed(2)}`} color={totalProfitLoss >= 0 ? 'text-primary' : 'text-destructive'} />
          <MetricCard icon={<Sparkles className="w-5 h-5" />} label="Placar Exato" value={String(scoreHits)} color="text-primary" />
        </div>

        {/* Predictions History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
          <h2 className="font-display text-lg tracking-wider text-foreground mb-4">HISTÓRICO DE PREVISÕES</h2>
          {predictions.length === 0 ? (
            <p className="text-center font-body text-muted-foreground text-sm py-8">
              Nenhuma previsão ainda. Analise jogos para ver o histórico aqui.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left py-2 px-2">Jogo</th>
                    <th className="text-center py-2 px-2">Previsão</th>
                    <th className="text-center py-2 px-2">Resultado</th>
                    <th className="text-center py-2 px-2">Confiança</th>
                    <th className="text-center py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Mercado</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.slice(0, 30).map(p => (
                    <PredictionHistoryRow key={p.id} prediction={p} betResult={resultMap.get(p.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-xs font-body">{label}</span></div>
      <p className={`font-display text-xl ${color}`}>{value}</p>
    </motion.div>
  );
}

function PredictionHistoryRow({ prediction: p, betResult }: { prediction: PredictionRow; betResult?: BetResultRow }) {
  // Check if score was hit exactly
  const scoreMatch = (() => {
    if (!betResult?.actual_score || !p.predicted_score) return false;
    const predicted = p.predicted_score.replace(/\s/g, '').toLowerCase();
    const actual = betResult.actual_score.replace(/\s/g, '').toLowerCase();
    return predicted === actual;
  })();

  const getStatusDisplay = () => {
    if (scoreMatch) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold border border-primary/30">
          <Trophy className="w-3 h-3" />
          ACERTOU PLACAR!
        </span>
      );
    }
    if (betResult?.won === true) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
          <Check className="w-3 h-3" />
          GREEN
        </span>
      );
    }
    if (betResult?.won === false) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/20 text-destructive text-[10px] font-bold">
          <XCircle className="w-3 h-3" />
          RED
        </span>
      );
    }
    if (p.status === 'live_reviewed') {
      return <span className="text-xs font-display uppercase text-blue-400">REVISADO</span>;
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-display uppercase text-muted-foreground">
        <Clock className="w-3 h-3" />
        PENDENTE
      </span>
    );
  };

  return (
    <tr className={`border-b border-border/30 transition-colors ${scoreMatch ? 'bg-primary/5' : 'hover:bg-secondary/30'}`}>
      <td className="py-2.5 px-2 text-foreground text-xs">{p.home_team} vs {p.away_team}</td>
      <td className="py-2.5 px-2 text-center">
        <span className="text-primary font-bold">{p.predicted_score ?? '-'}</span>
      </td>
      <td className="py-2.5 px-2 text-center">
        <span className={`font-bold ${scoreMatch ? 'text-primary' : 'text-foreground'}`}>
          {betResult?.actual_score ?? '-'}
        </span>
      </td>
      <td className="py-2.5 px-2 text-center">
        <span className={`font-display ${(p.confidence ?? 0) >= 70 ? 'text-primary' : (p.confidence ?? 0) >= 40 ? 'text-yellow-500' : 'text-destructive'}`}>
          {p.confidence ?? 0}%
        </span>
      </td>
      <td className="py-2.5 px-2 text-center">{getStatusDisplay()}</td>
      <td className="py-2.5 px-2 text-muted-foreground text-xs">{p.recommended_market ?? '-'}</td>
    </tr>
  );
}
