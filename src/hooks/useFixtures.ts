import { useQuery } from '@tanstack/react-query';
import { fetchTodayMatches, fetchTomorrowMatches, fetchWeekMatches } from '@/services/footballApi';

// Never discard cached fixture data — serve stale rather than empty
const FIXTURES_STALE_TIME = Infinity;

export function useTodayFixtures() {
  return useQuery({
    queryKey: ['fixtures', 'today'],
    queryFn: fetchTodayMatches,
    staleTime: FIXTURES_STALE_TIME,
    gcTime: 24 * 60 * 60 * 1000,      // keep in memory 24h
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    // If query returns data but later fails, keep showing old data
    placeholderData: (prev) => prev,
  });
}

export function useTomorrowFixtures() {
  return useQuery({
    queryKey: ['fixtures', 'tomorrow'],
    queryFn: fetchTomorrowMatches,
    staleTime: FIXTURES_STALE_TIME,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    placeholderData: (prev) => prev,
  });
}

export function useWeekFixtures() {
  return useQuery({
    queryKey: ['fixtures', 'week'],
    queryFn: fetchWeekMatches,
    staleTime: FIXTURES_STALE_TIME,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    placeholderData: (prev) => prev,
  });
}
