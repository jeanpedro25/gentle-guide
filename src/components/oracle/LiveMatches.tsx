import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Zap, Loader2, X, Trophy } from 'lucide-react';
import { preloadTeamLogos } from '@/services/teamLogos';
import { useTeamLogos } from '@/hooks/useTeamLogos';
import { useLiveAdvisor, LiveAdvice } from '@/hooks/useLiveAdvisor';
import { useEffect, useMemo } from 'react';
import { useLeagueFilter } from '@/contexts/LeagueFilterContext';
import { useNavigate } from 'react-router-dom';

export interface LiveMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeBadge: string;
  awayBadge: string;
  homeScore: string | null;
  awayScore: string | null;
  status: string;
  league: string;
  leagueBadge: string;
  time: string;
  venue: string;
}

interface LiveMatchesProps {
  matches: LiveMatch[];
  isLoading: boolean;
}

function statusLabel(status: string): string {
  switch (status) {
    case '1H': return '1º TEMPO';
    case '2H': return '2º TEMPO';
    case 'HT': return 'INTERVALO';
    case 'ET': return 'PRORROGAÇÃO';
    case 'P': return 'PÊNALTIS';
    case 'LIVE': return 'AO VIVO';
    case 'Match Finished': case 'FT': return 'ENCERRADO';
    case 'PST': return 'ADIADO';
    default: return status.toUpperCase();
  }
}

function isLive(status: string): boolean {
  return ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(status);
}

const ACTION_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  CASHOUT: { bg: 'bg-destructive/20 border-destructive/40', text: 'text-destructive', label: '💰 ENCERRAR' },
  HOLD: { bg: 'bg-oracle-blue/20 border-oracle-blue/40', text: 'text-oracle-blue', label: '✊ MANTER' },
  BET_MORE: { bg: 'bg-oracle-win/20 border-oracle-win/40', text: 'text-oracle-win', label: '🚀 AUMENTAR' },
  HEDGE: { bg: 'bg-primary/20 border-primary/40', text: 'text-primary', label: '🛡️ PROTEGER' },
};

function getLeaguePriority(leagueName: string): number {
  const name = leagueName.toLowerCase();
  if (name.includes('brazil') || name.includes('brasileir') || name.includes('paulista') || name.includes('carioca') || name.includes('mineiro') || name.includes('gaucho')) return 1;
  if (name.includes('libertadores') || name.includes('sudamericana') || name.includes('argentin') || name.includes('colombia') || name.includes('chile') || name.includes('uruguay')) return 2;
  return 3;
}

export function LiveMatches({ matches, isLoading }: LiveMatchesProps) {
  const { advice, loading, getAdvice, clearAdvice } = useLiveAdvisor();
  const { isLeagueAllowed } = useLeagueFilter();
  const navigate = useNavigate();

  const filteredMatches = useMemo(
    () => matches.filter((m) => isLeagueAllowed(m.league, 0)),
    [matches, isLeagueAllowed],
  );

  const sortedMatches = useMemo(() => {
    return [...filteredMatches].sort((a, b) => {
      const prioA = getLeaguePriority(a.league);
      const prioB = getLeaguePriority(b.league);
      if (prioA !== prioB) return prioA - prioB;
      return a.league.localeCompare(b.league);
    });
  }, [filteredMatches]);

  const liveMatches = sortedMatches.filter((m) => isLive(m.status));
  const finishedMatches = sortedMatches.filter((m) => !isLive(m.status) && m.homeScore !== null);

  const teamNames = useMemo(
    () => sortedMatches.flatMap((m) => [m.homeTeam, m.awayTeam]),
    [sortedMatches],
  );

  useEffect(() => {
    if (teamNames.length > 0) preloadTeamLogos(teamNames);
  }, [teamNames.join(',')]);

  if (isLoading) {
    return (
      <div className="px-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="font-bold text-sm tracking-widest uppercase text-muted-foreground">Ao Vivo</span>
        </div>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          {[1, 2, 3].map(i => (
            <div key={i} className="min-w-[280px] h-[140px] rounded-lg bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (liveMatches.length === 0 && finishedMatches.length === 0) {
    return (
      <div className="px-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="font-bold text-sm tracking-widest uppercase text-muted-foreground">Nenhum jogo ao vivo</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Jogos de hoje aparecerão aqui quando começarem.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {liveMatches.length > 0 && (
        <section>
          <div className="px-4 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <h2 className="font-bold text-sm tracking-widest uppercase text-muted-foreground">Ao Vivo Agora</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {liveMatches.length} {liveMatches.length === 1 ? 'jogo' : 'jogos'}
            </span>
          </div>
          <div className="flex gap-4 overflow-x-auto px-4 scrollbar-hide">
            <AnimatePresence>
              {liveMatches.map((match) => (
                <LiveMatchCard
                  key={match.id}
                  match={match}
                  advice={advice[match.id]}
                  isLoadingAdvice={loading[match.id] || false}
                  onRequestAdvice={() => getAdvice(match.id, {
                    homeTeam: match.homeTeam,
                    awayTeam: match.awayTeam,
                    homeScore: match.homeScore || '0',
                    awayScore: match.awayScore || '0',
                    league: match.league,
                    status: statusLabel(match.status),
                    minute: match.time,
                  })}
                  onClearAdvice={() => clearAdvice(match.id)}
                  onClick={() => {
                    sessionStorage.setItem('selected-fixture-id', match.id);
                    navigate(`/match/${match.id}`);
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {finishedMatches.length > 0 && (
        <section className="opacity-75">
          <div className="px-4 flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm tracking-widest uppercase text-muted-foreground">Encerrados Recentemente</h2>
            <span className="text-xs text-muted-foreground">
              {finishedMatches.length} {finishedMatches.length === 1 ? 'jogo' : 'jogos'}
            </span>
          </div>
          <div className="space-y-3 px-4">
            {finishedMatches.map((match) => (
              <FinishedMatchRow key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

interface LiveMatchCardProps {
  match: LiveMatch;
  advice?: LiveAdvice;
  isLoadingAdvice?: boolean;
  onRequestAdvice?: () => void;
  onClearAdvice?: () => void;
  onClick?: () => void;
}

function LiveMatchCard({ match, advice, isLoadingAdvice, onRequestAdvice, onClearAdvice, onClick }: LiveMatchCardProps) {
  const { getTeamLogoLive } = useTeamLogos();
  const actionCfg = advice ? ACTION_CONFIG[advice.action] || ACTION_CONFIG.HOLD : null;
  const isSouthAm = getLeaguePriority(match.league) <= 2;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className={`min-w-[280px] glass-card rounded-lg p-4 relative overflow-hidden cursor-pointer border-l-4 ${isSouthAm ? 'border-l-primary' : 'border-l-transparent'}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-1.5">
          {isSouthAm && <Trophy className="w-3 h-3 text-primary" />}
          <span className={`text-[10px] font-bold uppercase tracking-tighter ${isSouthAm ? 'text-primary' : 'text-muted-foreground'}`}>
            {match.league}
          </span>
        </div>
        <span className="px-2 py-0.5 bg-destructive/20 text-destructive text-[10px] font-bold rounded animate-pulse">
          {statusLabel(match.status)}
          {match.time && ` ${match.time}'`}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={getTeamLogoLive(match.homeTeam, match.homeBadge)}
              alt={match.homeTeam}
              className="w-6 h-6 rounded-full object-contain"
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
            />
            <span className="text-sm font-medium text-foreground truncate max-w-[140px]">{match.homeTeam}</span>
          </div>
          <span className="text-lg font-bold text-foreground">{match.homeScore ?? 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={getTeamLogoLive(match.awayTeam, match.awayBadge)}
              alt={match.awayTeam}
              className="w-6 h-6 rounded-full object-contain"
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
            />
            <span className="text-sm font-medium text-foreground truncate max-w-[140px]">{match.awayTeam}</span>
          </div>
          <span className="text-lg font-bold text-foreground">{match.awayScore ?? 0}</span>
        </div>
      </div>

      <div className="mt-4" onClick={(e) => e.stopPropagation()}>
        {!advice && !isLoadingAdvice && (
          <button
            onClick={onRequestAdvice}
            className="w-full bg-muted/30 hover:bg-primary hover:text-primary-foreground transition-colors py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-2 uppercase"
          >
            <Zap className="w-3 h-3" />
            Consultar Profeta
          </button>
        )}

        {isLoadingAdvice && (
          <div className="flex items-center justify-center gap-1.5 py-2 text-[11px] text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            Analisando...
          </div>
        )}

        {advice && actionCfg && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold tracking-wider ${actionCfg.text}`}>
                {actionCfg.label}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">
                  {advice.confidence}%
                </span>
                <button onClick={onClearAdvice} className="p-0.5 rounded hover:bg-secondary/50 text-muted-foreground">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{advice.reasoning}</p>
            <p className="text-[10px] text-primary">💡 {advice.profitTip}</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function FinishedMatchRow({ match }: { match: LiveMatch }) {
  const { getTeamLogoLive } = useTeamLogos();

  return (
    <div className="bg-card/40 border border-border rounded-lg p-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img
          src={getTeamLogoLive(match.homeTeam, match.homeBadge)}
          alt={match.homeTeam}
          className="w-5 h-5 object-contain"
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
        />
        <span className="text-xs font-medium text-foreground">{match.homeTeam}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-bold text-foreground">{match.homeScore ?? 0} - {match.awayScore ?? 0}</span>
        <span className="text-[9px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded">FINAL</span>
      </div>
      <div className="flex items-center gap-3 justify-end">
        <span className="text-xs font-medium text-foreground">{match.awayTeam}</span>
        <img
          src={getTeamLogoLive(match.awayTeam, match.awayBadge)}
          alt={match.awayTeam}
          className="w-5 h-5 object-contain"
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
        />
      </div>
    </div>
  );
}