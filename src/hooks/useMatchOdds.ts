/**
 * Hook para buscar odds reais + calcular EV de um jogo específico.
 * Integra The Odds API + nosso motor Poisson.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  LEAGUE_SPORT_MAP,
  findOddsForMatch,
  getOddsRecommendation,
  OddsEvent,
} from '@/services/oddsApiService';

interface UseMatchOddsParams {
  homeTeam: string;
  awayTeam: string;
  leagueId?: string;   // nosso ID, ex: "brasileirao-a"
  leagueName?: string; // nome da liga para fallback
  // Probabilidades do nosso Poisson (0-1)
  homeProb?: number;
  drawProb?: number;
  awayProb?: number;
  enabled?: boolean;
}

export function useMatchOdds({
  homeTeam,
  awayTeam,
  leagueId,
  leagueName,
  homeProb = 0,
  drawProb = 0,
  awayProb = 0,
  enabled = true,
}: UseMatchOddsParams) {
  // Determina qual sport key usar
  const sportKey = useMemo(() => {
    if (leagueId && LEAGUE_SPORT_MAP[leagueId]) return LEAGUE_SPORT_MAP[leagueId];
    // Fallback por nome
    if (leagueName) {
      const nameLower = leagueName.toLowerCase();
      if (nameLower.includes('brasileiro') || nameLower.includes('serie a')) return 'soccer_brazil_campeonato';
      if (nameLower.includes('champions')) return 'soccer_uefa_champs_league';
      if (nameLower.includes('premier')) return 'soccer_epl';
      if (nameLower.includes('la liga') || nameLower.includes('laliga')) return 'soccer_spain_la_liga';
      if (nameLower.includes('serie a')) return 'soccer_italy_serie_a';
      if (nameLower.includes('bundesliga')) return 'soccer_germany_bundesliga';
      if (nameLower.includes('ligue')) return 'soccer_france_ligue_one';
    }
    return null;
  }, [leagueId, leagueName]);

  const query = useQuery<OddsEvent | null>({
    queryKey: ['match-odds', sportKey, homeTeam, awayTeam],
    queryFn: () => {
      if (!sportKey) return Promise.resolve(null);
      return findOddsForMatch(homeTeam, awayTeam, sportKey);
    },
    enabled: enabled && !!sportKey && !!homeTeam && !!awayTeam,
    staleTime: 10 * 60 * 1000,   // 10 min
    gcTime: 30 * 60 * 1000,       // 30 min
    retry: false,
    refetchOnWindowFocus: false,
  });

  const odds = query.data ?? null;

  // Recomendação de EV real (só quando temos probabilidades Poisson)
  const recommendation = useMemo(() => {
    if (!odds || homeProb + drawProb + awayProb < 0.5) return null;
    return getOddsRecommendation(homeProb, drawProb, awayProb, odds);
  }, [odds, homeProb, drawProb, awayProb]);

  return {
    odds,
    recommendation,
    isLoading: query.isLoading,
    isError: query.isError,
    sportKey,
  };
}
