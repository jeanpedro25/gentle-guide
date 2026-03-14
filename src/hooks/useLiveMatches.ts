import { useQuery } from '@tanstack/react-query';
import { fetchLiveMatches } from '@/services/footballApi';

export function useLiveMatches() {
  return useQuery({
    queryKey: ['fixtures', 'live'],
    queryFn: fetchLiveMatches,
    refetchInterval: 60_000, // refresh every 60s
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
