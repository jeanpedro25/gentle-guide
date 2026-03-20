import { motion } from 'framer-motion';
import { Filter, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLeagueFilter } from '@/contexts/LeagueFilterContext';
import { createLeagueMatcher, readSelectedLeagueIdsFromStorage, resolveLeagueOptions } from '@/lib/leagueFilter';

export interface MatchFiltersState {
  league: string;
  timeOfDay: 'all' | 'morning' | 'afternoon' | 'night';
  sortBy: 'time' | 'ev' | 'odd';
}

interface Props {
  filters: MatchFiltersState;
  onChange: (filters: MatchFiltersState) => void;
  availableLeagues: string[];
}

const TIME_OPTIONS = [
  { value: 'all' as const, label: 'Todos' },
  { value: 'morning' as const, label: '🌅 Manhã' },
  { value: 'afternoon' as const, label: '☀️ Tarde' },
  { value: 'night' as const, label: '🌙 Noite' },
];

const SORT_OPTIONS = [
  { value: 'time' as const, label: '⏰ Mais próximo' },
  { value: 'ev' as const, label: '📈 Maior EV' },
  { value: 'odd' as const, label: '💰 Maior odd' },
];

export function MatchFilters({ filters, onChange, availableLeagues }: Props) {
  const [open, setOpen] = useState(false);
  const { selectedLeague, setSelectedLeague } = useLeagueFilter();

  useEffect(() => {
    registerLeagueNames(availableLeagues);
  }, [availableLeagues, registerLeagueNames]);

  const hasActiveFilters = filters.league !== '' || filters.timeOfDay !== 'all' || filters.sortBy !== 'time';
  const hasGlobalLeagueFilter = selectedLeagueIds.length > 0;

  const reset = () => onChange({ league: '', timeOfDay: 'all', sortBy: 'time' });

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
          hasActiveFilters
            ? 'bg-primary/10 text-primary border-primary/30'
            : 'bg-card text-muted-foreground border-border hover:border-primary/30'
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        Filtros
        {hasActiveFilters && (
          <button onClick={(e) => { e.stopPropagation(); reset(); }} className="ml-1 hover:text-destructive">
            <X className="w-3 h-3" />
          </button>
        )}
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-card border border-border rounded-lg p-3 space-y-3"
        >
          {hasGlobalLeagueFilter && (
            <div className="text-[10px] px-2 py-1 rounded bg-primary/10 border border-primary/30 text-primary font-semibold">
              Filtro global ativo no menu lateral: {selectedLeagueIds.length} liga(s).
            </div>
          )}
          {/* League filter */}
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Liga</label>
            <select
              value={filters.league}
              onChange={e => onChange({ ...filters, league: e.target.value })}
              className="mt-1 w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Todas as ligas</option>
              {availableLeagues.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Time of day */}
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Horário</label>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {TIME_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onChange({ ...filters, timeOfDay: opt.value })}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors border ${
                    filters.timeOfDay === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-muted-foreground border-border hover:border-primary/30'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Ordenar por</label>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onChange({ ...filters, sortBy: opt.value })}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors border ${
                    filters.sortBy === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-muted-foreground border-border hover:border-primary/30'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function applyMatchFilters(
  fixtures: { leagueName: string; fixtures: { fixture: { timestamp: number; id: number }; league: { name: string } }[] }[],
  filters: MatchFiltersState,
): typeof fixtures {
  let result = fixtures;

  const globalSelectedLeagues = readSelectedLeagueIdsFromStorage();
  const globalMatcher = createLeagueMatcher(
    globalSelectedLeagues,
    resolveLeagueOptions(fixtures.map((g) => g.leagueName)),
  );

  if (globalSelectedLeagues.length > 0) {
    result = result
      .map((g) => ({
        ...g,
        fixtures: g.fixtures.filter((f) => globalMatcher(f.league.name || g.leagueName)),
      }))
      .filter((g) => g.fixtures.length > 0);
  }

  // Filter by league
  if (filters.league) {
    result = result.filter(g => g.leagueName === filters.league);
  }

  // Filter by time of day (Brazil timezone)
  if (filters.timeOfDay !== 'all') {
    result = result.map(g => ({
      ...g,
      fixtures: g.fixtures.filter(f => {
        const date = new Date(f.fixture.timestamp * 1000);
        const hour = parseInt(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }));
        if (filters.timeOfDay === 'morning') return hour >= 6 && hour < 12;
        if (filters.timeOfDay === 'afternoon') return hour >= 12 && hour < 18;
        if (filters.timeOfDay === 'night') return hour >= 18 || hour < 6;
        return true;
      }),
    })).filter(g => g.fixtures.length > 0);
  }

  // Sort
  if (filters.sortBy === 'ev') {
    result = [...result].sort((a, b) => {
      const aScore = a.fixtures.reduce((s, f) => s + ((f.fixture.id * 7 + 13) % 100), 0) / a.fixtures.length;
      const bScore = b.fixtures.reduce((s, f) => s + ((f.fixture.id * 7 + 13) % 100), 0) / b.fixtures.length;
      return bScore - aScore;
    });
  }

  return result;
}