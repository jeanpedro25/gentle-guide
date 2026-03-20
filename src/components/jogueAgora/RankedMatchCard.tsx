import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Clock, Zap } from 'lucide-react';
import { AnaliseJogo, PICK_LABELS_FULL } from '@/lib/jogueAgora';
import { FIXED_LEAGUES, useLeagueFilter } from '@/contexts/LeagueFilterContext';

interface Props {
  analise: AnaliseJogo;
  rank: number;
  onAnalyze: () => void;
  onBet: () => void;
}

const FIXED_LEAGUE_IDS = new Set(FIXED_LEAGUES.map((league) => league.id));

function ConfidenceBar({ value }: { value: number }) {
  const filled = Math.round(value / 10);
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2.5 rounded-sm ${i < filled ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>
      <span className="text-xs font-bold text-foreground">{value}%</span>
    </div>
  );
}

export function RankedMatchCard({ analise, rank, onAnalyze, onBet }: Props) {
  const { fixture } = analise;
  const { isLeagueAllowed, registerDynamicLeague, selectedLeagueIds } = useLeagueFilter();
  const leagueId = String(fixture.league.id);
  const hasOnlyFixedSelections = selectedLeagueIds.length > 0 && selectedLeagueIds.every((id) => FIXED_LEAGUE_IDS.has(id));
  const isLive = ['1H', '2H', 'HT', 'LIVE', 'PEN'].includes(fixture.fixture.status.short);

  const time = new Date(fixture.fixture.date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });

  useEffect(() => {
    registerDynamicLeague({
      id: leagueId,
      apiId: fixture.league.id,
      nome: fixture.league.name,
      bandeira: 'üèüÔ∏è',
    });
  }, [fixture.league.id, fixture.league.name, registerDynamicLeague]);

  if (!isLeagueAllowed(fixture.league.name, fixture.league.id) && !hasOnlyFixedSelections) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.05 }}
      className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/30 transition-colors"
    >
      {/* Top row: rank + league + time/live */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-primary bg-primary/10 w-6 h-6 rounded-full flex items-center justify-center">
            {rank}
          </span>
          <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">{fixture.league.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isLive ? (
            <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded animate-pulse">
              üî¥ AO VIVO
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> {time}
            </span>
          )}
        </div>
      </div>

      {/* Teams */}
      <div>
        <p className="text-sm font-extrabold text-foreground">{fixture.teams.home.name}</p>
        <p className="text-xs text-muted-foreground">vs {fixture.teams.away.name}</p>
      </div>

      {/* Score + Prediction */}
      <div className="flex items-center gap-3">
        <div className="bg-secondary/60 rounded-lg px-3 py-2 text-center">
          <p className="text-[9px] text-muted-foreground uppercase">Placar</p>
          <p className="text-lg font-black text-foreground tracking-wider">{analise.placar_provavel}</p>
        </div>
        <div className="flex-1 space-y-1">
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/15 border border-primary/20">
            <Target className="w-3 h-3 text-primary" />
            <span className="text-xs font-bold text-primary">{PICK_LABELS_FULL[analise.melhor_resultado]}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${analise.melhor_ev > 0 ? 'text-primary' : 'text-destructive'}`}>
              <TrendingUp className="w-3 h-3 inline mr-0.5" />
              {analise.melhor_ev > 0 ? '+' : ''}{analise.melhor_ev.toFixed(1)}% EV
            </span>
            <span className="text-xs text-muted-foreground">Odd {analise.melhor_odd.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Confidence */}
      <div>
        <p className="text-[9px] text-muted-foreground mb-1">Confian√ßa</p>
        <ConfidenceBar value={analise.confianca} />
      </div>

      {isLive && (
        <p className="text-[10px] text-oracle-draw bg-oracle-draw/10 rounded px-2 py-1">
          ‚ö†Ô∏è Jogo j√° come√ßou ‚Äî odd pode ter mudado
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onAnalyze}
          className="flex-1 py-2.5 rounded-lg bg-secondary text-foreground text-xs font-bold hover:bg-secondary/80 transition-colors flex items-center justify-center gap-1"
        >
          üìä ANALISAR
        </button>
        <button
          onClick={onBet}
          className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
        >
          <Zap className="w-3 h-3" /> APOSTAR
        </button>
      </div>
    </motion.div>
  );
}