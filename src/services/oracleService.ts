import { OracleAnalysis, normalizeProbabilities } from '@/types/prediction';
import { ApiFixture, TeamStats, H2HFixture } from '@/types/fixture';
import { supabase } from '@/integrations/supabase/client';

interface MatchDataPayload {
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  round: string;
  date: string;
  homeForm: string;
  homeWins: number;
  homeDraws: number;
  homeLosses: number;
  homeGoalsFor: number;
  homeGoalsAgainst: number;
  awayForm: string;
  awayWins: number;
  awayDraws: number;
  awayLosses: number;
  awayGoalsFor: number;
  awayGoalsAgainst: number;
  h2hSummary: string;
}

function buildH2HSummary(h2h: H2HFixture[], homeTeam: string, awayTeam: string): string {
  if (!h2h || h2h.length === 0) return 'Sem dados de confronto direto.';

  return h2h
    .map((m) => {
      const home = m.teams.home.name;
      const away = m.teams.away.name;
      const date = new Date(m.fixture.date).toLocaleDateString('pt-BR');
      return `${home} ${m.goals.home ?? 0}x${m.goals.away ?? 0} ${away} (${date})`;
    })
    .join('\n');
}

function buildPayload(
  fixture: ApiFixture,
  homeStats: TeamStats | null,
  awayStats: TeamStats | null,
  h2h: H2HFixture[]
): MatchDataPayload {
  return {
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
    leagueName: fixture.league.name,
    round: fixture.league.round || '',
    date: fixture.fixture.date,
    homeForm: homeStats?.form || 'N/A',
    homeWins: homeStats?.fixtures?.wins?.total ?? 0,
    homeDraws: homeStats?.fixtures?.draws?.total ?? 0,
    homeLosses: homeStats?.fixtures?.loses?.total ?? 0,
    homeGoalsFor: homeStats?.goals?.for?.total?.total ?? 0,
    homeGoalsAgainst: homeStats?.goals?.against?.total?.total ?? 0,
    awayForm: awayStats?.form || 'N/A',
    awayWins: awayStats?.fixtures?.wins?.total ?? 0,
    awayDraws: awayStats?.fixtures?.draws?.total ?? 0,
    awayLosses: awayStats?.fixtures?.loses?.total ?? 0,
    awayGoalsFor: awayStats?.goals?.for?.total?.total ?? 0,
    awayGoalsAgainst: awayStats?.goals?.against?.total?.total ?? 0,
    h2hSummary: buildH2HSummary(h2h, fixture.teams.home.name, fixture.teams.away.name),
  };
}

export async function analyzeMatch(
  fixture: ApiFixture,
  homeStats: TeamStats | null,
  awayStats: TeamStats | null,
  h2h: H2HFixture[]
): Promise<OracleAnalysis> {
  const matchData = buildPayload(fixture, homeStats, awayStats, h2h);

  const { data, error } = await supabase.functions.invoke('oracle-analyze', {
    body: { matchData },
  });

  if (error) {
    console.error('[Oracle] Edge function error:', error);
    throw new Error(error.message || 'Erro ao chamar análise AI');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  // Normalize probabilities from AI (handles both 0-1 and 0-100 formats)
  const raw = data as OracleAnalysis;
  raw.probabilities = normalizeProbabilities(raw.probabilities);
  
  // Normalize score scenario probabilities too
  if (raw.scoreScenarios) {
    raw.scoreScenarios = raw.scoreScenarios.map(s => ({
      ...s,
      prob: s.prob > 1 ? s.prob : s.prob * 100, // ensure percentage format
    }));
  }
  if (raw.poisson?.mostLikelyScores) {
    // Normalize: if any prob > 1, they're already percentages
    const anyOver1 = raw.poisson.mostLikelyScores.some(s => s.prob > 1);
    if (!anyOver1) {
      // They're decimals, keep as-is (display code multiplies by 100)
    }
  }

  return raw;
}
