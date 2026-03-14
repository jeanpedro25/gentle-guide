import { motion } from 'framer-motion';
import { ApiFixture } from '@/types/fixture';
import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight } from 'lucide-react';

interface MatchCardProps {
  fixture: ApiFixture;
  onClick: () => void;
  index: number;
}

export function MatchCard({ fixture, onClick, index }: MatchCardProps) {
  const matchDate = parseISO(fixture.fixture.date);
  const isTodayMatch = isToday(matchDate);
  const formattedDate = format(matchDate, "EEE, dd MMM '•' HH:mm", { locale: ptBR });

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -4, scale: 1.01 }}
      onClick={onClick}
      className="w-full text-left glass-card p-4 hover:border-primary/30 transition-all group"
    >
      {/* League + round */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <img
            src={fixture.league.logo}
            alt={fixture.league.name}
            className="w-5 h-5 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-xs font-body text-muted-foreground truncate max-w-[160px]">
            {fixture.league.name}
          </span>
        </div>
        <span className="text-xs font-body text-muted-foreground">
          {fixture.league.round?.replace('Regular Season - ', 'Rod. ')}
        </span>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <TeamBadge name={fixture.teams.home.name} logo={fixture.teams.home.logo} align="left" badge="🏠" />
        <span className="font-display text-lg text-muted-foreground shrink-0">VS</span>
        <TeamBadge name={fixture.teams.away.name} logo={fixture.teams.away.logo} align="right" badge="✈️" />
      </div>

      {/* Date + status */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-body text-muted-foreground capitalize">{formattedDate}</span>
        <div className="flex items-center gap-2">
          {isTodayMatch ? (
            <span className="flex items-center gap-1 text-xs font-display text-oracle-draw">
              <span className="w-2 h-2 rounded-full bg-oracle-draw animate-pulse" />
              HOJE
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-display text-oracle-win">
              <span className="w-2 h-2 rounded-full bg-oracle-win animate-pulse" />
              EM BREVE
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </motion.button>
  );
}

function TeamBadge({ name, logo, align }: { name: string; logo: string; align: 'left' | 'right' }) {
  return (
    <div className={`flex items-center gap-2 min-w-0 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <img
        src={logo}
        alt={name}
        className="w-8 h-8 object-contain shrink-0"
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/placeholder.svg';
        }}
      />
      <span className="text-sm font-body text-foreground truncate">{name}</span>
    </div>
  );
}
