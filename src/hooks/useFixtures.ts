import { useQuery } from '@tanstack/react-query';
import { clearFootballCache, fetchAllFixtures, fetchFixturesByLeague } from '@/services/footballApi';
import { LeagueConfig, ApiFixture } from '@/types/fixture';

const FIXTURES_STALE_TIME = 2 * 60 * 1000;

export function useAllFixtures() {
  return useQuery({
    queryKey: ['fixtures', 'all'],
    queryFn: () => fetchAllFixtures(),
    staleTime: FIXTURES_STALE_TIME,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
  });
}

export function useLeagueFixtures(league: LeagueConfig | null) {
  return useQuery({
    queryKey: ['fixtures', league?.id],
    queryFn: () => (league ? fetchFixturesByLeague(league) : Promise.resolve([])),
    enabled: !!league,
    staleTime: FIXTURES_STALE_TIME,
    retry: 2,
  });
}

export function useFilteredFixtures(selectedLeagueId: number | null) {
  const allQuery = useAllFixtures();

  const fixtures: { league: LeagueConfig; fixtures: ApiFixture[] }[] = allQuery.data ?? [];

  const filtered = selectedLeagueId
    ? fixtures.filter((g) => g.league.id === selectedLeagueId)
    : fixtures;

  return {
    data: filtered,
    isLoading: allQuery.isLoading,
    isError: allQuery.isError,
    error: allQuery.error,
    refetch: async () => {
      clearFootballCache('/fixtures?');
      return allQuery.refetch();
    },
  };
}
