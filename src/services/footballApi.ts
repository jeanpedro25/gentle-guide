import { ApiFixture, LeagueConfig, LEAGUES, TeamStats, H2HFixture } from '@/types/fixture';
import { getDemoFixtures } from '@/data/demoFixtures';
import { format, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

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

const cache = new Map<string, CachedValue>();

// Track whether we're using real data or demo
let usingRealData = false;
let lastApiError = '';

export function isUsingRealData(): boolean {
  return usingRealData;
}

export function getLastApiError(): string {
  return lastApiError;
}

function getFixtureDateRange() {
  return {
    from: format(addDays(new Date(), -1), 'yyyy-MM-dd'),
    to: format(addDays(new Date(), 10), 'yyyy-MM-dd'),
  };
}

async function proxyFetch<T>(endpoint: string, params: Record<string, string | number>, options: FetchOptions = {}): Promise<T> {
  const { ttl = CONTEXT_CACHE_TTL, forceRefresh = false } = options;

  const cacheKey = `${endpoint}?${Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&')}`;

  if (forceRefresh) cache.delete(cacheKey);

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < cached.ttl) return cached.data as T;

  console.log('[Oracle] Fetching via proxy:', endpoint, params);

  const { data, error } = await supabase.functions.invoke('football-proxy', {
    body: { endpoint, params },
  });

  if (error) {
    console.error('[Oracle] Proxy error:', error);
    throw new Error(error.message || 'Proxy error');
  }

  if (data?.error) {
    console.error('[Oracle] API error:', data.error);
    lastApiError = data.error;
    throw new Error(data.error);
  }

  const response = data?.response ?? [];
  console.log(`[Oracle] ${endpoint} → ${response.length} results`);

  cache.set(cacheKey, { data: response, ts: Date.now(), ttl });
  return response as T;
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
  // Always true now since we use the proxy
  return true;
}

export async function fetchFixturesByLeague(
  league: LeagueConfig,
  options: { forceRefresh?: boolean } = {}
): Promise<ApiFixture[]> {
  const { from, to } = getFixtureDateRange();

  // Try the base season first, then -1
  const seasons = [league.season, league.season - 1];

  for (const season of seasons) {
    try {
      const fixtures = await proxyFetch<ApiFixture[]>(
        '/fixtures',
        { league: league.id, season, from, to },
        { ttl: FIXTURES_CACHE_TTL, forceRefresh: options.forceRefresh }
      );

      if (fixtures.length > 0) return fixtures;
    } catch (err) {
      console.warn(`[Oracle] Season ${season} for ${league.name} failed:`, err);
      // Continue to next season
    }
  }

  return [];
}

export async function fetchAllFixtures(
  options: { forceRefresh?: boolean } = {}
): Promise<{ league: LeagueConfig; fixtures: ApiFixture[] }[]> {
  lastApiError = '';

  try {
    const results = await Promise.allSettled(
      LEAGUES.map(async (league) => ({
        league,
        fixtures: await fetchFixturesByLeague(league, options),
      }))
    );

    // Log failures
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.warn(`[Oracle] ${LEAGUES[i].name} failed:`, r.reason?.message || r.reason);
      }
    });

    const successful = results
      .filter((r): r is PromiseFulfilledResult<{ league: LeagueConfig; fixtures: ApiFixture[] }> =>
        r.status === 'fulfilled'
      )
      .map((r) => r.value)
      .filter((r) => r.fixtures.length > 0);

    if (successful.length > 0) {
      usingRealData = true;
      return successful;
    }

    // All failed or returned 0 fixtures → demo mode
    console.warn('[Oracle] No real fixtures found, using demo data');
    usingRealData = false;
    return getDemoFixtures();
  } catch (err) {
    console.error('[Oracle] fetchAllFixtures error:', err);
    usingRealData = false;
    return getDemoFixtures();
  }
}

export async function fetchTeamStats(teamId: number, leagueId: number, season: number): Promise<TeamStats | null> {
  try {
    const data = await proxyFetch<TeamStats>(
      '/teams/statistics',
      { league: leagueId, season, team: teamId },
      { ttl: CONTEXT_CACHE_TTL }
    );
    return data ?? null;
  } catch {
    return null;
  }
}

export async function fetchH2H(homeId: number, awayId: number): Promise<H2HFixture[]> {
  try {
    return await proxyFetch<H2HFixture[]>(
      '/fixtures/headtohead',
      { h2h: `${homeId}-${awayId}`, last: 5 },
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
  const season = fixture.league.id <= 72 ? 2026 : 2025;
  const [homeStats, awayStats, h2h] = await Promise.all([
    fetchTeamStats(fixture.teams.home.id, fixture.league.id, season),
    fetchTeamStats(fixture.teams.away.id, fixture.league.id, season),
    fetchH2H(fixture.teams.home.id, fixture.teams.away.id),
  ]);

  return { homeStats, awayStats, h2h };
}
