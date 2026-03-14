import { useQuery } from '@tanstack/react-query';
import { fetchAllFixtures, fetchFixturesByLeague } from '@/services/footballApi';
import { LeagueConfig, ApiFixture } from '@/types/fixture';

export function useAllFixtures() {
  return useQuery({
    queryKey: ['fixtures', 'all'],
    queryFn: fetchAllFixtures,
    staleTime: 30 * 60 * 1000,
    retry: 2,
  });
}

export function useLeagueFixtures(league: LeagueConfig | null) {
  return useQuery({
    queryKey: ['fixtures', league?.id],
    queryFn: () => (league ? fetchFixturesByLeague(league) : Promise.resolve([])),
    enabled: !!league,
    staleTime: 30 * 60 * 1000,
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
    refetch: allQuery.refetch,
  };
}
