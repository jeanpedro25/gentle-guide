import { ApiFixture, LeagueConfig, LEAGUES, ESTRELABET_LEAGUES, TeamStats, H2HFixture } from '@/types/fixture';
import { supabase } from '@/integrations/supabase/client';

const CACHE_TTL = 5 * 60 * 1000;
const PERSISTENT_CACHE_TTL = 6 * 60 * 60 * 1000;
const PERSISTENT_CACHE_PREFIX = 'oracle_api_cache_v2|';
const LEAGUE_BATCH_SIZE = 4;

interface CachedValue<T = unknown> {
  data: T;
  ts: number;
}

const cache = new Map<string, CachedValue<ISportsResponse>>();

class ApiLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiLimitError';
  }
}

let usingRealData = false;
let lastApiError = '';

export function isUsingRealData(): boolean {
  return usingRealData;
}

export function getLastApiError(): string {
  return lastApiError;
}

// ── iSports API types ──

interface ISportsMatch {
...
}

interface ISportsResponse {
  code: number;
  message: string;
  data: ISportsMatch[] | null;
}

function isBrowserEnv(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function persistentCacheKey(cacheKey: string): string {
  return `${PERSISTENT_CACHE_PREFIX}${cacheKey}`;
}

function readPersistentCache(cacheKey: string, allowStale = false): ISportsResponse | null {
  if (!isBrowserEnv()) return null;
  try {
    const raw = window.localStorage.getItem(persistentCacheKey(cacheKey));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedValue<ISportsResponse>;
    if (!parsed?.data || typeof parsed.ts !== 'number') return null;

    if (!allowStale && Date.now() - parsed.ts > PERSISTENT_CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writePersistentCache(cacheKey: string, data: ISportsResponse): void {
  if (!isBrowserEnv()) return;
  try {
    const payload: CachedValue<ISportsResponse> = { data, ts: Date.now() };
    window.localStorage.setItem(persistentCacheKey(cacheKey), JSON.stringify(payload));
  } catch {
    // Ignore quota/storage errors
  }
}

function isRateLimitedResponse(response: ISportsResponse): boolean {
  if (response.code === 2) return true;
  return /trials|try again tomorrow|rate limit|too many/i.test(response.message || '');
}

function getRateLimitMessage(rawMessage?: string): string {
  if (rawMessage?.trim()) {
    return `Limite diário da API de jogos atingido: ${rawMessage}`;
  }
  return 'Limite diário da API de jogos atingido. Tente novamente mais tarde.';
}

function isApiLimitError(error: unknown): boolean {
  return error instanceof ApiLimitError;
}

// ── API fetch via proxy ──

async function iSportsFetch(path: string, params?: Record<string, string>): Promise<ISportsResponse> {
  const cacheKey = `${path}|${JSON.stringify(params || {})}`;

  const memoryCached = cache.get(cacheKey);
  if (memoryCached && Date.now() - memoryCached.ts < CACHE_TTL) return memoryCached.data;

  const persistentCached = readPersistentCache(cacheKey);
  if (persistentCached) {
    cache.set(cacheKey, { data: persistentCached, ts: Date.now() });
    return persistentCached;
  }

  console.log('[Oracle] iSports →', path, params || '');

  const { data, error } = await supabase.functions.invoke('football-proxy', {
    body: { path, params },
  });

  if (error) {
    const stale = readPersistentCache(cacheKey, true);
    if (stale) {
      console.warn('[Oracle] Proxy failed, using stale cache:', path);
      cache.set(cacheKey, { data: stale, ts: Date.now() });
      return stale;
    }

    console.error('[Oracle] Proxy error:', error);
    throw new Error(error.message || 'Proxy error');
  }

  const response = data as ISportsResponse;

  if (response.code === 0) {
    cache.set(cacheKey, { data: response, ts: Date.now() });
    writePersistentCache(cacheKey, response);
    lastApiError = '';
    return response;
  }

  if (isRateLimitedResponse(response)) {
    lastApiError = getRateLimitMessage(response.message);
    const stale = readPersistentCache(cacheKey, true);
    if (stale) {
      console.warn('[Oracle] Rate limited, using stale cache:', path);
      cache.set(cacheKey, { data: stale, ts: Date.now() });
      return stale;
    }
    throw new ApiLimitError(lastApiError);
  }

  return response;
}

export function clearFootballCache(pathIncludes?: string): void {
  cache.clear();

  if (!isBrowserEnv()) return;

  if (!pathIncludes) {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(PERSISTENT_CACHE_PREFIX)) {
        window.localStorage.removeItem(key);
      }
    }
    return;
  }

  for (const key of Object.keys(window.localStorage)) {
    if (key.startsWith(PERSISTENT_CACHE_PREFIX) && key.includes(pathIncludes)) {
      window.localStorage.removeItem(key);
    }
  }
}

export function hasApiKey(): boolean {
  return true;
}

// ── Date helpers ──

/** Get today's date string in Brazil timezone (YYYY-MM-DD) */
function getBrazilDateString(offset = 0): string {
  const now = new Date();
  now.setDate(now.getDate() + offset);
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

/** Format a UTC date string + time to Brazil timezone */
export function formatBrazilTime(dateStr: string, timeStr?: string): string {
  if (!dateStr) return '';
  const dt = new Date(`${dateStr}T${timeStr || '00:00:00'}Z`);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Get relative day label in Brazil timezone */
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

// ── Status mapping (iSports status codes) ──
// -1=not started, 0=first half, 1=half time, 2=second half, 3=finished,
// 4=postponed, 5=cancelled, 6=interrupted, 7=abandoned, 8=coverage lost,
// 9=extra time first half, 10=extra time halftime, 11=extra time second half, 12=penalties

function iSportsStatusToShort(status: number): string {
  switch (status) {
    case -1: return 'NS';
    case 0: return '1H';
    case 1: return 'HT';
    case 2: return '2H';
    case 3: return 'FT';
    case 4: return 'PST';
    case 5: return 'CAN';
    case 6: case 7: case 8: return 'INT';
    case 9: case 10: case 11: return 'LIVE';
    case 12: return 'PEN';
    default: return 'NS';
  }
}

// Keep for backward compat with components
export function toStatusShort(status: string, hasScore: boolean): string {
  const normalized = status.toUpperCase().trim();
  if (['MATCH FINISHED', 'FT', 'AET', 'AP', 'PEN'].includes(normalized)) return 'FT';
  if (['1H'].includes(normalized)) return '1H';
  if (['HT'].includes(normalized)) return 'HT';
  if (['2H'].includes(normalized)) return '2H';
  if (['ET', 'LIVE', 'IN PLAY'].includes(normalized)) return 'LIVE';
  if (['POSTPONED', 'PST'].includes(normalized)) return 'PST';
  return hasScore ? 'FT' : 'NS';
}

export function getStatusDisplay(statusShort: string): { label: string; color: string; pulse: boolean } {
  switch (statusShort) {
    case '1H': return { label: '1º TEMPO 🔴', color: 'text-red-500', pulse: true };
    case 'HT': return { label: 'INTERVALO ⏸️', color: 'text-yellow-500', pulse: false };
    case '2H': return { label: '2º TEMPO 🔴', color: 'text-red-500', pulse: true };
    case 'LIVE': return { label: 'AO VIVO 🔴', color: 'text-red-500', pulse: true };
    case 'FT': return { label: 'ENCERRADO', color: 'text-muted-foreground', pulse: false };
    case 'PST': return { label: 'ADIADO', color: 'text-orange-500', pulse: false };
    case 'PEN': return { label: 'PÊNALTIS 🔴', color: 'text-red-500', pulse: true };
    default: return { label: 'EM BREVE', color: 'text-oracle-win', pulse: true };
  }
}

// ── iSports → ApiFixture conversion ──

function findLeagueByISportsId(iSportsLeagueId: string): LeagueConfig | null {
  return LEAGUES.find(l => l.iSportsId === iSportsLeagueId) || null;
}

function iSportsMatchToFixture(match: ISportsMatch): ApiFixture | null {
  const league = findLeagueByISportsId(match.leagueId);
  if (!league) return null;

  let statusShort = iSportsStatusToShort(match.status);
  
  // schedule/basic returns status -1 for all matches. Determine if it's finished:
  // If matchTime is in the past and scores > 0, it's a finished match
  const now = Math.floor(Date.now() / 1000);
  const isPast = match.matchTime < now - 7200; // 2h buffer for match duration
  if (statusShort === 'NS' && isPast && (match.homeScore > 0 || match.awayScore > 0)) {
    statusShort = 'FT';
  }

  const isLiveOrFinished = statusShort !== 'NS';
  const homeScore = isLiveOrFinished ? match.homeScore : null;
  const awayScore = isLiveOrFinished ? match.awayScore : null;

  const homeWinner = homeScore !== null && awayScore !== null
    ? (homeScore > awayScore ? true : homeScore < awayScore ? false : null)
    : null;
  const awayWinner = homeScore !== null && awayScore !== null
    ? (awayScore > homeScore ? true : awayScore < homeScore ? false : null)
    : null;

  const matchDate = new Date(match.matchTime * 1000);

  return {
    fixture: {
      id: parseInt(match.matchId),
      date: matchDate.toISOString(),
      timestamp: match.matchTime,
      status: {
        short: statusShort,
        long: statusShort === 'FT' ? 'Match Finished' : statusShort === 'NS' ? 'Not Started' : statusShort,
      },
    },
    league: {
      id: league.id,
      name: league.name,
      country: league.country,
      logo: '',
      round: match.round ? `Rodada ${match.round}` : '',
    },
    teams: {
      home: { id: parseInt(match.homeId), name: match.homeName, logo: '/placeholder.svg', winner: homeWinner },
      away: { id: parseInt(match.awayId), name: match.awayName, logo: '/placeholder.svg', winner: awayWinner },
    },
    goals: { home: homeScore, away: awayScore },
  };
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
  leagueBadge: string;
  time: string;
  venue: string;
}

export async function fetchLiveMatches(): Promise<LiveMatchData[]> {
  try {
    const response = await iSportsFetch('/sport/football/livescores');

    if (response.code !== 0 || !response.data) {
      console.warn('[Oracle] livescores failed:', response.message);
      return [];
    }

    // Filter only EstrelaBet leagues
    return response.data
      .filter(match => ESTRELABET_LEAGUES.has(match.leagueId))
      .map(match => {
        const statusShort = iSportsStatusToShort(match.status);
        return {
          id: match.matchId,
          homeTeam: match.homeName,
          awayTeam: match.awayName,
          homeBadge: '/placeholder.svg',
          awayBadge: '/placeholder.svg',
          homeScore: match.status >= 0 ? String(match.homeScore) : null,
          awayScore: match.status >= 0 ? String(match.awayScore) : null,
          status: statusShort,
          league: match.leagueName,
          leagueBadge: '',
          time: match.extraExplain?.minute ? String(match.extraExplain.minute) : '',
          venue: match.location || '',
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
    console.error('[Oracle] fetchLiveMatches error:', err);
    return [];
  }
}

// ── Today's matches ──

export async function fetchTodayMatches(): Promise<ApiFixture[]> {
  const today = getBrazilDateString(0);
  const tomorrow = getBrazilDateString(1);

  try {
    const allFixtures: ApiFixture[] = [];
    const seenIds = new Set<number>();

    const addFixture = (f: ApiFixture) => {
      if (!seenIds.has(f.fixture.id)) {
        seenIds.add(f.fixture.id);
        allFixtures.push(f);
      }
    };

    // Fetch schedule for today and tomorrow
    const [todayRes, tomorrowRes] = await Promise.allSettled([
      iSportsFetch('/sport/football/schedule/basic', { date: today }),
      iSportsFetch('/sport/football/schedule/basic', { date: tomorrow }),
    ]);

    const processResponse = (result: PromiseSettledResult<ISportsResponse>) => {
      if (result.status !== 'fulfilled') return;
      const matches = result.value?.data || [];
      for (const match of matches) {
        if (!ESTRELABET_LEAGUES.has(match.leagueId)) continue;
        const fixture = iSportsMatchToFixture(match);
        if (fixture) addFixture(fixture);
      }
    };

    processResponse(todayRes);
    processResponse(tomorrowRes);

    // Also try livescores for real-time data
    try {
      const liveRes = await iSportsFetch('/sport/football/livescores');
      if (liveRes.code === 0 && liveRes.data) {
        for (const match of liveRes.data) {
          if (!ESTRELABET_LEAGUES.has(match.leagueId)) continue;
          const fixture = iSportsMatchToFixture(match);
          if (fixture) addFixture(fixture);
        }
      }
    } catch { /* livescores optional */ }

    // Sort: live first, then by time
    allFixtures.sort((a, b) => {
      const liveStatuses = ['1H', '2H', 'HT', 'LIVE', 'PEN'];
      const aLive = liveStatuses.includes(a.fixture.status.short) ? 0 : 1;
      const bLive = liveStatuses.includes(b.fixture.status.short) ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      return a.fixture.timestamp - b.fixture.timestamp;
    });

    console.log(`[Oracle] fetchTodayMatches: found ${allFixtures.length} matches for ${today}/${tomorrow}`);
    return allFixtures;
  } catch (err) {
    console.error('[Oracle] fetchTodayMatches error:', err);
    return [];
  }
}

// ── League fixtures ──

export async function fetchFixturesByLeague(
  league: LeagueConfig,
  options: { forceRefresh?: boolean } = {}
): Promise<ApiFixture[]> {
  if (options.forceRefresh) {
    clearFootballCache(`/sport/football/schedule/basic`);
  }

  try {
    const response = await iSportsFetch('/sport/football/schedule/basic', {
      leagueId: league.iSportsId,
    });

    if (response.code !== 0 || !response.data) {
      console.warn(`[Oracle] ${league.name} schedule failed:`, response.message);
      return [];
    }

    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const minDate = now - thirtyDaysMs;
    const maxDate = now + thirtyDaysMs;

    return response.data
      .filter(match => {
        // Strict league ID check
        if (match.leagueId !== league.iSportsId) return false;
        const ts = match.matchTime * 1000;
        return ts >= minDate && ts <= maxDate;
      })
      .sort((a, b) => a.matchTime - b.matchTime)
      .flatMap(match => {
        const fixture = iSportsMatchToFixture(match);
        return fixture ? [fixture] : [];
      });
  } catch (err) {
    console.warn(`[Oracle] ${league.name} failed:`, err);
    return [];
  }
}

// ── All fixtures ──

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

      results.forEach((result, index) => {
        const league = batch[index];
        if (result.status === 'rejected') {
          console.warn(`[Oracle] ${league.name} failed:`, result.reason?.message || result.reason);
          return;
        }
        if (result.value.fixtures.length > 0) {
          successful.push(result.value);
        }
      });
    }

    if (successful.length > 0) {
      usingRealData = true;
      return successful;
    }

    console.warn('[Oracle] No real fixtures found from any league');
    usingRealData = false;
    return [];
  } catch (err) {
    console.error('[Oracle] fetchAllFixtures error:', err);
    lastApiError = err instanceof Error ? err.message : 'Unknown error';
    usingRealData = false;
    return [];
  }
}

// ── Team stats & H2H ──

export async function fetchTeamStats(_teamId: number, _leagueId: number, _season: number): Promise<TeamStats | null> {
  // iSports doesn't have a direct standings/stats endpoint in the basic plan
  // Return null for now — can be enhanced with Stats plan
  return null;
}

export async function fetchH2H(_homeId: number, _awayId: number): Promise<H2HFixture[]> {
  // iSports H2H requires Stats plan — return empty for now
  return [];
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
