import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { ApiFixture } from '@/types/fixture';
import { useLeagueFilter } from '@/contexts/LeagueFilterContext';

interface Props {
  fixture: ApiFixture;
  onAnalyze: (fixture: ApiFixture) => void;
}

export function MatchListItem({ fixture, onAnalyze }: Props) {
  const { isLeagueAllowed, registerDynamicLeague } = useLeagueFilter();
  const leagueId = String(fixture.league.id);

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
      bandeira: '🏟️',
    });
  }, [fixture.league.id, fixture.league.name, registerDynamicLeague]);

  if (!isLeagueAllowed(fixture.league.name, leagueId)) {
    return null;
  }

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={(e) => {
        e.stopPropagation();
        onAnalyze(fixture);
      }}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-[0.98] text-left"
      data-fixture-id={fixture.fixture.id}
    >
      <div className="text-center shrink-0 w-12">
        <p className="text-xs font-bold text-foreground">{time}</p>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate">{fixture.teams.home.name}</p>
        <p className="text-xs text-muted-foreground truncate">vs {fixture.teams.away.name}</p>
        <p className="text-[10px] text-muted-foreground/60 truncate">{fixture.league.name}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
          ANALISAR
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </motion.button>
  );
}