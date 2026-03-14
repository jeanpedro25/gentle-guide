import { ApiFixture, LeagueConfig, LEAGUES, TeamStats, H2HFixture } from '@/types/fixture';
import { getDemoFixtures } from '@/data/demoFixtures';
import { format, addDays } from 'date-fns';

const BASE_URL = 'https://v3.football.api-sports.io';

// Publishable API-Football key (free tier, client-side usage)
const API_FOOTBALL_KEY = '3ffd74d8f5b404975b2f3b24cb383a23';

const FIXTURES_CACHE_TTL = 2 * 60 * 1000;
const CONTEXT_CACHE_TTL = 30 * 60 * 1000;

interface CachedValue {
  data: unknown;
  ts: number;
  ttl: number;
}

interface FetchOptions {
  ttl?: number;
  forceRefresh?: boolean;
}

function getApiKey(): string {
  return import.meta.env.VITE_FOOTBALL_API_KEY || API_FOOTBALL_KEY;
}

function getHeaders(): HeadersInit {
  return { 'x-apisports-key': getApiKey() };
}

const cache = new Map<string, CachedValue>();

function getFixtureDateRange() {
  return {
    from: format(addDays(new Date(), -1), 'yyyy-MM-dd'),
    to: format(addDays(new Date(), 10), 'yyyy-MM-dd'),
  };
}

function getSeasonCandidates(baseSeason: number): number[] {
  return [...new Set([baseSeason, baseSeason + 1, baseSeason - 1])];
}

async function cachedFetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { ttl = CONTEXT_CACHE_TTL, forceRefresh = false } = options;

  if (forceRefresh) cache.delete(url);

  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < cached.ttl) return cached.data as T;

  const res = await fetch(url, { headers: getHeaders() });

  if (!res.ok) {
    throw new Error(`API-Football error: ${res.status}`);
  }

  const json = await res.json();

  if (json.errors && Object.keys(json.errors).length > 0) {
    const errMsg = Object.values(json.errors).join(', ');
    throw new Error(`API-Football: ${errMsg}`);
  }

  cache.set(url, { data: json.response, ts: Date.now(), ttl });
  return json.response as T;
}

export function clearFootballCache(pathIncludes?: string): void {
  if (!pathIncludes) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.includes(pathIncludes)) cache.delete(key);
  }
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

export async function fetchFixturesByLeague(
  league: LeagueConfig,
  options: { forceRefresh?: boolean } = {}
): Promise<ApiFixture[]> {
  const { from, to } = getFixtureDateRange();

  for (const season of getSeasonCandidates(league.season)) {
    const fixtures = await cachedFetch<ApiFixture[]>(
      `${BASE_URL}/fixtures?league=${league.id}&season=${season}&from=${from}&to=${to}`,
      { ttl: FIXTURES_CACHE_TTL, forceRefresh: options.forceRefresh }
    );

    if (fixtures.length > 0) return fixtures;
  }

  return [];
}

export async function fetchAllFixtures(
  options: { forceRefresh?: boolean } = {}
): Promise<{ league: LeagueConfig; fixtures: ApiFixture[] }[]> {
  try {
    const results = await Promise.allSettled(
      LEAGUES.map(async (league) => ({
        league,
        fixtures: await fetchFixturesByLeague(league, options),
      }))
    );

    const successful = results
      .filter((r): r is PromiseFulfilledResult<{ league: LeagueConfig; fixtures: ApiFixture[] }> =>
        r.status === 'fulfilled'
      )
      .map((r) => r.value)
      .filter((r) => r.fixtures.length > 0);

    if (successful.length === 0 && results.every((r) => r.status === 'rejected')) {
      return getDemoFixtures();
    }

    return successful;
  } catch {
    return getDemoFixtures();
  }
}

export async function fetchTeamStats(teamId: number, leagueId: number, season: number): Promise<TeamStats | null> {
  try {
    const data = await cachedFetch<TeamStats>(
      `${BASE_URL}/teams/statistics?league=${leagueId}&season=${season}&team=${teamId}`,
      { ttl: CONTEXT_CACHE_TTL }
    );
    return data ?? null;
  } catch {
    return null;
  }
}

export async function fetchH2H(homeId: number, awayId: number): Promise<H2HFixture[]> {
  try {
    return await cachedFetch<H2HFixture[]>(
      `${BASE_URL}/fixtures/headtohead?h2h=${homeId}-${awayId}&last=5`,
      { ttl: CONTEXT_CACHE_TTL }
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
    fetchTeamStats(fixture.teams.home.id, fixture.league.id, fixture.league.id <= 72 ? 2025 : 2024),
    fetchTeamStats(fixture.teams.away.id, fixture.league.id, fixture.league.id <= 72 ? 2025 : 2024),
    fetchH2H(fixture.teams.home.id, fixture.teams.away.id),
  ]);

  return { homeStats, awayStats, h2h };
}
