import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiFixture } from '@/types/fixture';
import { MatchAnalysis, PredictionResult } from '@/types/prediction';
import { fetchMatchContext } from '@/services/footballApi';
import { VerdictCard } from '@/components/oracle/VerdictCard';
import { CircularGauge } from '@/components/oracle/CircularGauge';
import { AnalysisBreakdown } from '@/components/oracle/AnalysisBreakdown';
import { BettingInsight } from '@/components/oracle/BettingInsight';
import { H2HHistory } from '@/components/oracle/H2HHistory';
import { LoadingState } from '@/components/oracle/LoadingState';
import { H2HFixture } from '@/types/fixture';
import { motion } from 'framer-motion';
import { ArrowLeft, Zap } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { usePredictionHistory } from '@/hooks/usePredictionHistory';

function generateMockPrediction(homeTeam: string, awayTeam: string): PredictionResult {
  const homeWin = Math.floor(Math.random() * 40) + 20;
  const draw = Math.floor(Math.random() * 25) + 10;
  const awayWin = 100 - homeWin - draw;

  const maxVal = Math.max(homeWin, draw, awayWin);
  const prediction = maxVal === homeWin ? 'HOME_WIN' as const :
    maxVal === draw ? 'DRAW' as const : 'AWAY_WIN' as const;

  const confidences = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'] as const;
  const risks = ['LOW', 'MEDIUM', 'HIGH'] as const;

  return {
    homeWinPercent: homeWin,
    drawPercent: draw,
    awayWinPercent: awayWin,
    prediction,
    confidence: confidences[Math.floor(Math.random() * 4)],
    reasoning: `Baseado na análise histórica, ${homeTeam} possui vantagem de mandante significativa contra ${awayTeam}. A forma recente e estatísticas de confronto direto indicam uma tendência clara nesta partida.`,
    keyFactors: [
      'Forma recente do mandante',
      'Histórico de confrontos',
      'Jogadores lesionados',
      'Desempenho em casa/fora',
      'Motivação competitiva',
    ].slice(0, Math.floor(Math.random() * 3) + 3),
    riskLevel: risks[Math.floor(Math.random() * 3)],
    suggestedBet: `Vitória do ${prediction === 'HOME_WIN' ? homeTeam : prediction === 'AWAY_WIN' ? awayTeam : 'Empate'} com handicap`,
    oddsTrend: 'Odds estáveis com leve tendência de queda para o favorito',
  };
}

export default function MatchDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [fixture, setFixture] = useState<ApiFixture | null>(null);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [h2h, setH2h] = useState<H2HFixture[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { addPrediction } = usePredictionHistory();

  useEffect(() => {
    const stored = sessionStorage.getItem('selected-fixture');
    if (stored) {
      setFixture(JSON.parse(stored));
    } else {
      navigate('/');
    }
  }, [id, navigate]);

  const handleAnalyze = async () => {
    if (!fixture) return;
    setIsAnalyzing(true);

    try {
      // Fetch context data in parallel
      const context = await fetchMatchContext(fixture);
      setH2h(context.h2h);

      // For now, mock prediction (will be replaced with Lovable Cloud edge function)
      await new Promise((r) => setTimeout(r, 2000));
      const result = generateMockPrediction(
        fixture.teams.home.name,
        fixture.teams.away.name
      );

      const matchAnalysis: MatchAnalysis = {
        id: crypto.randomUUID(),
        homeTeam: fixture.teams.home.name,
        awayTeam: fixture.teams.away.name,
        homeTeamLogo: fixture.teams.home.logo,
        awayTeamLogo: fixture.teams.away.logo,
        sport: 'football',
        league: fixture.league.name,
        date: fixture.fixture.date,
        result,
        timestamp: Date.now(),
        fixtureId: fixture.fixture.id,
      };

      setAnalysis(matchAnalysis);
      addPrediction(matchAnalysis);
      toast.success('Análise concluída!');
    } catch (err) {
      toast.error('Erro ao analisar. Tente novamente.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!fixture) return null;

  const matchDate = parseISO(fixture.fixture.date);

  return (
    <div className="min-h-screen bg-oracle-bg">
      <div className="max-w-4xl mx-auto p-3 md:p-6 space-y-4">
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-body text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar aos jogos
        </motion.button>

        {/* Match Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 md:p-8"
        >
          <div className="flex items-center justify-center gap-4 md:gap-8 mb-4">
            <div className="flex flex-col items-center gap-2 min-w-0">
              <img
                src={fixture.teams.home.logo}
                alt={fixture.teams.home.name}
                className="w-16 h-16 md:w-20 md:h-20 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
              />
              <span className="text-sm font-body text-foreground text-center truncate max-w-[120px]">
                {fixture.teams.home.name}
              </span>
            </div>

            <span className="font-display text-3xl md:text-4xl text-muted-foreground">VS</span>

            <div className="flex flex-col items-center gap-2 min-w-0">
              <img
                src={fixture.teams.away.logo}
                alt={fixture.teams.away.name}
                className="w-16 h-16 md:w-20 md:h-20 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
              />
              <span className="text-sm font-body text-foreground text-center truncate max-w-[120px]">
                {fixture.teams.away.name}
              </span>
            </div>
          </div>

          <div className="text-center space-y-1">
            <p className="text-xs font-body text-muted-foreground">
              {fixture.league.name} • {fixture.league.round?.replace('Regular Season - ', 'Rodada ')}
            </p>
            <p className="text-xs font-body text-muted-foreground capitalize">
              {format(matchDate, "EEEE, dd 'de' MMMM '•' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </motion.div>

        {/* Analyze button */}
        {!analysis && !isAnalyzing && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAnalyze}
            className="w-full py-4 rounded-xl font-display text-xl tracking-widest bg-primary text-primary-foreground animate-pulse-neon flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5" />
            ANALISAR PARTIDA
          </motion.button>
        )}

        {/* Loading */}
        {isAnalyzing && <LoadingState />}

        {/* Results */}
        {analysis && (
          <div className="space-y-4">
            <VerdictCard
              result={analysis.result}
              homeTeam={analysis.homeTeam}
              awayTeam={analysis.awayTeam}
            />

            {/* Circular Gauges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-5"
            >
              <h3 className="font-display text-lg tracking-wider text-foreground mb-4">PROBABILIDADES</h3>
              <div className="flex items-center justify-around">
                <CircularGauge
                  label={analysis.homeTeam}
                  value={analysis.result.homeWinPercent}
                  color="hsl(var(--oracle-win))"
                  delay={0.4}
                />
                <CircularGauge
                  label="Empate"
                  value={analysis.result.drawPercent}
                  color="hsl(var(--oracle-draw))"
                  delay={0.6}
                />
                <CircularGauge
                  label={analysis.awayTeam}
                  value={analysis.result.awayWinPercent}
                  color="hsl(var(--oracle-loss))"
                  delay={0.8}
                />
              </div>
            </motion.div>

            <AnalysisBreakdown result={analysis.result} />
            <BettingInsight result={analysis.result} />
            <H2HHistory h2h={h2h} homeTeamId={fixture.teams.home.id} />

            {/* Analyze again */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              onClick={handleAnalyze}
              className="w-full py-3 rounded-xl font-display text-sm tracking-widest bg-secondary text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              ANALISAR NOVAMENTE
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
