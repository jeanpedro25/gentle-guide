import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, Star, Loader2 } from 'lucide-react';
import { ApiFixture } from '@/types/fixture';
import { MatchCard } from './MatchCard';
import { Progress } from '@/components/ui/progress';

const PAGE_SIZE = 20;

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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [collapsedLeagues, setCollapsedLeagues] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Flatten all fixtures for pagination
  const allFixtures = useMemo(() => grouped.flatMap(g => g.fixtures), [grouped]);
  const totalMatches = allFixtures.length;

  // Reset visible count when data changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [totalMatches]);

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

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < totalMatches) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, totalMatches));
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, totalMatches]);

  const toggleLeague = useCallback((league: string) => {
    setCollapsedLeagues(prev => {
      const next = new Set(prev);
      if (next.has(league)) next.delete(league);
      else next.add(league);
      return next;
    });
  }, []);

  const loadAll = useCallback(() => {
    setVisibleCount(totalMatches);
  }, [totalMatches]);

  // Build visible groups respecting pagination
  const { visibleGroups, shownCount } = useMemo(() => {
    let remaining = visibleCount;
    const result: { group: LeagueGroup; visibleFixtures: ApiFixture[] }[] = [];

    for (const group of grouped) {
      if (remaining <= 0) break;
      const take = Math.min(group.fixtures.length, remaining);
      result.push({
        group,
        visibleFixtures: group.fixtures.slice(0, take),
      });
      remaining -= take;
    }

    const shown = result.reduce((s, r) => s + r.visibleFixtures.length, 0);
    return { visibleGroups: result, shownCount: shown };
  }, [grouped, visibleCount]);

  const progressPct = totalMatches > 0 ? (shownCount / totalMatches) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Progress counter */}
      <div className="bg-card border border-border rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-foreground font-bold">{totalMatches} jogos encontrados</span>
          <span className="text-muted-foreground">Exibindo {shownCount}</span>
          {shownCount < totalMatches && (
            <button
              onClick={loadAll}
              className="text-primary font-bold hover:text-primary/80 transition-colors"
            >
              Carregar todos
            </button>
          )}
        </div>
        <Progress value={progressPct} className="h-2" />
        <p className="text-[10px] text-muted-foreground text-right">{shownCount}/{totalMatches}</p>
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

      {/* Sentinel for infinite scroll */}
      {shownCount < totalMatches && (
        <>
          <div ref={sentinelRef} className="h-1" />
          <div className="flex items-center justify-center py-4 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Carregando mais jogos...</span>
          </div>
        </>
      )}
    </div>
  );
}
