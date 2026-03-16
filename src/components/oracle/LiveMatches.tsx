import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Clock, Zap, Loader2, X } from 'lucide-react';
import { preloadTeamLogos } from '@/services/teamLogos';
import { useTeamLogos } from '@/hooks/useTeamLogos';
import { useLiveAdvisor, LiveAdvice } from '@/hooks/useLiveAdvisor';
import { useState, useEffect, useMemo } from 'react';

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
    case 'Match Finished': return 'ENCERRADO';
    case 'FT': return 'ENCERRADO';
    case 'PST': return 'ADIADO';
    default: return status.toUpperCase();
  }
}

function isLive(status: string): boolean {
  return ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(status);
}

const ACTION_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  CASHOUT: { bg: 'bg-red-500/20 border-red-500/40', text: 'text-red-400', label: '💰 ENCERRAR' },
  HOLD: { bg: 'bg-blue-500/20 border-blue-500/40', text: 'text-blue-400', label: '✊ MANTER' },
  BET_MORE: { bg: 'bg-green-500/20 border-green-500/40', text: 'text-green-400', label: '🚀 AUMENTAR' },
  HEDGE: { bg: 'bg-yellow-500/20 border-yellow-500/40', text: 'text-yellow-400', label: '🛡️ PROTEGER' },
};

export function LiveMatches({ matches, isLoading }: LiveMatchesProps) {
  const liveMatches = matches.filter(m => isLive(m.status));
  const finishedMatches = matches.filter(m => !isLive(m.status) && (m.homeScore !== null));
  const { advice, loading, getAdvice, clearAdvice } = useLiveAdvisor();

  // Preload logos for all teams
  const teamNames = useMemo(() =>
    matches.flatMap(m => [m.homeTeam, m.awayTeam]),
    [matches]
  );

  useEffect(() => {
    if (teamNames.length > 0) {
      preloadTeamLogos(teamNames);
    }
  }, [teamNames.join(',')]);

  if (isLoading) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Radio className="w-4 h-4 text-destructive animate-pulse" />
          <span className="font-display text-sm tracking-wider text-foreground">AO VIVO</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="min-w-[220px] h-[100px] rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (liveMatches.length === 0 && finishedMatches.length === 0) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="font-display text-sm tracking-wider text-muted-foreground">NENHUM JOGO AO VIVO AGORA</span>
        </div>
        <p className="text-xs font-body text-muted-foreground">
          Jogos de hoje aparecerão aqui quando começarem.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Live matches */}
      {liveMatches.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
            </span>
            <span className="font-display text-sm tracking-wider text-foreground">
              AO VIVO
            </span>
            <span className="text-xs font-body text-muted-foreground ml-auto">
              {liveMatches.length} {liveMatches.length === 1 ? 'jogo' : 'jogos'}
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
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
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Recently finished */}
      {finishedMatches.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-display text-sm tracking-wider text-muted-foreground">
              ENCERRADOS HOJE
            </span>
            <span className="text-xs font-body text-muted-foreground ml-auto">
              {finishedMatches.length} {finishedMatches.length === 1 ? 'jogo' : 'jogos'}
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {finishedMatches.map((match) => (
              <LiveMatchCard key={match.id} match={match} finished />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface LiveMatchCardProps {
  match: LiveMatch;
  finished?: boolean;
  advice?: LiveAdvice;
  isLoadingAdvice?: boolean;
  onRequestAdvice?: () => void;
  onClearAdvice?: () => void;
}

function LiveMatchCard({
  match,
  finished = false,
  advice,
  isLoadingAdvice,
  onRequestAdvice,
  onClearAdvice,
}: LiveMatchCardProps) {
  const { getTeamLogoLive } = useTeamLogos();
  const live = isLive(match.status);
  const actionCfg = advice ? ACTION_CONFIG[advice.action] || ACTION_CONFIG.HOLD : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`min-w-[260px] rounded-xl p-3 border transition-all ${
        advice
          ? `${actionCfg!.bg} border`
          : live
            ? 'bg-destructive/5 border-destructive/30'
            : 'bg-secondary/50 border-border'
      }`}
    >
      {/* League + Status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {match.leagueBadge && (
            <img
              src={match.leagueBadge}
              alt=""
              className="w-4 h-4 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <span className="text-[10px] font-body text-muted-foreground truncate max-w-[100px]">
            {match.league}
          </span>
        </div>
        <span className={`text-[10px] font-display tracking-wider px-1.5 py-0.5 rounded ${
          live
            ? 'bg-destructive/20 text-destructive'
            : 'bg-muted text-muted-foreground'
        }`}>
          {statusLabel(match.status)}
          {match.time && live && ` ${match.time}'`}
        </span>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img
            src={getTeamLogoLive(match.homeTeam, match.homeBadge)}
            alt={match.homeTeam}
            className="w-6 h-6 object-contain shrink-0 rounded"
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
          />
          <span className="text-xs font-body text-foreground truncate">{match.homeTeam}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-lg font-display ${live ? 'text-foreground' : 'text-muted-foreground'}`}>
            {match.homeScore ?? '-'}
          </span>
          <span className="text-xs text-muted-foreground">:</span>
          <span className={`text-lg font-display ${live ? 'text-foreground' : 'text-muted-foreground'}`}>
            {match.awayScore ?? '-'}
          </span>
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-1 flex-row-reverse">
          <img
            src={getTeamLogo(match.awayTeam, match.awayBadge)}
            alt={match.awayTeam}
            className="w-6 h-6 object-contain shrink-0 rounded"
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
          />
          <span className="text-xs font-body text-foreground truncate text-right">{match.awayTeam}</span>
        </div>
      </div>

      {/* Live Advisor */}
      {live && !finished && (
        <div className="mt-2 pt-2 border-t border-border/50">
          {!advice && !isLoadingAdvice && (
            <button
              onClick={onRequestAdvice}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-display tracking-wider transition-colors"
            >
              <Zap className="w-3 h-3" />
              CONSULTAR PROFETA
            </button>
          )}

          {isLoadingAdvice && (
            <div className="flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-muted-foreground">
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
                <span className={`text-xs font-display tracking-wider ${actionCfg.text}`}>
                  {actionCfg.label}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">
                    {advice.confidence}% confiança
                  </span>
                  <button
                    onClick={onClearAdvice}
                    className="p-0.5 rounded hover:bg-secondary/50 text-muted-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
                {advice.suggestion}
              </p>
              <p className="text-[10px] font-body text-oracle-draw">
                💡 {advice.profitTip}
              </p>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
