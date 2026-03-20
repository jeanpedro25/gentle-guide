import { motion } from 'framer-motion';
import { EVBadge } from './EVBadge';
import { ApiFixture, LEAGUES } from '@/types/fixture';
import { useTeamLogos } from '@/hooks/useTeamLogos';
import { isValid, parseISO } from 'date-fns';
import { Plus, Check, Star, Zap, RefreshCw } from 'lucide-react';
import { useMultipla } from '@/contexts/MultiplaContext';
import { useState, useMemo, useEffect } from 'react';
import { getRelativeDayLabel, getStatusDisplay, formatBrazilTime } from '@/services/footballApi';
import { OracleAnalysis, normalizeProbabilities } from '@/types/prediction';
import { analyzeMatch } from '@/services/oracleService';
import { fetchMatchContext } from '@/services/footballApi';
import { useSavePrediction, usePredictionByFixture, useBankroll, useUpdatePredictionStatus } from '@/hooks/usePredictions';
import { useLiveAdvisor } from '@/hooks/useLiveAdvisor';
import { AnalyzeModal } from './AnalyzeModal';
import { LiveReanalysisModal } from './LiveReanalysisModal';
import { BetInputWidget } from './BetInputWidget';
import { CashoutAlert } from './CashoutAlert';
import { MatchHeatBadge } from './MatchHeatBadge';
import { calculateVerdict, getCashoutAlert } from '@/lib/matchVerdict';
import { toast } from 'sonner';
import { useLeagueFilter } from '@/contexts/LeagueFilterContext';

const LEAGUE_ID_TO_ISPORTS = new Map(LEAGUES.map(l => [l.id, l.iSportsId]));

interface MatchCardProps {
  fixture: ApiFixture;
  onClick: () => void;
  index: number;
  bestValue?: boolean;
}

const DEFAULT_ODDS = { home: 2.05, draw: 3.25, away: 3.50 };
const LIVE_STATUSES = new Set(['1H', '2H', 'HT', 'LIVE', 'PEN']);

export function MatchCard({ fixture, onClick, index, bestValue }: MatchCardProps) {
  const { getTeamLogoLive } = useTeamLogos();
  const parsedDate = parseISO(fixture.fixture.date);
  const fallbackDate = new Date(fixture.fixture.timestamp * 1000);
  const matchDate = isValid(parsedDate) ? parsedDate : fallbackDate;
  const hasValidDate = isValid(matchDate);

  const dateStr = fixture.fixture.date.slice(0, 10);
  const timeStr = fixture.fixture.date.slice(11, 19);
  const formattedDate = hasValidDate ? formatBrazilTime(dateStr, timeStr) : 'Data a confirmar';
  const dayLabel = hasValidDate ? getRelativeDayLabel(fixture.fixture.date) : null;

  const statusShort = fixture.fixture.status.short;
  const statusDisplay = getStatusDisplay(statusShort);
  const isLive = LIVE_STATUSES.has(statusShort);

  const { isSelected, getSelection, toggleSelection, maxReached } = useMultipla();
  const [showPicks, setShowPicks] = useState(false);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [oracleResult, setOracleResult] = useState<OracleAnalysis | null>(null);

  const { data: existingPrediction } = usePredictionByFixture(fixture.fixture.id);
  const savePrediction = useSavePrediction();
  const updateStatus = useUpdatePredictionStatus();
  const { data: bankroll } = useBankroll();
  const { advice, loading: advisorLoading, getAdvice } = useLiveAdvisor();

  const selected = isSelected(fixture.fixture.id);
  const currentSelection = getSelection(fixture.fixture.id);
  const matchAdvice = advice[String(fixture.fixture.id)];
  const bankrollAmount = bankroll?.amount ?? 200;
  const { isLeagueAllowed, registerDynamicLeague } = useLeagueFilter();

  useEffect(() => {
    registerDynamicLeague({
      id: String(fixture.league.id),
      apiId: fixture.league.id,
      nome: fixture.league.name,
      bandeira: '🏟️',
    });
  }, [fixture.league.id, fixture.league.name, registerDynamicLeague]);

  // Match heat badge for live games
  const verdict = useMemo(() => {
    if (!isLive) return null;
    return calculateVerdict({
      homePossession: 50, // Would come from live stats API
      awayPossession: 50,
      minute: 0,
      homeScore: fixture.goals.home ?? 0,
      awayScore: fixture.goals.away ?? 0,
    });
  }, [isLive, fixture]);

  // Cashout alert
  const cashoutAlert = useMemo(() => {
    if (!isLive || !existingPrediction) return { type: null as null, message: '' };
    const betTeam = existingPrediction.predicted_winner === fixture.teams.home.name ? 'HOME' as const : 'AWAY' as const;
    return getCashoutAlert({
      minute: 0,
      userBetTeam: betTeam,
      homeScore: fixture.goals.home ?? 0,
      awayScore: fixture.goals.away ?? 0,
    });
  }, [isLive, existingPrediction, fixture]);

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPicks(!showPicks);
  };

  const handlePick = (e: React.MouseEvent, pick: 'home' | 'draw' | 'away') => {
    e.stopPropagation();
    const odd = pick === 'home' ? DEFAULT_ODDS.home : pick === 'draw' ? DEFAULT_ODDS.draw : DEFAULT_ODDS.away;
    toggleSelection(fixture, pick, odd);
    setShowPicks(false);
  };

  const handleAnalyze = async (e: React.MouseEvent) => {
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
        predicted_winner: result.probabilities.homeWin > result.probabilities.awayWin ? fixture.teams.home.name : fixture.teams.away.name,
        confidence: Math.round(result.primaryBet.ev > 15 ? 95 : result.primaryBet.ev > 8 ? 75 : result.primaryBet.ev > 3 ? 55 : 30),
        recommended_market: result.primaryBet.market,
        min_odd: null,
        stake_pct: kellyPct,
        justification: result.primaryBet.reasoning,
        status: 'pending',
        oracle_data: result as unknown as Record<string, unknown>,
      });

      toast.success('Análise salva!');
    } catch (err) {
      console.error('[MatchCard] Analysis error:', err);
      toast.error(err instanceof Error ? err.message : 'Erro na análise');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLiveReanalyze = async (e: React.MouseEvent) => {
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
      userBet: existingPrediction?.recommended_market,
      context: existingPrediction ? `Previsão inicial: ${existingPrediction.predicted_score} com ${existingPrediction.confidence}% confiança` : undefined,
    });

    if (existingPrediction) {
      await updateStatus.mutateAsync({ id: existingPrediction.id, status: 'live_reviewed' });
    }
  };

  if (!isLeagueAllowed(fixture.league.name, fixture.league.id)) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        className={`w-full bg-card border border-border rounded-lg p-4 transition-all group relative ${
          selected ? 'border-primary/50 ring-1 ring-primary/20' : 'hover:border-primary/30'
        }`}
      >
        {/* Add to Múltipla button */}
        <button
          onClick={handleAddClick}
          className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all z-10 ${
            selected
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-primary hover:text-primary-foreground'
          } ${!selected && maxReached ? 'opacity-30 cursor-not-allowed' : ''}`}
          disabled={!selected && maxReached}
        >
          {selected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </button>

        {/* Pick selector dropdown */}
        {showPicks && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-11 right-3 bg-card border border-border rounded-lg shadow-xl z-20 overflow-hidden"
          >
            {[
              { pick: 'home' as const, label: fixture.teams.home.name, odd: DEFAULT_ODDS.home },
              { pick: 'draw' as const, label: 'Empate', odd: DEFAULT_ODDS.draw },
              { pick: 'away' as const, label: fixture.teams.away.name, odd: DEFAULT_ODDS.away },
            ].map(({ pick, label, odd }) => (
              <button
                key={pick}
                onClick={(e) => handlePick(e, pick)}
                className={`w-full px-4 py-2 text-left text-xs font-body flex justify-between items-center gap-4 hover:bg-secondary/50 transition-colors ${
                  currentSelection?.pick === pick ? 'bg-primary/10 text-primary' : 'text-foreground'
                }`}
              >
                <span className="truncate">{label}</span>
                <span className="text-primary font-semibold shrink-0">@{odd.toFixed(2)}</span>
              </button>
            ))}
          </motion.div>
        )}

        {/* Main clickable area */}
        <button onClick={onClick} className="w-full text-left">
          {/* League + badges */}
          <div className="flex items-center justify-between mb-4 pr-8">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground">{fixture.league.name}</span>
              {bestValue && (
                <span className="bg-primary/10 text-primary text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 animate-pulse">
                  💰 PAGANDO MAIS
                </span>
              )}
              {!isLive && <EVBadge fixtureId={fixture.fixture.id} />}
              {/* Dynamic heat badge */}
              {isLive && verdict && (
                <MatchHeatBadge {...verdict} />
              )}
            </div>
          </div>

          {/* Favorite next goal indicator */}
          {isLive && verdict?.favoriteNextGoal && (
            <div className="mb-2 text-[10px] font-bold text-primary flex items-center gap-1">
              <span>⚡</span>
              <span>
                {verdict.favoriteNextGoal === 'HOME' ? fixture.teams.home.name : fixture.teams.away.name} favorito ao próximo gol
              </span>
            </div>
          )}

          {/* Teams - centered layout */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center gap-2 w-1/3">
              <img
                src={getTeamLogoLive(fixture.teams.home.name, fixture.teams.home.logo)}
                alt={fixture.teams.home.name}
                className="w-10 h-10 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
              />
              <span className="text-xs font-semibold text-foreground text-center leading-tight">{fixture.teams.home.name}</span>
            </div>

            <div className="flex flex-col items-center">
              {statusShort === 'FT' || isLive ? (
                <>
                  <span className="text-2xl font-black text-foreground">
                    {fixture.goals.home ?? 0} - {fixture.goals.away ?? 0}
                  </span>
                  {isLive && (
                    <span className="text-[10px] font-bold text-destructive mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                      {statusDisplay.label}
                    </span>
                  )}
                  {statusShort === 'FT' && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded mt-1">FINAL</span>
                  )}
                </>
              ) : statusShort === 'NS' ? (
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-muted-foreground">{formattedDate}</span>
                  {dayLabel && <span className="text-[10px] text-muted-foreground">{dayLabel}</span>}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">{statusDisplay.label}</span>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 w-1/3">
              <img
                src={getTeamLogoLive(fixture.teams.away.name, fixture.teams.away.logo)}
                alt={fixture.teams.away.name}
                className="w-10 h-10 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
              />
              <span className="text-xs font-semibold text-foreground text-center leading-tight">{fixture.teams.away.name}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {isLive ? (
              <button
                onClick={handleLiveReanalyze}
                className="flex items-center gap-1 px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-[11px] font-bold hover:bg-destructive/20 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Re-analisar ao vivo
              </button>
            ) : (
              <button
                onClick={handleAnalyze}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-[11px] font-bold hover:bg-primary/20 transition-colors"
              >
                <Star className="w-3 h-3" />
                Analisar
              </button>
            )}
          </div>
        </button>

        {/* Cashout alert for live matches */}
        {isLive && cashoutAlert.type && (
          <CashoutAlert type={cashoutAlert.type} message={cashoutAlert.message} />
        )}
      </motion.div>

      {/* Modals */}
      <AnalyzeModal
        open={showAnalyzeModal}
        onClose={() => setShowAnalyzeModal(false)}
        fixture={fixture}
        analysis={oracleResult}
        isAnalyzing={isAnalyzing}
        bankrollAmount={bankrollAmount}
      />

      <LiveReanalysisModal
        open={showLiveModal}
        onClose={() => setShowLiveModal(false)}
        fixture={fixture}
        advice={matchAdvice}
        loading={advisorLoading}
      />
    </>
  );
}