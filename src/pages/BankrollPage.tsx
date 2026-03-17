import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, DollarSign, TrendingUp, Target, BarChart3, Edit2, Check, Trophy, XCircle, Clock, Sparkles, Shield, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePredictions, useBankroll, useUpdateBankroll, useBetResults, PredictionRow, BetResultRow } from '@/hooks/usePredictions';
import profetaLogo from '@/assets/profeta-bet-logo.png';

const RISK_PROFILES = [
  { label: 'Conservador', pct: 1, color: 'text-primary', desc: 'Crescimento lento e seguro' },
  { label: 'Moderado', pct: 2, color: 'text-yellow-500', desc: 'Equilíbrio risco/retorno' },
  { label: 'Agressivo', pct: 3, color: 'text-orange-500', desc: 'Crescimento acelerado' },
  { label: 'Ultra', pct: 5, color: 'text-destructive', desc: '⚠️ Alto risco de quebra' },
];

export default function BankrollPage() {
  const navigate = useNavigate();
  const { data: predictions = [] } = usePredictions();
  const { data: bankroll } = useBankroll();
  const updateBankroll = useUpdateBankroll();
  const { data: betResults = [] } = useBetResults();

  const [editingBankroll, setEditingBankroll] = useState(false);
  const [bankrollInput, setBankrollInput] = useState('');
  const [riskPct, setRiskPct] = useState(2); // editable risk %
  const [dailyLimit, setDailyLimit] = useState(3); // max bets per day
  const [editingDaily, setEditingDaily] = useState(false);
  const [dailyInput, setDailyInput] = useState('3');

  const bankrollAmount = bankroll?.amount ?? 200;

  // Metrics
  const totalPredictions = predictions.length;
  const resolved = betResults.filter(r => r.won !== null);
  const wins = resolved.filter(r => r.won);
  const hitRate = resolved.length > 0 ? (wins.length / resolved.length) * 100 : 0;
  const totalProfitLoss = resolved.reduce((sum, r) => sum + (r.profit_loss ?? 0), 0);
  const roi = bankrollAmount > 0 ? (totalProfitLoss / bankrollAmount) * 100 : 0;

  const resultMap = new Map(betResults.map(r => [r.prediction_id, r]));
  const scoreHits = predictions.filter(p => {
    const result = resultMap.get(p.id);
    if (!result?.actual_score || !p.predicted_score) return false;
    return p.predicted_score.replace(/\s/g, '').toLowerCase() === result.actual_score.replace(/\s/g, '').toLowerCase();
  }).length;

  // Smart management calculations
  const stakeAmount = bankrollAmount * (riskPct / 100);
  const maxDailyExposure = stakeAmount * dailyLimit;
  const maxDailyPct = (maxDailyExposure / bankrollAmount) * 100;
  const daysToDouble = riskPct > 0 ? Math.ceil(100 / riskPct) : 999;
  const sessionsToBreak = riskPct > 0 ? Math.floor(100 / riskPct) : 999;

  // Health score (0-100)
  const healthScore = useMemo(() => {
    let score = 50;
    if (hitRate >= 60) score += 20; else if (hitRate >= 45) score += 10; else if (hitRate < 30 && resolved.length > 3) score -= 15;
    if (roi > 0) score += 15; else if (roi < -10) score -= 15;
    if (riskPct <= 2) score += 10; else if (riskPct >= 5) score -= 10;
    if (bankrollAmount > 500) score += 5;
    return Math.max(0, Math.min(100, score));
  }, [hitRate, roi, riskPct, bankrollAmount, resolved.length]);

  const healthLabel = healthScore >= 70 ? 'SAUDÁVEL' : healthScore >= 40 ? 'ATENÇÃO' : 'PERIGO';
  const healthColor = healthScore >= 70 ? 'text-primary' : healthScore >= 40 ? 'text-yellow-500' : 'text-destructive';

  const handleSaveBankroll = async () => {
    const amount = parseFloat(bankrollInput);
    if (isNaN(amount) || amount < 0) return;
    await updateBankroll.mutateAsync(amount);
    setEditingBankroll(false);
  };

  const handleSaveDaily = () => {
    const val = parseInt(dailyInput);
    if (!isNaN(val) && val >= 1 && val <= 20) setDailyLimit(val);
    setEditingDaily(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-3 md:p-6 space-y-4 pb-24">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-body text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </motion.button>

        {/* Header + Bankroll */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <img src={profetaLogo} alt="Profeta" className="w-8 h-8" />
            <h1 className="font-display text-2xl tracking-wider text-foreground">💰 GESTÃO DE BANCA</h1>
          </div>

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
                  onKeyDown={e => e.key === 'Enter' && handleSaveBankroll()}
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

          {/* Health Score */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Saúde da Banca</span>
                <span className={`text-xs font-bold ${healthColor}`}>{healthLabel} ({healthScore}%)</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${healthScore}%` }}
                  transition={{ duration: 1 }}
                  className={`h-full rounded-full ${healthScore >= 70 ? 'bg-primary' : healthScore >= 40 ? 'bg-yellow-500' : 'bg-destructive'}`}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Risk Config */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg tracking-wider text-foreground">CONFIGURAR RISCO</h2>
          </div>

          {/* Risk % selector */}
          <div>
            <p className="text-xs text-muted-foreground mb-3">Porcentagem por aposta:</p>
            <div className="grid grid-cols-4 gap-2">
              {RISK_PROFILES.map(profile => (
                <button
                  key={profile.pct}
                  onClick={() => setRiskPct(profile.pct)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    riskPct === profile.pct
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  <p className={`text-lg font-bold ${profile.color}`}>{profile.pct}%</p>
                  <p className="text-[10px] text-foreground font-semibold">{profile.label}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{profile.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">Ajuste fino:</span>
              <span className="text-sm font-bold text-primary">{riskPct}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={riskPct}
              onChange={e => setRiskPct(parseFloat(e.target.value))}
              className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
              <span>0.5% (Seguro)</span>
              <span>10% (Perigoso)</span>
            </div>
          </div>

          {/* Daily limit */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
            <div>
              <p className="text-xs font-semibold text-foreground">Limite diário de apostas</p>
              <p className="text-[10px] text-muted-foreground">Quantas entradas por dia</p>
            </div>
            {editingDaily ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={dailyInput}
                  onChange={e => setDailyInput(e.target.value)}
                  className="w-12 text-center bg-secondary border border-border rounded px-1 py-1 text-sm text-foreground focus:outline-none"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSaveDaily()}
                />
                <button onClick={handleSaveDaily} className="p-1 bg-primary rounded text-primary-foreground">
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingDaily(true); setDailyInput(String(dailyLimit)); }}
                className="flex items-center gap-1 text-primary font-bold text-lg"
              >
                {dailyLimit} <Edit2 className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Excessive risk warning */}
          {riskPct >= 5 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-destructive">⚠️ Risco elevado!</p>
                <p className="text-[10px] text-muted-foreground">
                  Com {riskPct}%, você pode perder toda a banca em apenas {sessionsToBreak} derrotas seguidas. 
                  Considere reduzir para 2%.
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Smart Analysis Panel */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg tracking-wider text-foreground">ANÁLISE INTELIGENTE</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="text-[10px] text-muted-foreground">Valor por aposta</p>
              <p className="text-lg font-bold text-primary">R$ {stakeAmount.toFixed(2)}</p>
              <p className="text-[9px] text-muted-foreground">{riskPct}% da banca</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="text-[10px] text-muted-foreground">Exposição diária máx</p>
              <p className="text-lg font-bold text-foreground">R$ {maxDailyExposure.toFixed(2)}</p>
              <p className="text-[9px] text-muted-foreground">{maxDailyPct.toFixed(1)}% da banca ({dailyLimit} apostas)</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="text-[10px] text-muted-foreground">Dias p/ dobrar (60% win)</p>
              <p className="text-lg font-bold text-primary">~{Math.ceil(daysToDouble / 0.6)} dias</p>
              <p className="text-[9px] text-muted-foreground">Com odd média de 2.00</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="text-[10px] text-muted-foreground">Derrotas p/ quebrar</p>
              <p className={`text-lg font-bold ${sessionsToBreak < 20 ? 'text-destructive' : 'text-primary'}`}>{sessionsToBreak} seguidas</p>
              <p className="text-[9px] text-muted-foreground">{sessionsToBreak < 20 ? '⚠️ Cuidado' : '✅ Seguro'}</p>
            </div>
          </div>

          {/* Growth projection */}
          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
            <p className="text-xs font-bold text-primary mb-2">📈 Projeção de Crescimento</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[7, 30, 90].map(days => {
                const dailyGain = stakeAmount * 0.6 * dailyLimit; // 60% win rate avg profit
                const projected = bankrollAmount + (dailyGain * days);
                return (
                  <div key={days}>
                    <p className="text-[10px] text-muted-foreground">{days} dias</p>
                    <p className="text-sm font-bold text-primary">R$ {projected.toFixed(0)}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-muted-foreground mt-2 text-center">
              *Estimativa com 60% de acerto e odd média 2.00
            </p>
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
  const scoreMatch = (() => {
    if (!betResult?.actual_score || !p.predicted_score) return false;
    return p.predicted_score.replace(/\s/g, '').toLowerCase() === betResult.actual_score.replace(/\s/g, '').toLowerCase();
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
      return <span className="text-xs font-display uppercase text-accent">REVISADO</span>;
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
