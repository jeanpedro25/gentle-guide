import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Clock } from 'lucide-react';
import { getTeamLogo } from '@/services/teamLogos';

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

export function LiveMatches({ matches, isLoading }: LiveMatchesProps) {
  const liveMatches = matches.filter(m => isLive(m.status));
  const finishedMatches = matches.filter(m => !isLive(m.status) && (m.homeScore !== null));

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
                <LiveMatchCard key={match.id} match={match} />
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

function LiveMatchCard({ match, finished = false }: { match: LiveMatch; finished?: boolean }) {
  const live = isLive(match.status);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`min-w-[240px] rounded-xl p-3 border transition-all ${
        live
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
        </span>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img
            src={match.homeBadge}
            alt={match.homeTeam}
            className="w-6 h-6 object-contain shrink-0"
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
            src={match.awayBadge}
            alt={match.awayTeam}
            className="w-6 h-6 object-contain shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
          />
          <span className="text-xs font-body text-foreground truncate text-right">{match.awayTeam}</span>
        </div>
      </div>
    </motion.div>
  );
}
