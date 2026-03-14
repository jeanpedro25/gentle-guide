import { ApiFixture, LeagueConfig, LEAGUES, TeamStats, H2HFixture } from '@/types/fixture';
import { getDemoFixtures } from '@/data/demoFixtures';
import { format, addDays } from 'date-fns';

const BASE_URL = 'https://v3.football.api-sports.io';

// Publishable API-Football key (free tier, client-side usage)
const API_FOOTBALL_KEY = '3ffd74d8f5b404975b2f3b24cb383a23';

function getApiKey(): string {
  return import.meta.env.VITE_FOOTBALL_API_KEY || API_FOOTBALL_KEY;
}

function getHeaders(): HeadersInit {
  return { 'x-apisports-key': getApiKey() };
}

// Simple in-memory cache (30 min TTL)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000;

async function cachedFetch<T>(url: string): Promise<T> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data as T;

  console.log('[Oracle] Fetching:', url);
  
  const res = await fetch(url, { headers: getHeaders() });
  
  if (!res.ok) {
    console.error('[Oracle] HTTP error:', res.status, res.statusText);
    throw new Error(`API-Football error: ${res.status}`);
  }
  
  const json = await res.json();
  console.log('[Oracle] Response for', url.split('?')[1]?.slice(0, 50), '→', json.results, 'results');
  
  if (json.errors && Object.keys(json.errors).length > 0) {
    const errMsg = Object.values(json.errors).join(', ');
    console.error('[Oracle] API error:', errMsg);
    throw new Error(`API-Football: ${errMsg}`);
  }

  cache.set(url, { data: json.response, ts: Date.now() });
  return json.response as T;
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

export async function fetchFixturesByLeague(league: LeagueConfig): Promise<ApiFixture[]> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const endDate = format(addDays(new Date(), 7), 'yyyy-MM-dd');
  
  return cachedFetch<ApiFixture[]>(
    `${BASE_URL}/fixtures?league=${league.id}&season=${league.season}&from=${today}&to=${endDate}`
  );
}

export async function fetchAllFixtures(): Promise<{ league: LeagueConfig; fixtures: ApiFixture[] }[]> {
  try {
    const results = await Promise.allSettled(
      LEAGUES.map(async (league) => ({
        league,
        fixtures: await fetchFixturesByLeague(league),
      }))
    );

    // Log failures
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.warn(`[Oracle] Failed to fetch ${LEAGUES[i].name}:`, r.reason?.message || r.reason);
      }
    });

    const successful = results
      .filter((r): r is PromiseFulfilledResult<{ league: LeagueConfig; fixtures: ApiFixture[] }> =>
        r.status === 'fulfilled'
      )
      .map((r) => r.value)
      .filter((r) => r.fixtures.length > 0);

    // If all API calls failed, fall back to demo data
    if (successful.length === 0 && results.every(r => r.status === 'rejected')) {
      console.warn('[Oracle] All API calls failed, using demo data');
      return getDemoFixtures();
    }

    return successful;
  } catch (err) {
    console.error('[Oracle] fetchAllFixtures error:', err);
    return getDemoFixtures();
  }
}

export async function fetchTeamStats(teamId: number, leagueId: number, season: number): Promise<TeamStats | null> {
  try {
    const data = await cachedFetch<TeamStats>(
      `${BASE_URL}/teams/statistics?league=${leagueId}&season=${season}&team=${teamId}`
    );
    return data ?? null;
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
    fetchTeamStats(fixture.teams.home.id, fixture.league.id, fixture.league.id <= 72 ? 2025 : 2024),
    fetchTeamStats(fixture.teams.away.id, fixture.league.id, fixture.league.id <= 72 ? 2025 : 2024),
    fetchH2H(fixture.teams.home.id, fixture.teams.away.id),
  ]);

  return { homeStats, awayStats, h2h };
}
