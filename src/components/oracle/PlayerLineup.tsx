import { motion } from 'framer-motion';
import { OracleAnalysis, PlayerRating } from '@/types/prediction';
import { Users } from 'lucide-react';

interface PlayerLineupProps {
  oracle: OracleAnalysis;
  homeTeam: string;
  awayTeam: string;
}

const positionColors: Record<string, string> = {
  GOL: 'bg-oracle-draw/20 text-oracle-draw border-oracle-draw/40',
  ZAG: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  LAT: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  MEI: 'bg-primary/20 text-primary border-primary/40',
  ATA: 'bg-oracle-loss/20 text-oracle-loss border-oracle-loss/40',
};

function RatingBadge({ rating }: { rating: number }) {
  const color = rating >= 85 ? 'text-oracle-win' : rating >= 75 ? 'text-oracle-draw' : 'text-muted-foreground';
  return <span className={`font-display text-lg ${color}`}>{rating}</span>;
}

function PlayerRow({ player, align }: { player: PlayerRating; align: 'left' | 'right' }) {
  const posClass = positionColors[player.position] || 'bg-secondary text-muted-foreground border-border';
  return (
    <div className={`flex items-center gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <span className={`text-[10px] font-display px-1.5 py-0.5 rounded border ${posClass}`}>
        {player.position}
      </span>
      <span className="text-xs font-body text-foreground truncate max-w-[100px]">{player.name}</span>
      <RatingBadge rating={player.rating} />
    </div>
  );
}

export function PlayerLineup({ oracle, homeTeam, awayTeam }: PlayerLineupProps) {
  if (!oracle.playerRatings) return null;

  const { home, away } = oracle.playerRatings;
  const maxLen = Math.max(home.length, away.length);

  // Sort by position order
  const posOrder = ['GOL', 'ZAG', 'LAT', 'MEI', 'ATA'];
  const sortByPos = (a: PlayerRating, b: PlayerRating) =>
    posOrder.indexOf(a.position) - posOrder.indexOf(b.position);

  const sortedHome = [...home].sort(sortByPos);
  const sortedAway = [...away].sort(sortByPos);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-5 space-y-4"
    >
      <h3 className="font-display text-lg tracking-wider text-foreground flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        ESCALAÇÃO E VANTAGENS
      </h3>

      {/* Formation labels */}
      {oracle.formationAnalysis && (
        <div className="flex items-center justify-between px-2">
          <span className="text-sm font-display text-muted-foreground">
            {homeTeam.split(' ').pop()} <span className="text-foreground">{oracle.formationAnalysis.home}</span>
          </span>
          <span className="text-sm font-display text-muted-foreground">
            <span className="text-foreground">{oracle.formationAnalysis.away}</span> {awayTeam.split(' ').pop()}
          </span>
        </div>
      )}

      {/* Player matchup rows */}
      <div className="space-y-2">
        {Array.from({ length: Math.min(maxLen, 11) }, (_, i) => {
          const hp = sortedHome[i];
          const ap = sortedAway[i];
          if (!hp && !ap) return null;

          const advantage = hp && ap
            ? hp.rating > ap.rating ? 'HOME' : ap.rating > hp.rating ? 'AWAY' : 'EQUAL'
            : 'EQUAL';

          const advColor = advantage === 'HOME' ? 'text-oracle-win' : advantage === 'AWAY' ? 'text-oracle-loss' : 'text-muted-foreground';
          const advText = advantage === 'HOME' ? `← VANT. ${homeTeam.split(' ').pop()?.toUpperCase()}`
            : advantage === 'AWAY' ? `VANT. ${awayTeam.split(' ').pop()?.toUpperCase()} →` : '⚖️ IGUAL';

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30 border border-border/50"
            >
              <div className="flex-1">{hp && <PlayerRow player={hp} align="left" />}</div>
              <span className={`text-[10px] font-display tracking-wider px-2 whitespace-nowrap ${advColor}`}>
                {advText}
              </span>
              <div className="flex-1 flex justify-end">{ap && <PlayerRow player={ap} align="right" />}</div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
