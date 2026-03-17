import { useQuery } from '@tanstack/react-query';
import { clearFootballCache, fetchTodayMatches, fetchTomorrowMatches, fetchWeekMatches } from '@/services/footballApi';

const FIXTURES_STALE_TIME = 2 * 60 * 1000;

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

export function useTomorrowFixtures() {
  return useQuery({
    queryKey: ['fixtures', 'tomorrow'],
    queryFn: fetchTomorrowMatches,
    staleTime: FIXTURES_STALE_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}

export function useWeekFixtures() {
  return useQuery({
    queryKey: ['fixtures', 'week'],
    queryFn: fetchWeekMatches,
    staleTime: FIXTURES_STALE_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}
