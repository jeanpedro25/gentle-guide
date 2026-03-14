import { H2HFixture } from '@/types/fixture';
import { motion } from 'framer-motion';

interface H2HHistoryProps {
  h2h: H2HFixture[];
  homeTeamId: number;
}

export function H2HHistory({ h2h, homeTeamId }: H2HHistoryProps) {
  if (h2h.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 }}
      className="glass-card p-5 space-y-3"
    >
      <h3 className="font-display text-lg tracking-wider text-foreground">
        ⚔️ CONFRONTO DIRETO
      </h3>
      <div className="space-y-2">
        {h2h.map((match, i) => {
          const homeGoals = match.goals.home ?? 0;
          const awayGoals = match.goals.away ?? 0;
          const homeWon = homeGoals > awayGoals;
          const awayWon = awayGoals > homeGoals;
          const isSelectedHome = match.teams.home.id === homeTeamId;
          const selectedWon = isSelectedHome ? homeWon : awayWon;
          const selectedLost = isSelectedHome ? awayWon : homeWon;

          const colorClass = selectedWon
            ? 'border-oracle-win'
            : selectedLost
            ? 'border-oracle-loss'
            : 'border-oracle-draw';

          const bgClass = selectedWon
            ? 'bg-oracle-win/10'
            : selectedLost
            ? 'bg-oracle-loss/10'
            : 'bg-oracle-draw/10';

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 + i * 0.1 }}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border ${colorClass} ${bgClass}`}
            >
              <span className="text-xs font-body text-muted-foreground">
                {new Date(match.fixture.date).toLocaleDateString('pt-BR')}
              </span>
              <span className="text-sm font-display text-foreground">
                {match.teams.home.name.slice(0, 3).toUpperCase()} {homeGoals} × {awayGoals}{' '}
                {match.teams.away.name.slice(0, 3).toUpperCase()}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
