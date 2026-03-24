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

interface ApiFootballOddsValue {
  value: string;
  odd: string;
}

interface ApiFootballOddsBet {
  id: number;
  name: string;
  values: ApiFootballOddsValue[];
}

interface ApiFootballBookmaker {
  id: number;
  name: string;
  bets: ApiFootballOddsBet[];
}

interface ApiFootballOddsResponse {
  league: { id: number; name: string };
  fixture: { id: number; date: string };
  update: string;
  bookmakers: ApiFootballBookmaker[];
}

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

  const clientKey =
    import.meta.env.VITE_FOOTBALL_API_KEY ||
    import.meta.env.VITE_ODDS_API_KEY ||
    import.meta.env.VITE_API_FOOTBALL_KEY;

  const { data, error } = await supabase.functions.invoke('football-proxy', {
    body: { endpoint, params, apiKey: clientKey },
  });

  if (error) {
    if (!clientKey) {
      throw new Error(error.message || 'Proxy error: configure VITE_ODDS_API_KEY');
    }

    console.warn('[Oracle] football-proxy unavailable, falling back to client key');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const queryParams = new URLSearchParams(params || {});
    const url = `https://v3.football.api-sports.io/${cleanEndpoint}?${queryParams.toString()}`;
    const res = await fetch(url, {
      headers: {
        'x-apisports-key': clientKey,
      },
    });
    const response = (await res.json()) as ApiFootballResponse<T>;

    if (!res.ok) {
      const msg = getApiErrorMessage(response);
      lastApiError = msg || `HTTP ${res.status}`;
      if (/limit|too many|quota/i.test(lastApiError)) {
        throw new ApiLimitError(lastApiError);
      }
      throw new Error(lastApiError || 'API error');
    }

    return response;
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const errorMessage = String((data as { error?: unknown }).error || 'Erro na API');
    lastApiError = errorMessage;
    if (!clientKey) {
      throw new Error(errorMessage);
    }
    console.warn('[Oracle] football-proxy retornou erro, usando client key');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const queryParams = new URLSearchParams(params || {});
    const url = `https://v3.football.api-sports.io/${cleanEndpoint}?${queryParams.toString()}`;
    const res = await fetch(url, {
      headers: {
        'x-apisports-key': clientKey,
      },
    });
    const response = (await res.json()) as ApiFootballResponse<T>;

    if (!res.ok) {
      const msg = getApiErrorMessage(response);
      lastApiError = msg || `HTTP ${res.status}`;
      if (/limit|too many|quota/i.test(lastApiError)) {
        throw new ApiLimitError(lastApiError);
      }
      throw new Error(lastApiError || 'API error');
    }

    return response;
  }

  const response = data as ApiFootballResponse<T>;

  if (hasApiErrors(response)) {
    const msg = getApiErrorMessage(response);
    lastApiError = msg;
    // Rate limit check
    if (/limit|too many|quota/i.test(msg)) {
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

export function hasApiKey(): boolean { return true; }

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
    const response = await apiFootballFetch<ApiFootballFixture>(
      'fixtures',
      { live: 'all', timezone: BRAZIL_TIMEZONE },
      'livescores',
      'medium'
    );

    if (hasApiErrors(response) || !response.response) {
      console.warn('[Oracle] livescores failed');
      return [];
    }

    return response.response
      .map(fixture => {
        const statusShort = fixture.fixture.status.short;
        return {
          id: String(fixture.fixture.id),
          homeTeam: fixture.teams.home.name,
          awayTeam: fixture.teams.away.name,
          homeBadge: fixture.teams.home.logo || '/placeholder.svg',
          awayBadge: fixture.teams.away.logo || '/placeholder.svg',
          homeScore: fixture.goals.home !== null ? String(fixture.goals.home) : null,
          awayScore: fixture.goals.away !== null ? String(fixture.goals.away) : null,
          status: statusShort,
          league: fixture.league.name,
          leagueId: fixture.league.id,
          leagueBadge: fixture.league.logo || '',
          time: '',
          venue: '',
        } satisfies LiveMatchData;
      })
      .sort((a, b) => {
        const liveStatuses = new Set(['1H', '2H', 'HT', 'LIVE', 'PEN']);
        const aLive = liveStatuses.has(a.status) ? 0 : 1;
        const bLive = liveStatuses.has(b.status) ? 0 : 1;
        if (aLive !== bLive) return aLive - bLive;
        return a.league.localeCompare(b.league);
      });
  } catch (err) {
    lastApiError = err instanceof Error ? err.message : 'Erro ao buscar jogos ao vivo.';
    console.error('[Oracle] fetchLiveMatches error:', err);
    return [];
  }
}

// ── Fixtures by date ──

export async function fetchTodayMatches(): Promise<ApiFixture[]> {
  return fetchMatchesByDate(getBrazilDateString(0));
}

export async function fetchTomorrowMatches(): Promise<ApiFixture[]> {
  return fetchMatchesByDate(getBrazilDateString(1));
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
      'fixtures',
      { id: String(fixtureId) },
      'resultado',
      'high'
    );

    if (hasApiErrors(response) || !response.response || response.response.length === 0) {
      return null;
    }

    return normalizeFixture(response.response[0]);
  } catch (err) {
    console.warn('[Oracle] fetchFixtureById failed:', err);
    return null;
  }
}

async function fetchMatchesByDate(date: string): Promise<ApiFixture[]> {
  try {
    const response = await apiFootballFetch<ApiFootballFixture>(
      'fixtures',
      { date, timezone: BRAZIL_TIMEZONE },
      'jogos',
      'medium'
    );

    if (hasApiErrors(response)) {
      const msg = getApiErrorMessage(response);
      if (/limit|quota/i.test(msg)) throw new ApiLimitError(msg);
      console.warn(`[Oracle] fixtures(${date}) failed:`, msg);
      return [];
    }

    const fixtures = (response.response || [])
      .filter(f => {
        // Only include relevant statuses
        const status = f.fixture.status.short;
        return !['CANC', 'ABD', 'AWD', 'WO'].includes(status);
      })
      .map(f => normalizeFixture(f))
      .sort((a, b) => {
        const liveStatuses = ['1H', '2H', 'HT', 'LIVE', 'PEN', 'ET'];
        const aLive = liveStatuses.includes(a.fixture.status.short) ? 0 : 1;
        const bLive = liveStatuses.includes(b.fixture.status.short) ? 0 : 1;
        if (aLive !== bLive) return aLive - bLive;
        return a.fixture.timestamp - b.fixture.timestamp;
      });

    console.log(`[Oracle] fetchMatchesByDate(${date}): found ${fixtures.length} matches`);
    return fixtures;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao buscar jogos.';
    lastApiError = msg;
    console.error(`[Oracle] fetchMatchesByDate(${date}) error:`, err);
    if (isApiLimitError(err)) throw err;
    if (/api key|apikey|proxy|not configured|all api keys|unauthorized|rate|limit/i.test(msg)) {
      throw err instanceof Error ? err : new Error(msg);
    }
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
      'fixtures',
      {
        league: String(league.id),
        season: String(league.season),
        timezone: BRAZIL_TIMEZONE,
      },
      'jogos',
      'low'
    );

    if (hasApiErrors(response) || !response.response) {
      console.warn(`[Oracle] ${league.name} fixtures failed`);
      return [];
    }

    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    return response.response
      .filter(f => {
        const ts = f.fixture.timestamp * 1000;
        return ts >= now - thirtyDaysMs && ts <= now + thirtyDaysMs;
      })
      .sort((a, b) => a.fixture.timestamp - b.fixture.timestamp)
      .map(f => normalizeFixture(f));
  } catch (err) {
    console.warn(`[Oracle] ${league.name} failed:`, err);
    if (isApiLimitError(err)) throw err;
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
 * Fetch real odds for a specific fixture from API-Football.
 * Returns null if odds are not available (requires paid plan).
 */
export async function fetchMatchOdds(fixtureId: number): Promise<MatchOdds | null> {
  try {
    const response = await apiFootballFetch<ApiFootballOddsResponse>(
      'odds',
      { fixture: String(fixtureId) },
      'odds',
      'high'
    );

    if (hasApiErrors(response) || !response.response || response.response.length === 0) {
      return null;
    }

    const oddsData = response.response[0];
    if (!oddsData.bookmakers || oddsData.bookmakers.length === 0) return null;

    // Find Match Winner (1X2) market from first bookmaker
    for (const bookmaker of oddsData.bookmakers) {
      const matchWinner = bookmaker.bets.find(
        b => b.name === 'Match Winner' || b.id === 1
      );

      if (matchWinner && matchWinner.values.length >= 3) {
        const home = matchWinner.values.find(v => v.value === 'Home');
        const draw = matchWinner.values.find(v => v.value === 'Draw');
        const away = matchWinner.values.find(v => v.value === 'Away');

        if (home && draw && away) {
          return {
            home: parseFloat(home.odd),
            draw: parseFloat(draw.odd),
            away: parseFloat(away.odd),
            bookmaker: bookmaker.name,
            updated: oddsData.update,
          };
        }
      }
    }

    return null;
  } catch (err) {
    console.warn('[Oracle] fetchMatchOdds error:', err);
    return null;
  }
}

// ── Team stats (simplified for API-Football) ──

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
    const response = await apiFootballFetch<ApiFootballFixture>(
      'fixtures/headtohead',
      {
        h2h: `${fixture.teams.home.id}-${fixture.teams.away.id}`,
        last: '5',
      },
      'estatistica',
      'low'
    );

    if (!hasApiErrors(response) && response.response) {
      h2h = response.response.map(f => ({
        fixture: { date: f.fixture.date },
        teams: {
          home: { id: f.teams.home.id, name: f.teams.home.name, winner: f.teams.home.winner },
          away: { id: f.teams.away.id, name: f.teams.away.name, winner: f.teams.away.winner },
        },
        goals: { home: f.goals.home, away: f.goals.away },
      }));
    }
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
