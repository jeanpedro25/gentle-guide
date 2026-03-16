import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiFixture } from '@/types/fixture';
import { getTeamLogo } from '@/services/teamLogos';
import { MatchAnalysis, OracleAnalysis, oracleToLegacy, normalizeProbabilities } from '@/types/prediction';
import { fetchMatchContext } from '@/services/footballApi';
import { analyzeMatch } from '@/services/oracleService';
import { AnalysisSummary } from '@/components/oracle/AnalysisSummary';
import { VerdictCard } from '@/components/oracle/VerdictCard';
import { CircularGauge } from '@/components/oracle/CircularGauge';
import { ConfidenceGradeCard } from '@/components/oracle/ConfidenceGradeCard';
import { EVDisplay } from '@/components/oracle/EVDisplay';
import { PoissonSection } from '@/components/oracle/PoissonSection';
import { PoissonHeatmap } from '@/components/oracle/PoissonHeatmap';
import { MarketComparisonCard } from '@/components/oracle/MarketComparisonCard';
import { AnalysisBreakdown } from '@/components/oracle/AnalysisBreakdown';
import { BettingInsight } from '@/components/oracle/BettingInsight';
import { RedFlagsCard } from '@/components/oracle/RedFlagsCard';
import { BankrollCalculator } from '@/components/oracle/BankrollCalculator';
import { H2HHistory } from '@/components/oracle/H2HHistory';
import { PlayerLineup } from '@/components/oracle/PlayerLineup';
import { FormationPitch } from '@/components/oracle/FormationPitch';
import { GoalkeeperDuelCard } from '@/components/oracle/GoalkeeperDuelCard';
import { PlayerMatchups } from '@/components/oracle/PlayerMatchups';
import { LoadingState } from '@/components/oracle/LoadingState';
import { H2HFixture } from '@/types/fixture';
import { motion } from 'framer-motion';
import { ArrowLeft, Zap } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { usePredictionHistory } from '@/hooks/usePredictionHistory';
import profetaLogo from '@/assets/profeta-bet-logo.png';

export default function MatchDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [fixture, setFixture] = useState<ApiFixture | null>(null);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [oracle, setOracle] = useState<OracleAnalysis | null>(null);
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
    setOracle(null);
    setAnalysis(null);

    try {
      const context = await fetchMatchContext(fixture);
      setH2h(context.h2h);

      const oracleResult = await analyzeMatch(
        fixture,
        context.homeStats,
        context.awayStats,
        context.h2h
      );

      setOracle(oracleResult);

      const legacyResult = oracleToLegacy(
        oracleResult,
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
        result: legacyResult,
        oracle: oracleResult,
        timestamp: Date.now(),
        fixtureId: fixture.fixture.id,
      };

      setAnalysis(matchAnalysis);
      addPrediction(matchAnalysis);
      toast.success('Análise quantitativa concluída!');
    } catch (err) {
      console.error('[Oracle] Analysis error:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao analisar. Tente novamente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!fixture) return null;

  const matchDate = parseISO(fixture.fixture.date);

  // Safely get normalized percentages for gauges
  const getGaugeValue = (prob: number) => {
    const val = prob > 1 ? prob : prob * 100;
    return Math.min(100, Math.max(0, Math.round(val)));
  };

  return (
    <div className="min-h-screen bg-background">
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
          <div className="flex items-center justify-center gap-1 mb-4">
            <img src={profetaLogo} alt="Profeta Bet" className="w-6 h-6" />
            <span className="font-display text-sm tracking-wider text-muted-foreground">PROFETA BET</span>
          </div>
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
              <span className="text-[10px] font-display tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                🏠 CASA
              </span>
            </div>

            {oracle?.predictedScore ? (
              <div className="flex flex-col items-center shrink-0">
                <div className="flex items-center gap-1">
                  <span className="font-display text-5xl md:text-6xl text-oracle-win">{oracle.predictedScore.home}</span>
                  <span className="font-display text-3xl md:text-4xl text-muted-foreground">×</span>
                  <span className="font-display text-5xl md:text-6xl text-oracle-win">{oracle.predictedScore.away}</span>
                </div>
                <span className="text-[10px] font-body text-muted-foreground uppercase tracking-wider mt-1">Placar mais provável</span>
              </div>
            ) : (
              <span className="font-display text-3xl md:text-4xl text-muted-foreground">VS</span>
            )}

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
              <span className="text-[10px] font-display tracking-wider px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                ✈️ VISITANTE
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
        {analysis && oracle && (
          <div className="space-y-4">
            {/* 0. Complete Analysis Summary - TOP */}
            <AnalysisSummary
              oracle={oracle}
              homeTeam={analysis.homeTeam}
              awayTeam={analysis.awayTeam}
            />

            {/* 1. Verdict */}
            <VerdictCard
              result={analysis.result}
              oracle={oracle}
              homeTeam={analysis.homeTeam}
              awayTeam={analysis.awayTeam}
            />

            {/* 2. Confidence Grade */}
            <ConfidenceGradeCard oracle={oracle} />

            {/* 3. Circular Gauges - with normalization */}
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
                  value={getGaugeValue(oracle.probabilities.homeWin)}
                  color="hsl(var(--oracle-win))"
                  delay={0.4}
                />
                <CircularGauge
                  label="Empate"
                  value={getGaugeValue(oracle.probabilities.draw)}
                  color="hsl(var(--oracle-draw))"
                  delay={0.6}
                />
                <CircularGauge
                  label={analysis.awayTeam}
                  value={getGaugeValue(oracle.probabilities.awayWin)}
                  color="hsl(var(--oracle-loss))"
                  delay={0.8}
                />
              </div>
            </motion.div>

            {/* 4. EV + Kelly */}
            <EVDisplay oracle={oracle} />

            {/* 5. Poisson xG + Predicted Score + Top Scores */}
            <PoissonSection oracle={oracle} homeTeam={analysis.homeTeam} awayTeam={analysis.awayTeam} />

            {/* 6. Poisson Heatmap Matrix 7x7 */}
            <PoissonHeatmap
              oracle={oracle}
              homeTeam={analysis.homeTeam}
              awayTeam={analysis.awayTeam}
            />

            {/* 7. Formation Pitch */}
            <FormationPitch
              oracle={oracle}
              homeTeam={analysis.homeTeam}
              awayTeam={analysis.awayTeam}
            />

            {/* 8. Player Lineup */}
            <PlayerLineup
              oracle={oracle}
              homeTeam={analysis.homeTeam}
              awayTeam={analysis.awayTeam}
            />

            {/* 9. Goalkeeper Duel */}
            <GoalkeeperDuelCard
              oracle={oracle}
              homeTeam={analysis.homeTeam}
              awayTeam={analysis.awayTeam}
            />

            {/* 10. Key Player Matchups */}
            <PlayerMatchups
              oracle={oracle}
              homeTeam={analysis.homeTeam}
              awayTeam={analysis.awayTeam}
            />

            {/* 11. Market Comparison */}
            <MarketComparisonCard oracle={oracle} />

            {/* 12. Tactical Analysis */}
            <AnalysisBreakdown result={analysis.result} oracle={oracle} />

            {/* 13. Betting Insight */}
            <BettingInsight result={analysis.result} oracle={oracle} />

            {/* 14. Red Flags */}
            {oracle.redFlags.length > 0 && <RedFlagsCard redFlags={oracle.redFlags} />}

            {/* 15. H2H History */}
            <H2HHistory h2h={h2h} homeTeamId={fixture.teams.home.id} />

            {/* 16. Bankroll Calculator */}
            <BankrollCalculator oracle={oracle} />

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
