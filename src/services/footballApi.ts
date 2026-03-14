import { ApiFixture, LeagueConfig, LEAGUES, TeamStats, H2HFixture } from '@/types/fixture';

const BASE_URL = 'https://v3.football.api-sports.io';

function getHeaders(): HeadersInit {
  const key = import.meta.env.VITE_FOOTBALL_API_KEY;
  if (!key) throw new Error('VITE_FOOTBALL_API_KEY não configurada');
  return { 'x-apisports-key': key };
}

// Simple in-memory cache (30 min TTL)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000;

async function cachedFetch<T>(url: string): Promise<T> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data as T;

  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error(`API-Football error: ${res.status}`);
  const json = await res.json();
  
  if (json.errors && Object.keys(json.errors).length > 0) {
    const errMsg = Object.values(json.errors).join(', ');
    throw new Error(`API-Football: ${errMsg}`);
  }

  cache.set(url, { data: json.response, ts: Date.now() });
  return json.response as T;
}

export async function fetchFixturesByLeague(league: LeagueConfig): Promise<ApiFixture[]> {
  return cachedFetch<ApiFixture[]>(
    `${BASE_URL}/fixtures?next=30&league=${league.id}&season=${league.season}`
  );
}

export async function fetchAllFixtures(): Promise<{ league: LeagueConfig; fixtures: ApiFixture[] }[]> {
  const results = await Promise.allSettled(
    LEAGUES.map(async (league) => ({
      league,
      fixtures: await fetchFixturesByLeague(league),
    }))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<{ league: LeagueConfig; fixtures: ApiFixture[] }> =>
      r.status === 'fulfilled'
    )
    .map((r) => r.value)
    .filter((r) => r.fixtures.length > 0);
}

export async function fetchTeamStats(teamId: number, leagueId: number, season: number): Promise<TeamStats | null> {
  try {
    const data = await cachedFetch<{ statistics: TeamStats }[]>(
      `${BASE_URL}/teams/statistics?league=${leagueId}&season=${season}&team=${teamId}`
    );
    // API returns the stats object directly, not in an array
    return (data as unknown as TeamStats) ?? null;
  } catch {
    return null;
  }
}

export async function fetchH2H(homeId: number, awayId: number): Promise<H2HFixture[]> {
  try {
    return await cachedFetch<H2HFixture[]>(
      `${BASE_URL}/fixtures/headtohead?h2h=${homeId}-${awayId}&last=5`
    );
  } catch {
    return [];
  }
}

export async function fetchMatchContext(fixture: ApiFixture): Promise<{
  homeStats: TeamStats | null;
  awayStats: TeamStats | null;
  h2h: H2HFixture[];
}> {
  const [homeStats, awayStats, h2h] = await Promise.all([
    fetchTeamStats(fixture.teams.home.id, fixture.league.id, 2024),
    fetchTeamStats(fixture.teams.away.id, fixture.league.id, 2024),
    fetchH2H(fixture.teams.home.id, fixture.teams.away.id),
  ]);

  return { homeStats, awayStats, h2h };
}
