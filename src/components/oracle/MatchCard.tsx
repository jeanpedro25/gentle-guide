import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { Check, Plus, RefreshCw, Star, Zap } from 'lucide-react';
import { isValid, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { EVBadge } from './EVBadge';
import { AnalyzeModal } from './AnalyzeModal';
import { BetInputWidget } from './BetInputWidget';
import { CashoutAlert } from './CashoutAlert';
import { LiveReanalysisModal } from './LiveReanalysisModal';
import { MatchHeatBadge } from './MatchHeatBadge';
import { useLeagueFilter } from '@/contexts/LeagueFilterContext';
import { useMultipla } from '@/contexts/MultiplaContext';
import { useLiveAdvisor } from '@/hooks/useLiveAdvisor';
import { useTeamLogos } from '@/hooks/useTeamLogos';
import { calculateVerdict, getCashoutAlert } from '@/lib/matchVerdict';
import { fetchMatchContext, getRelativeDayLabel, getStatusDisplay } from '@/services/footballApi';
import { analyzeMatch } from '@/services/oracleService';
import { ApiFixture } from '@/types/fixture';
import { OracleAnalysis, normalizeProbabilities } from '@/types/prediction';
import { useBankroll, usePredictionByFixture, useSavePrediction, useUpdatePredictionStatus } from '@/hooks/usePredictions';

interface MatchCardProps {
  fixture: ApiFixture;
  onClick: () => void;
  index: number;
  bestValue?: boolean;
}

const DEFAULT_ODDS = { home: 2.05, draw: 3.25, away: 3.5 };
const LIVE_STATUSES = new Set(['1H', '2H', 'HT', 'LIVE', 'PEN']);

export function MatchCard({ fixture, onClick, index, bestValue }: MatchCardProps) {
  const { getTeamLogoLive } = useTeamLogos();
  const { isSelected, getSelection, toggleSelection, maxReached } = useMultipla();
  const { isLeagueAllowed, registerDynamicLeague } = useLeagueFilter();
  const { data: bankroll } = useBankroll();
  const { data: existingPrediction } = usePredictionByFixture(fixture.fixture.id);
  const savePrediction = useSavePrediction();
  const updateStatus = useUpdatePredictionStatus();
  const { advice, loading: advisorLoading, getAdvice } = useLiveAdvisor();

  const [showPicks, setShowPicks] = useState(false);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [oracleResult, setOracleResult] = useState<OracleAnalysis | null>(null);

  const parsedDate = parseISO(fixture.fixture.date);
  const fallbackDate = new Date(fixture.fixture.timestamp * 1000);
  const matchDate = isValid(parsedDate) ? parsedDate : fallbackDate;
  const hasValidDate = isValid(matchDate);
  const formattedDate = hasValidDate
    ? matchDate.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Manaus',
      })
    : 'Data a confirmar';
  const dayLabel = hasValidDate ? getRelativeDayLabel(fixture.fixture.date) : null;
  const statusShort = fixture.fixture.status.short;
  const statusDisplay = getStatusDisplay(statusShort);
  const isLive = LIVE_STATUSES.has(statusShort);
  const bankrollAmount = bankroll?.amount ?? 200;
  const selected = isSelected(fixture.fixture.id);
  const currentSelection = getSelection(fixture.fixture.id);
  const matchAdvice = advice[String(fixture.fixture.id)] ?? null;
  const isAdvisorLoading = advisorLoading[String(fixture.fixture.id)] ?? false;

  useEffect(() => {
    registerDynamicLeague({
      id: String(fixture.league.id),
      apiId: fixture.league.id,
      nome: fixture.league.name,
      bandeira: 'BR',
    });
  }, [fixture.league.id, fixture.league.name, registerDynamicLeague]);

  const verdict = useMemo(() => {
    if (!isLive) return null;

    return calculateVerdict({
      homePossession: 50,
      awayPossession: 50,
      minute: 0,
      homeScore: fixture.goals.home ?? 0,
      awayScore: fixture.goals.away ?? 0,
    });
  }, [fixture.goals.away, fixture.goals.home, isLive]);

  const cashoutAlert = useMemo(() => {
    if (!isLive || !existingPrediction?.predicted_winner) {
      return { type: null as null, message: '' };
    }

    const betTeam = existingPrediction.predicted_winner === fixture.teams.home.name ? 'HOME' as const : 'AWAY' as const;

    return getCashoutAlert({
      minute: 0,
      userBetTeam: betTeam,
      homeScore: fixture.goals.home ?? 0,
      awayScore: fixture.goals.away ?? 0,
    });
  }, [existingPrediction?.predicted_winner, fixture.goals.away, fixture.goals.home, fixture.teams.home.name, isLive]);

  if (!isLeagueAllowed(fixture.league.name, fixture.league.id)) {
    return null;
  }

  const handleAddClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setShowPicks((prev) => !prev);
  };

  const handlePick = (e: MouseEvent<HTMLButtonElement>, pick: 'home' | 'draw' | 'away') => {
    e.stopPropagation();
    const odd = pick === 'home' ? DEFAULT_ODDS.home : pick === 'draw' ? DEFAULT_ODDS.draw : DEFAULT_ODDS.away;
    toggleSelection(fixture, pick, odd);
    setShowPicks(false);
  };

  const handleAnalyze = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setShowAnalyzeModal(true);
    setIsAnalyzing(true);
    setOracleResult(null);

    try {
      const context = await fetchMatchContext(fixture);
      const result = await analyzeMatch(fixture, context.homeStats, context.awayStats, context.h2h);
      result.probabilities = normalizeProbabilities(result.probabilities);
      setOracleResult(result);

      const kellyPct = Math.min(result.primaryBet.kellyFraction * 100, 10);
      await savePrediction.mutateAsync({
        fixture_id: fixture.fixture.id,
        home_team: fixture.teams.home.name,
        away_team: fixture.teams.away.name,
        league: fixture.league.name,
        predicted_score: result.predictedScore ? `${result.predictedScore.home}x${result.predictedScore.away}` : null,
        predicted_winner:
          result.probabilities.homeWin > result.probabilities.awayWin ? fixture.teams.home.name : fixture.teams.away.name,
        confidence: Math.round(result.primaryBet.ev > 15 ? 95 : result.primaryBet.ev > 8 ? 75 : result.primaryBet.ev > 3 ? 55 : 30),
        recommended_market: result.primaryBet.market,
        min_odd: null,
        stake_pct: kellyPct,
        justification: result.primaryBet.reasoning,
        status: 'pending',
        oracle_data: result as unknown as Record<string, unknown>,
      });

      toast.success('Analise salva.');
    } catch (err) {
      console.error('[MatchCard] Analysis error:', err);
      toast.error(err instanceof Error ? err.message : 'Erro na analise.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLiveReanalyze = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setShowLiveModal(true);

    const matchId = String(fixture.fixture.id);
    await getAdvice(matchId, {
      homeTeam: fixture.teams.home.name,
      awayTeam: fixture.teams.away.name,
      homeScore: String(fixture.goals.home ?? 0),
      awayScore: String(fixture.goals.away ?? 0),
      league: fixture.league.name,
      status: statusShort,
      userBet: existingPrediction?.recommended_market ?? undefined,
      context: existingPrediction
        ? `Previsao inicial: ${existingPrediction.predicted_score} com ${existingPrediction.confidence}% de confianca`
        : undefined,
    });

    if (existingPrediction) {
      await updateStatus.mutateAsync({ id: existingPrediction.id, status: 'live_reviewed' });
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        className={`group relative w-full rounded-lg border bg-card p-4 transition-all ${
          selected ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border hover:border-primary/30'
        }`}
      >
        <button
          onClick={handleAddClick}
          className={`absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full transition-all ${
            selected
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-primary hover:text-primary-foreground'
          } ${!selected && maxReached ? 'cursor-not-allowed opacity-30' : ''}`}
          disabled={!selected && maxReached}
        >
          {selected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </button>

        {showPicks && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-3 top-11 z-20 overflow-hidden rounded-lg border border-border bg-card shadow-xl"
          >
            {[
              { pick: 'home' as const, label: fixture.teams.home.name, odd: DEFAULT_ODDS.home },
              { pick: 'draw' as const, label: 'Empate', odd: DEFAULT_ODDS.draw },
              { pick: 'away' as const, label: fixture.teams.away.name, odd: DEFAULT_ODDS.away },
            ].map(({ pick, label, odd }) => (
              <button
                key={pick}
                onClick={(e) => handlePick(e, pick)}
                className={`flex w-full items-center justify-between gap-4 px-4 py-2 text-left text-xs transition-colors ${
                  currentSelection?.pick === pick ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary/50'
                }`}
              >
                <span className="truncate">{label}</span>
                <span className="shrink-0 font-semibold text-primary">@{odd.toFixed(2)}</span>
              </button>
            ))}
          </motion.div>
        )}

        <button onClick={onClick} className="w-full text-left">
          <div className="mb-4 flex items-center justify-between pr-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{fixture.league.name}</span>
              {bestValue && (
                <span className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary animate-pulse">
                  <Star className="h-3 w-3" /> Melhor valor
                </span>
              )}
              {!isLive && <EVBadge fixtureId={fixture.fixture.id} />}
              {isLive && verdict && <MatchHeatBadge {...verdict} />}
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isLive ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'}`}>
              {statusDisplay.label}
            </span>
          </div>

          {isLive && verdict?.favoriteNextGoal && (
            <div className="mb-2 flex items-center gap-1 text-[10px] font-bold text-primary">
              <span>Proximo gol:</span>
              <span>{verdict.favoriteNextGoal === 'HOME' ? fixture.teams.home.name : fixture.teams.away.name}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex w-1/3 flex-col items-center gap-2">
              <img
                src={getTeamLogoLive(fixture.teams.home.name, fixture.teams.home.logo)}
                alt={fixture.teams.home.name}
                className="h-10 w-10 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <span className="text-center text-xs font-semibold leading-tight text-foreground">{fixture.teams.home.name}</span>
            </div>

            <div className="flex flex-col items-center gap-1 text-center">
              {statusShort === 'FT' || isLive ? (
                <>
                  <span className="text-2xl font-black text-foreground">
                    {fixture.goals.home ?? 0} - {fixture.goals.away ?? 0}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground">{statusDisplay.label}</span>
                </>
              ) : (
                <>
                  <span className="text-sm font-bold text-foreground">{formattedDate}</span>
                  {dayLabel && <span className="text-[10px] text-muted-foreground">{dayLabel}</span>}
                </>
              )}
            </div>

            <div className="flex w-1/3 flex-col items-center gap-2">
              <img
                src={getTeamLogoLive(fixture.teams.away.name, fixture.teams.away.logo)}
                alt={fixture.teams.away.name}
                className="h-10 w-10 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <span className="text-center text-xs font-semibold leading-tight text-foreground">{fixture.teams.away.name}</span>
            </div>
          </div>
        </button>

        <CashoutAlert type={cashoutAlert.type} message={cashoutAlert.message} />

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-60"
          >
            <Zap className="h-3.5 w-3.5" />
            {isAnalyzing ? 'Analisando...' : 'Analisar'}
          </button>

          {isLive ? (
            <button
              onClick={handleLiveReanalyze}
              disabled={advisorLoading}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${advisorLoading ? 'animate-spin' : ''}`} />
              Reanalise ao vivo
            </button>
          ) : (
            <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-center text-[11px] text-muted-foreground">
              Selecione na multipla para montar a aposta.
            </div>
          )}
        </div>

        <BetInputWidget
          bankrollAmount={bankrollAmount}
          odd={oracleResult?.primaryBet.kellyFraction ? Math.max(1.5, 1 + oracleResult.primaryBet.kellyFraction * 10) : DEFAULT_ODDS.home}
        />
      </motion.div>

      <AnalyzeModal
        isOpen={showAnalyzeModal}
        onClose={() => setShowAnalyzeModal(false)}
        oracle={oracleResult}
        homeTeam={fixture.teams.home.name}
        awayTeam={fixture.teams.away.name}
        isLoading={isAnalyzing}
        bankrollAmount={bankrollAmount}
      />

      <LiveReanalysisModal
        isOpen={showLiveModal}
        onClose={() => setShowLiveModal(false)}
        advice={matchAdvice}
        isLoading={advisorLoading}
        homeTeam={fixture.teams.home.name}
        awayTeam={fixture.teams.away.name}
        score={`${fixture.goals.home ?? 0} x ${fixture.goals.away ?? 0}`}
      />
    </>
  );
}
