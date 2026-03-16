import { useQuery } from '@tanstack/react-query';
import { clearFootballCache, fetchAllFixtures, fetchFixturesByLeague, fetchTodayMatches } from '@/services/footballApi';
import { LeagueConfig, ApiFixture } from '@/types/fixture';

const FIXTURES_STALE_TIME = 2 * 60 * 1000;

export function useAllFixtures(enabled = true) {
  return useQuery({
    queryKey: ['fixtures', 'all'],
    queryFn: () => fetchAllFixtures(),
    enabled,
    staleTime: FIXTURES_STALE_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}

export function useLeagueFixtures(league: LeagueConfig | null) {
  return useQuery({
    queryKey: ['fixtures', league?.id],
    queryFn: () => (league ? fetchFixturesByLeague(league) : Promise.resolve([])),
    enabled: !!league,
    staleTime: FIXTURES_STALE_TIME,
    retry: false,
  });
}

export function useTodayFixtures() {
  return useQuery({
    queryKey: ['fixtures', 'today'],
    queryFn: fetchTodayMatches,
    staleTime: FIXTURES_STALE_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}

export function useFilteredFixtures(selectedLeagueId: number | null, enabled = true) {
  const allQuery = useAllFixtures(enabled);

  const fixtures: { league: LeagueConfig; fixtures: ApiFixture[] }[] = allQuery.data ?? [];

  const filtered = (selectedLeagueId
    ? fixtures.filter((g) => g.league.id === selectedLeagueId)
    : fixtures
  ).map(group => ({
    ...group,
    fixtures: group.fixtures.filter(f => {
      const s = f.fixture.status.short;
      // Exclude finished matches
      return s !== 'FT' && s !== 'AET' && s !== 'PEN';
    }),
  })).filter(group => group.fixtures.length > 0);

  return {
    data: filtered,
    isLoading: allQuery.isLoading,
    isError: allQuery.isError,
    error: allQuery.error,
    refetch: async () => {
      clearFootballCache();
      return allQuery.refetch();
    },
  };
}
