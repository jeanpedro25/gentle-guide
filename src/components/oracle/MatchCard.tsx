import { motion } from 'framer-motion';
import { ApiFixture, ESTRELABET_LEAGUES, LEAGUES } from '@/types/fixture';
import { getTeamLogo } from '@/services/teamLogos';
import { Badge } from '@/components/ui/badge';
import { isValid, parseISO } from 'date-fns';
import { ChevronRight, Plus, Check, Star } from 'lucide-react';
import { useMultipla } from '@/contexts/MultiplaContext';
import { useState } from 'react';
import { getRelativeDayLabel, getStatusDisplay, formatBrazilTime } from '@/services/footballApi';

const LEAGUE_ID_TO_ISPORTS = new Map(LEAGUES.map(l => [l.id, l.iSportsId]));

interface MatchCardProps {
  fixture: ApiFixture;
  onClick: () => void;
  index: number;
}

const DEFAULT_ODDS = { home: 2.05, draw: 3.25, away: 3.50 };

export function MatchCard({ fixture, onClick, index }: MatchCardProps) {
  const parsedDate = parseISO(fixture.fixture.date);
  const fallbackDate = new Date(fixture.fixture.timestamp * 1000);
  const matchDate = isValid(parsedDate) ? parsedDate : fallbackDate;
  const hasValidDate = isValid(matchDate);

  // Brazil timezone formatting
  const dateStr = fixture.fixture.date.slice(0, 10);
  const timeStr = fixture.fixture.date.slice(11, 19);
  const formattedDate = hasValidDate ? formatBrazilTime(dateStr, timeStr) : 'Data a confirmar';
  const dayLabel = hasValidDate ? getRelativeDayLabel(fixture.fixture.date) : null;

  // Status display
  const statusShort = fixture.fixture.status.short;
  const statusDisplay = getStatusDisplay(statusShort);

  const { isSelected, getSelection, toggleSelection, maxReached } = useMultipla();
  const [showPicks, setShowPicks] = useState(false);

  const selected = isSelected(fixture.fixture.id);
  const currentSelection = getSelection(fixture.fixture.id);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`w-full text-left glass-card p-4 transition-all group relative ${
        selected ? 'border-primary/50 ring-1 ring-primary/20' : 'hover:border-primary/30'
      }`}
    >
      {/* Add to Múltipla button */}
      <button
        onClick={handleAddClick}
        className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all z-10 ${
          selected
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary/80 text-muted-foreground hover:bg-primary hover:text-primary-foreground'
        } ${!selected && maxReached ? 'opacity-30 cursor-not-allowed' : ''}`}
        disabled={!selected && maxReached}
        title={selected ? 'Remover da múltipla' : 'Adicionar à múltipla'}
      >
        {selected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>

      {/* Pick selector dropdown */}
      {showPicks && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-12 right-3 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden"
        >
          {[
            { pick: 'home' as const, label: fixture.teams.home.name, odd: DEFAULT_ODDS.home },
            { pick: 'draw' as const, label: 'Empate', odd: DEFAULT_ODDS.draw },
            { pick: 'away' as const, label: fixture.teams.away.name, odd: DEFAULT_ODDS.away },
          ].map(({ pick, label, odd }) => (
            <button
              key={pick}
              onClick={(e) => handlePick(e, pick)}
              className={`w-full px-4 py-2 text-left text-sm font-body flex justify-between items-center gap-4 hover:bg-secondary/50 transition-colors ${
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
        {/* League + round */}
        <div className="flex items-center justify-between mb-3 pr-8">
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
            {ESTRELABET_LEAGUES.has(LEAGUE_ID_TO_ISPORTS.get(fixture.league.id) ?? '') && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500/50 text-yellow-500 gap-0.5">
                <Star className="w-2.5 h-2.5 fill-yellow-500" />
                EstrelaBet
              </Badge>
            )}
          </div>
          <span className="text-xs font-body text-muted-foreground">
            {fixture.league.round?.replace('Regular Season - ', 'Rod. ')}
          </span>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <TeamBadge name={fixture.teams.home.name} logo={getTeamLogo(fixture.teams.home.name, fixture.teams.home.logo)} align="left" badge="🏠" />
          {statusShort === 'FT' || statusShort === '1H' || statusShort === '2H' || statusShort === 'HT' ? (
            <div className="text-center shrink-0">
              <span className="font-display text-xl text-foreground">
                {fixture.goals.home ?? 0} - {fixture.goals.away ?? 0}
              </span>
            </div>
          ) : (
            <span className="font-display text-lg text-muted-foreground shrink-0">VS</span>
          )}
          <TeamBadge name={fixture.teams.away.name} logo={fixture.teams.away.logo} align="right" badge="✈️" />
        </div>

        {/* Date + status */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-body text-muted-foreground capitalize">{formattedDate}</span>
          <div className="flex items-center gap-2">
            {dayLabel ? (
              <span className={`flex items-center gap-1 text-xs font-display ${
                dayLabel === 'HOJE' ? 'text-oracle-draw' : dayLabel === 'AMANHÃ' ? 'text-oracle-win' : 'text-muted-foreground'
              }`}>
                {dayLabel === 'HOJE' && <span className="w-2 h-2 rounded-full bg-oracle-draw animate-pulse" />}
                {dayLabel}
              </span>
            ) : (
              <span className={`flex items-center gap-1 text-xs font-display ${statusDisplay.color}`}>
                {statusDisplay.pulse && <span className={`w-2 h-2 rounded-full ${
                  statusDisplay.color.includes('red') ? 'bg-red-500' : 'bg-oracle-win'
                } animate-pulse`} />}
                {statusDisplay.label}
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </button>
    </motion.div>
  );
}

function TeamBadge({ name, logo, align, badge }: { name: string; logo: string; align: 'left' | 'right'; badge?: string }) {
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
      <div className="flex items-center gap-1 min-w-0">
        {badge && <span className="text-xs shrink-0">{badge}</span>}
        <span className="text-sm font-body text-foreground truncate">{name}</span>
      </div>
    </div>
  );
}
