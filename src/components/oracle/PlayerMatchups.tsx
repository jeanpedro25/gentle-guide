import { motion } from 'framer-motion';
import { OracleAnalysis } from '@/types/prediction';
import { Swords } from 'lucide-react';

interface PlayerMatchupsProps {
  oracle: OracleAnalysis;
  homeTeam: string;
  awayTeam: string;
}

export function PlayerMatchups({ oracle, homeTeam, awayTeam }: PlayerMatchupsProps) {
  if (!oracle.playerDuels || oracle.playerDuels.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card p-5 space-y-4"
    >
      <h3 className="font-display text-lg tracking-wider text-foreground flex items-center gap-2">
        <Swords className="w-5 h-5 text-oracle-loss" />
        DUELOS DECISIVOS
      </h3>

      <div className="space-y-3">
        {oracle.playerDuels.map((duel, i) => {
          const advColor = duel.advantage === 'HOME' ? 'border-oracle-win/40 bg-oracle-win/5'
            : duel.advantage === 'AWAY' ? 'border-oracle-loss/40 bg-oracle-loss/5'
            : 'border-border bg-secondary/30';

          const advLabel = duel.advantage === 'HOME' ? `VANTAGEM ${homeTeam.split(' ').pop()?.toUpperCase()} ✅`
            : duel.advantage === 'AWAY' ? `VANTAGEM ${awayTeam.split(' ').pop()?.toUpperCase()} ✅`
            : 'EQUILIBRADO ⚖️';

          const advTextColor = duel.advantage === 'HOME' ? 'text-oracle-win'
            : duel.advantage === 'AWAY' ? 'text-oracle-loss' : 'text-muted-foreground';

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className={`p-4 rounded-xl border ${advColor}`}
            >
              {/* Players header */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-center flex-1">
                  <p className="font-display text-sm text-foreground">{duel.homePlayer}</p>
                  <p className="font-display text-2xl text-foreground">{duel.homeRating}</p>
                </div>
                <span className="font-display text-sm text-muted-foreground px-3">VS</span>
                <div className="text-center flex-1">
                  <p className="font-display text-sm text-foreground">{duel.awayPlayer}</p>
                  <p className="font-display text-2xl text-foreground">{duel.awayRating}</p>
                </div>
              </div>

              {/* Stats comparison */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {Object.entries(duel.homeStats).slice(0, 3).map(([key, val]) => (
                  <div key={`h-${key}`} className="flex items-center justify-between text-xs font-body bg-secondary/40 px-2 py-1 rounded">
                    <span className="text-muted-foreground capitalize">{key}</span>
                    <span className="text-foreground font-display">{val}</span>
                  </div>
                ))}
                {Object.entries(duel.awayStats).slice(0, 3).map(([key, val]) => (
                  <div key={`a-${key}`} className="flex items-center justify-between text-xs font-body bg-secondary/40 px-2 py-1 rounded">
                    <span className="text-muted-foreground capitalize">{key}</span>
                    <span className="text-foreground font-display">{val}</span>
                  </div>
                ))}
              </div>

              {/* Result */}
              <p className={`text-xs font-display text-center tracking-wider ${advTextColor}`}>
                RESULTADO: {advLabel}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
