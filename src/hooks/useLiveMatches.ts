import { useQuery } from '@tanstack/react-query';
import { fetchLiveMatches } from '@/services/footballApi';

export function useLiveMatches() {
  return useQuery({
    queryKey: ['fixtures', 'live'],
    queryFn: fetchLiveMatches,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}
