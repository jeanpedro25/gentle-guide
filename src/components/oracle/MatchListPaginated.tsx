import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, Star } from 'lucide-react';
import { ApiFixture } from '@/types/fixture';
import { MatchCard } from './MatchCard';

interface LeagueGroup {
  leagueName: string;
  country: string;
  fixtures: ApiFixture[];
}

interface Props {
  grouped: LeagueGroup[];
  bestValueIds: Set<number>;
  onMatchClick: (fixture: ApiFixture) => void;
}

export function MatchListPaginated({ grouped, bestValueIds, onMatchClick }: Props) {
  const [collapsedLeagues, setCollapsedLeagues] = useState<Set<string>>(new Set());

  // Flatten all fixtures for pagination
  const allFixtures = useMemo(() => grouped.flatMap(g => g.fixtures), [grouped]);
  const totalMatches = allFixtures.length;

  // Auto-collapse leagues without EV-positive matches
  useEffect(() => {
    const toCollapse = new Set<string>();
    grouped.forEach(g => {
      const hasPositiveEV = g.fixtures.some(f => {
        const score = ((f.fixture.id * 7 + 13) % 100) / 100;
        return score > 0.5; // simulated EV positive
      });
      if (!hasPositiveEV && g.fixtures.length > 0) {
        toCollapse.add(g.leagueName);
      }
    });
    setCollapsedLeagues(toCollapse);
  }, [grouped]);


  const toggleLeague = useCallback((league: string) => {
    setCollapsedLeagues(prev => {
      const next = new Set(prev);
      if (next.has(league)) next.delete(league);
      else next.add(league);
      return next;
    });
  }, []);

  // Build visible groups without pagination
  const { visibleGroups, shownCount } = useMemo(() => {
    const result = grouped.map(group => ({
      group,
      visibleFixtures: group.fixtures,
    }));
    const shown = result.reduce((s, r) => s + r.visibleFixtures.length, 0);
    return { visibleGroups: result, shownCount: shown };
  }, [grouped]);

  return (
    <div className="space-y-4">
      {/* Counter */}
      <div className="bg-card border border-border rounded-lg p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-foreground font-bold">{totalMatches} jogos encontrados</span>
          <span className="text-muted-foreground">Exibindo {shownCount}</span>
        </div>
      </div>

      {/* League groups */}
      {visibleGroups.map(({ group, visibleFixtures }) => {
        const isCollapsed = collapsedLeagues.has(group.leagueName);
        const hasPositiveEV = group.fixtures.some(f => {
          const score = ((f.fixture.id * 7 + 13) % 100) / 100;
          return score > 0.5;
        });

        return (
          <div key={group.leagueName} className="space-y-2">
            {/* Collapsible league header */}
            <button
              onClick={() => toggleLeague(group.leagueName)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors border ${
                hasPositiveEV
                  ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                  : 'bg-card border-border hover:border-primary/20'
              }`}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-primary shrink-0" />
              )}
              <Star className={`w-4 h-4 shrink-0 ${hasPositiveEV ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="font-bold text-sm text-foreground flex-1 text-left">
                {group.leagueName.toUpperCase()}
                {group.country && (
                  <span className="text-muted-foreground font-normal text-xs ml-2">• {group.country}</span>
                )}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                hasPositiveEV ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {group.fixtures.length} jogos
              </span>
            </button>

            {/* Fixtures */}
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pl-2"
              >
                {visibleFixtures.map((fixture, i) => (
                  <MatchCard
                    key={fixture.fixture.id}
                    fixture={fixture}
                    onClick={() => onMatchClick(fixture)}
                    index={i}
                    bestValue={bestValueIds.has(fixture.fixture.id)}
                  />
                ))}
                {visibleFixtures.length < group.fixtures.length && (
                  <p className="text-[10px] text-muted-foreground text-center py-1">
                    +{group.fixtures.length - visibleFixtures.length} jogos abaixo ↓
                  </p>
                )}
              </motion.div>
            )}
          </div>
        );
      })}

    </div>
  );
}
