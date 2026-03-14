import { motion } from 'framer-motion';
import { OracleAnalysis, normalizeProbabilities, confidenceGradeColors } from '@/types/prediction';
import { Trophy, Target, Shield, Swords, AlertTriangle, TrendingUp } from 'lucide-react';

interface AnalysisSummaryProps {
  oracle: OracleAnalysis;
  homeTeam: string;
  awayTeam: string;
}

export function AnalysisSummary({ oracle, homeTeam, awayTeam }: AnalysisSummaryProps) {
  const probs = normalizeProbabilities(oracle.probabilities);
  const maxP = Math.max(probs.homeWin, probs.draw, probs.awayWin);
  const winner = maxP === probs.homeWin ? homeTeam : maxP === probs.awayWin ? awayTeam : 'Empate';

  const predicted = oracle.predictedScore;
  const scoreStr = predicted ? `${predicted.home} × ${predicted.away}` : '—';

  const gkWinner = oracle.goalkeeperDuel
    ? oracle.goalkeeperDuel.winner === 'HOME' ? homeTeam
    : oracle.goalkeeperDuel.winner === 'AWAY' ? awayTeam : 'Igual'
    : '—';

  const gkName = oracle.goalkeeperDuel
    ? oracle.goalkeeperDuel.winner === 'HOME' ? oracle.goalkeeperDuel.home.name
    : oracle.goalkeeperDuel.winner === 'AWAY' ? oracle.goalkeeperDuel.away.name : 'Equilíbrio'
    : '—';

  const tacticalWinner = oracle.formationAnalysis
    ? oracle.formationAnalysis.tacticalEdge === 'HOME' ? 'Casa'
    : oracle.formationAnalysis.tacticalEdge === 'AWAY' ? 'Visitante' : 'Equilibrado'
    : '—';

  // Count duel advantages
  const homeDuelsWon = oracle.playerDuels?.filter(d => d.advantage === 'HOME').length ?? 0;
  const awayDuelsWon = oracle.playerDuels?.filter(d => d.advantage === 'AWAY').length ?? 0;

  const isApostar = oracle.verdict === 'APOSTAR';

  const confGrade = oracle.primaryBet.confidence;
  const stars = confGrade === 'A+' ? 5 : confGrade === 'A' ? 4 : confGrade === 'B' ? 3 : confGrade === 'C' ? 2 : 1;

  const riskMap: Record<string, string> = {
    'A+': 'MUITO BAIXO', 'A': 'BAIXO', 'B': 'MÉDIO', 'C': 'ALTO', 'D': 'MUITO ALTO'
  };

  const rows = [
    { icon: <Target className="w-4 h-4" />, label: 'PLACAR PROVÁVEL', value: scoreStr, highlight: true },
    { icon: <Trophy className="w-4 h-4" />, label: 'VENCEDOR PROVÁVEL', value: winner },
    { icon: <Shield className="w-4 h-4" />, label: 'CONFIANÇA', value: `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)} GRAU ${confGrade}` },
    { icon: <TrendingUp className="w-4 h-4" />, label: 'EV', value: `${oracle.primaryBet.ev > 0 ? '+' : ''}${oracle.primaryBet.ev.toFixed(1)}%`, color: oracle.primaryBet.ev > 0 ? 'text-oracle-win' : 'text-oracle-loss' },
    { icon: <TrendingUp className="w-4 h-4" />, label: 'APOSTA COM VALOR', value: oracle.primaryBet.market },
    { icon: <Swords className="w-4 h-4" />, label: 'VANTAGEM TÁTICA', value: tacticalWinner },
    { icon: <Shield className="w-4 h-4" />, label: 'MELHOR GOLEIRO', value: gkName !== 'Equilíbrio' ? `${gkName} (${gkWinner})` : 'Equilíbrio' },
    { icon: <Swords className="w-4 h-4" />, label: 'DUELOS VENCIDOS', value: `${homeTeam.split(' ').pop()} ${homeDuelsWon}×${awayDuelsWon} ${awayTeam.split(' ').pop()}` },
    { icon: <AlertTriangle className="w-4 h-4" />, label: 'RISCO', value: riskMap[confGrade] || 'MÉDIO' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-5 space-y-3 ${isApostar ? 'glass-card-win' : 'glass-card-loss'}`}
    >
      <h3 className="font-display text-lg tracking-wider text-foreground flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        RESUMO COMPLETO DA ANÁLISE
      </h3>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className={`flex items-center justify-between py-2 px-3 rounded-lg ${row.highlight ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/30'}`}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              {row.icon}
              <span className="text-xs font-body uppercase tracking-wider">{row.label}</span>
            </div>
            <span className={`text-sm font-display tracking-wider ${row.color || (row.highlight ? 'text-primary' : 'text-foreground')}`}>
              {row.value}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Final decision */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
        className={`text-center py-3 rounded-xl border ${isApostar ? 'bg-oracle-win/10 border-oracle-win/40' : 'bg-oracle-loss/10 border-oracle-loss/40'}`}
      >
        <p className="text-xs font-body text-muted-foreground mb-1">DECISÃO FINAL</p>
        <p className={`font-display text-2xl tracking-widest ${isApostar ? 'text-oracle-win' : 'text-oracle-loss'}`}>
          {oracle.verdict}
        </p>
      </motion.div>
    </motion.div>
  );
}
