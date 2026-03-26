import { ApiFixture, LeagueConfig, LEAGUES } from '@/types/fixture';
import { supabase } from '@/integrations/supabase/client';
import { cachedFetch, clearApiCache, type CacheDataType } from '@/services/apiService';

// ── Legacy exports for compat ──
let lastApiError = '';

export function isUsingRealData(): boolean { return true; }
export function getLastApiError(): string { return lastApiError; }

// ── API-Football v3 response types ──

interface ApiFootballResponse<T = unknown> {
  get: string;
  parameters: Record<string, string>;
  errors: Record<string, string> | string[];
  results: number;
  paging: { current: number; total: number };
  response: T[];
}

// API-Football returns fixtures in this exact format (matches our ApiFixture type)
type ApiFootballFixture = ApiFixture;

function hasApiErrors(response: ApiFootballResponse): boolean {
  if (Array.isArray(response.errors)) return response.errors.length > 0;
  return Object.keys(response.errors || {}).length > 0;
}

function getApiErrorMessage(response: ApiFootballResponse): string {
  if (Array.isArray(response.errors) && response.errors.length > 0) return response.errors[0];
  const errors = response.errors as Record<string, string>;
  const firstKey = Object.keys(errors)[0];
  return firstKey ? errors[firstKey] : 'Unknown API error';
}

// ── Core API fetch — ALL calls go through cachedFetch via Edge Function ──

async function rawApiFootballFetch<T = unknown>(
  endpoint: string,
  params?: Record<string, string>
): Promise<ApiFootballResponse<T>> {
  console.log('[Oracle] API-Football →', endpoint, params || '');

  // Tenta busca direta primeiro (Bypass Proxy) para garantir funcionamento imediato no localhost
  try {
    const apiKey = import.meta.env.VITE_FOOTBALL_API_KEY || '7705af77ba8bb13fb97e0a4878c93dc0';
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const queryParams = new URLSearchParams(params || {});
    const url = `https://v3.football.api-sports.io/${cleanEndpoint}?${queryParams.toString()}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-apisports-key": apiKey,
      },
    });

    if (res.ok) {
      const directData = await res.json();
      const directErrors = directData?.errors;
      const hasDirectErrors = directErrors && (Array.isArray(directErrors) ? directErrors.length > 0 : Object.keys(directErrors).length > 0);
      
      if (!hasDirectErrors) {
        console.log('[Oracle] ✅ Direct API fetch success (Bypassing proxy)');
        return directData as ApiFootballResponse<T>;
      }
      console.warn('[Oracle] Direct fetch returned API errors, trying proxy...', directErrors);
    }
  } catch (directErr) {
    console.warn('[Oracle] Direct fetch error (CORS?), falling back to proxy...', directErr);
  }

  const { data, error } = await supabase.functions.invoke('football-proxy', {
    body: { endpoint, params },
  });

  if (error) {
    lastApiError = error.message || 'Proxy error: configure server API key';
    throw new Error(lastApiError);
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const errorMessage = String((data as { error?: unknown }).error || 'Erro na API');
    lastApiError = errorMessage;
    throw new Error(errorMessage);
  }

  const response = data as ApiFootballResponse<T>;

  if (hasApiErrors(response)) {
    const msg = getApiErrorMessage(response);
    lastApiError = msg;
    // Rate limit: throw so cachedFetch stale fallback can activate
    if (/limit|too many|quota/i.test(msg)) {
      console.warn('[Oracle] 🚫 Rate limit atingido. cachedFetch vai servir cache obsoleto.');
      throw new ApiLimitError(msg);
    }
    console.warn('[Oracle] API error:', msg);
  }

  lastApiError = '';
  return response;
}

class ApiLimitError extends Error {
  constructor(message: string) { super(message); this.name = 'ApiLimitError'; }
}

function isApiLimitError(error: unknown): boolean {
  return error instanceof ApiLimitError;
}

/**
 * Fetch from API-Football with full caching pipeline:
 * Memory → Supabase DB → API call → save everywhere
 */
async function apiFootballFetch<T = unknown>(
  endpoint: string,
  params?: Record<string, string>,
  tipo: CacheDataType = 'jogos',
  priority: 'high' | 'medium' | 'low' | 'minimum' = 'medium',
): Promise<ApiFootballResponse<T>> {
  const cacheKey = `apifootball|${endpoint}|${JSON.stringify(params || {})}`;

  return cachedFetch<ApiFootballResponse<T>>({
    cacheKey,
    tipo,
    priority,
    fetchFn: () => rawApiFootballFetch<T>(endpoint, params),
  });
}

export function clearFootballCache(pathIncludes?: string): void {
  clearApiCache(pathIncludes ? `apifootball|${pathIncludes}` : undefined);
}

export function hasApiKey(): boolean {
  return true;
}

// ── Date helpers ──

export const BRAZIL_TIMEZONE = 'America/Manaus';

function getBrazilDateString(offset = 0): string {
  const now = new Date();
  now.setDate(now.getDate() + offset);
  return now.toLocaleDateString('en-CA', { timeZone: BRAZIL_TIMEZONE });
}

export function formatBrazilTime(dateStr: string, _timeStr?: string): string {
  if (!dateStr) return '';
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getRelativeDayLabel(dateStr: string): 'HOJE' | 'ONTEM' | 'AMANHÃ' | null {
  if (!dateStr) return null;
  const today = getBrazilDateString(0);
  const yesterday = getBrazilDateString(-1);
  const tomorrow = getBrazilDateString(1);

  const eventDate = dateStr.slice(0, 10);
  if (eventDate === today) return 'HOJE';
  if (eventDate === yesterday) return 'ONTEM';
  if (eventDate === tomorrow) return 'AMANHÃ';
  return null;
}

// ── Status display ──

export function toStatusShort(status: string, hasScore: boolean): string {
  const normalized = status.toUpperCase().trim();
  if (['MATCH FINISHED', 'FT', 'AET', 'AP', 'PEN'].includes(normalized)) return 'FT';
  if (['1H'].includes(normalized)) return '1H';
  if (['HT'].includes(normalized)) return 'HT';
  if (['2H'].includes(normalized)) return '2H';
  if (['ET', 'LIVE', 'IN PLAY'].includes(normalized)) return 'LIVE';
  if (['POSTPONED', 'PST', 'POST'].includes(normalized)) return 'PST';
  if (['CANCELLED', 'CANC'].includes(normalized)) return 'CAN';
  return hasScore ? 'FT' : 'NS';
}

export function getStatusDisplay(statusShort: string): { label: string; color: string; pulse: boolean } {
  switch (statusShort) {
    case '1H': return { label: '1º TEMPO 🔴', color: 'text-red-500', pulse: true };
    case 'HT': return { label: 'INTERVALO ⏸️', color: 'text-yellow-500', pulse: false };
    case '2H': return { label: '2º TEMPO 🔴', color: 'text-red-500', pulse: true };
    case 'LIVE': return { label: 'AO VIVO 🔴', color: 'text-red-500', pulse: true };
    case 'FT': return { label: 'ENCERRADO', color: 'text-muted-foreground', pulse: false };
    case 'AET': return { label: 'APÓS PRORROG.', color: 'text-muted-foreground', pulse: false };
    case 'PEN': return { label: 'PÊNALTIS 🔴', color: 'text-red-500', pulse: true };
    case 'PST': return { label: 'ADIADO', color: 'text-orange-500', pulse: false };
    case 'CAN': return { label: 'CANCELADO', color: 'text-orange-500', pulse: false };
    default: return { label: 'EM BREVE', color: 'text-oracle-win', pulse: true };
  }
}

// ── Live matches ──

export interface LiveMatchData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeBadge: string;
  awayBadge: string;
  homeScore: string | null;
  awayScore: string | null;
  status: string;
  league: string;
  leagueId?: number;
  leagueBadge: string;
  time: string;
  venue: string;
}

export async function fetchLiveMatches(): Promise<LiveMatchData[]> {
  try {
    const response = await apiFootballFetch<ApiFootballFixture>('/fixtures', { live: 'all' }, 'livescores', 'high');
    const fixtures = response.response.map(normalizeFixture);

    return fixtures
      .map(fixture => ({
        id: String(fixture.fixture.id),
        homeTeam: fixture.teams.home.name,
        awayTeam: fixture.teams.away.name,
        homeBadge: fixture.teams.home.logo || '/placeholder.svg',
        awayBadge: fixture.teams.away.logo || '/placeholder.svg',
        homeScore: fixture.goals.home !== null ? String(fixture.goals.home) : null,
        awayScore: fixture.goals.away !== null ? String(fixture.goals.away) : null,
        status: fixture.fixture.status.short,
        league: fixture.league.name,
        leagueId: fixture.league.id,
        leagueBadge: fixture.league.logo || '',
        time: formatBrazilTime(fixture.fixture.date),
        venue: '',
      }) satisfies LiveMatchData)
      .filter(match => ['LIVE', '1H', '2H', 'HT', 'PEN', 'ET'].includes(match.status))
      .sort((a, b) => a.league.localeCompare(b.league));
  } catch (err) {
    lastApiError = err instanceof Error ? err.message : 'Erro ao buscar jogos ao vivo.';
    console.error('[Oracle] fetchLiveMatches error:', err);
    return [];
  }
}

// ── Fixtures by date ──

// Helper: get stale cache key for a date's fixtures
function getFixtureCacheKey(date: string) {
  return `apifootball|/fixtures|${JSON.stringify({ date })}`;
}

export async function fetchTodayMatches(): Promise<ApiFixture[]> {
  try {
    return await fetchMatchesByDate(getBrazilDateString(0));
  } catch (err) {
    // API limit hit — try stale localStorage
    const { getStaleLsCache } = await import('@/services/apiService');
    const stale = getStaleLsCache(getFixtureCacheKey(getBrazilDateString(0)));
    if (stale?.response) {
      console.info('[Oracle] ✅ Servindo jogos de HOJE do cache obsoleto (API limit).');
      return (stale.response as ApiFootballFixture[])
        .map(normalizeFixture)
        .filter(f => !['CANC', 'ABD', 'AWD', 'WO'].includes(f.fixture.status.short));
    }
    console.error('[Oracle] fetchTodayMatches: sem cache disponível.', err);
    return [];
  }
}

export async function fetchTomorrowMatches(): Promise<ApiFixture[]> {
  try {
    return await fetchMatchesByDate(getBrazilDateString(1));
  } catch (err) {
    const { getStaleLsCache } = await import('@/services/apiService');
    const stale = getStaleLsCache(getFixtureCacheKey(getBrazilDateString(1)));
    if (stale?.response) {
      console.info('[Oracle] ✅ Servindo jogos de AMANHÃ do cache obsoleto (API limit).');
      return (stale.response as ApiFootballFixture[])
        .map(normalizeFixture)
        .filter(f => !['CANC', 'ABD', 'AWD', 'WO'].includes(f.fixture.status.short));
    }
    return [];
  }
}

export async function fetchWeekMatches(): Promise<ApiFixture[]> {
  const dates: string[] = [];
  for (let i = 2; i <= 7; i++) {
    dates.push(getBrazilDateString(i));
  }

  const allFixtures: ApiFixture[] = [];
  const seenIds = new Set<number>();

  for (const date of dates) {
    try {
      const fixtures = await fetchMatchesByDate(date);
      for (const f of fixtures) {
        if (!seenIds.has(f.fixture.id)) {
          seenIds.add(f.fixture.id);
          allFixtures.push(f);
        }
      }
    } catch (err) {
      if (isApiLimitError(err)) throw err;
    }
  }

  return allFixtures.sort((a, b) => a.fixture.timestamp - b.fixture.timestamp);
}

export async function fetchFixtureById(fixtureId: number): Promise<ApiFixture | null> {
  try {
    const response = await apiFootballFetch<ApiFootballFixture>(
      '/fixtures',
      { id: String(fixtureId) },
      'jogos',
      'high'
    );
    const fixture = response.response[0];
    return fixture ? normalizeFixture(fixture) : null;
  } catch (err) {
    console.warn('[Oracle] fetchFixtureById failed:', err);
    return null;
  }
}

async function fetchMatchesByDate(date: string): Promise<ApiFixture[]> {
  try {
    const response = await apiFootballFetch<ApiFootballFixture>(
      '/fixtures',
      { date },
      'jogos',
      'medium'
    );
    const fixtures = response.response.map(normalizeFixture);

    return fixtures
      .filter(f => !['CANC', 'ABD', 'AWD', 'WO'].includes(f.fixture.status.short))
      .sort((a, b) => a.fixture.timestamp - b.fixture.timestamp);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao buscar jogos.';
    lastApiError = msg;
    // ⚠️ Do NOT swallow ApiLimitError — let the caller show stale cache or error state
    if (err instanceof ApiLimitError) throw err;
    console.error(`[Oracle] fetchMatchesByDate(${date}) error:`, err);
    return [];
  }
}

/**
 * Normalize API-Football fixture to ensure consistent format.
 * API-Football already returns data matching our ApiFixture type,
 * but we ensure defaults for missing fields.
 */
function normalizeFixture(f: ApiFootballFixture): ApiFixture {
  return {
    fixture: {
      id: f.fixture.id,
      date: f.fixture.date,
      timestamp: f.fixture.timestamp,
      status: {
        short: f.fixture.status.short || 'NS',
        long: f.fixture.status.long || 'Not Started',
      },
    },
    league: {
      id: f.league.id,
      name: f.league.name,
      country: f.league.country || '',
      logo: f.league.logo || '',
      round: f.league.round || '',
    },
    teams: {
      home: {
        id: f.teams.home.id,
        name: f.teams.home.name,
        logo: f.teams.home.logo || '/placeholder.svg',
        winner: f.teams.home.winner ?? null,
      },
      away: {
        id: f.teams.away.id,
        name: f.teams.away.name,
        logo: f.teams.away.logo || '/placeholder.svg',
        winner: f.teams.away.winner ?? null,
      },
    },
    goals: {
      home: f.goals.home ?? null,
      away: f.goals.away ?? null,
    },
  };
}

// ── League fixtures ──

export async function fetchFixturesByLeague(
  league: LeagueConfig,
  options: { forceRefresh?: boolean } = {}
): Promise<ApiFixture[]> {
  if (options.forceRefresh) {
    clearFootballCache('fixtures');
  }

  try {
    const response = await apiFootballFetch<ApiFootballFixture>(
      '/fixtures',
      { league: String(league.id), season: String(league.season) },
      'liga',
      'low'
    );
    return response.response
      .map(normalizeFixture)
      .sort((a, b) => a.fixture.timestamp - b.fixture.timestamp);
  } catch (err) {
    console.warn(`[Oracle] ${league.name} failed:`, err);
    return [];
  }
}

// ── All fixtures ──

const LEAGUE_BATCH_SIZE = 4;

export async function fetchAllFixtures(
  options: { forceRefresh?: boolean } = {}
): Promise<{ league: LeagueConfig; fixtures: ApiFixture[] }[]> {
  lastApiError = '';

  try {
    const successful: { league: LeagueConfig; fixtures: ApiFixture[] }[] = [];

    for (let i = 0; i < LEAGUES.length; i += LEAGUE_BATCH_SIZE) {
      const batch = LEAGUES.slice(i, i + LEAGUE_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async league => ({
          league,
          fixtures: await fetchFixturesByLeague(league, options),
        }))
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.fixtures.length > 0) {
          successful.push(result.value);
        }
      }
    }

    return successful;
  } catch (err) {
    console.error('[Oracle] fetchAllFixtures error:', err);
    return [];
  }
}

// ── Odds ──

export interface MatchOdds {
  home: number;
  draw: number;
  away: number;
  bookmaker: string;
  updated: string;
}

/**
 * Odds API does not expose fixture-level odds in this integration yet.
 * Returns null for now.
 */
export async function fetchMatchOdds(fixtureId: number): Promise<MatchOdds | null> {
  try {
    console.warn('[Oracle] odds-api match odds not available for fixture', fixtureId);
    return null;
  } catch (err) {
    console.warn('[Oracle] fetchMatchOdds error:', err);
    return null;
  }
}

// ── Team stats (not available with Odds API) ──

export interface TeamStats {
  form: string;
  fixtures: {
    wins: { total: number };
    draws: { total: number };
    loses: { total: number };
  };
  goals: {
    for: { total: { total: number } };
    against: { total: { total: number } };
  };
}

export interface H2HFixture {
  fixture: { date: string };
  teams: {
    home: { id: number; name: string; winner: boolean | null };
    away: { id: number; name: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
}

// ── Match context (stats + h2h) ──

export interface MatchContext {
  fixture: ApiFixture;
  homeStats: TeamStats | null;
  awayStats: TeamStats | null;
  h2h: H2HFixture[];
}

/**
 * Fetch full match context: head-to-head history.
 * Team stats are not available on the free plan, so we return null.
 */
export async function fetchMatchContext(fixture: ApiFixture): Promise<MatchContext> {
  let h2h: H2HFixture[] = [];

  try {
    h2h = [];
  } catch (err) {
    console.warn('[Oracle] H2H fetch failed:', err);
  }

  return {
    fixture,
    homeStats: null,
    awayStats: null,
    h2h,
  };
}
