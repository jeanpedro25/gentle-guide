import { ApiFixture, LeagueConfig, LEAGUES, ESTRELABET_LEAGUES, TeamStats, H2HFixture } from '@/types/fixture';
import { supabase } from '@/integrations/supabase/client';
import { cachedFetch, clearApiCache, type CacheDataType } from '@/services/apiService';

// ── Legacy exports for compat ──
let usingRealData = false;
let lastApiError = '';

export function isUsingRealData(): boolean { return usingRealData; }
export function getLastApiError(): string { return lastApiError; }

class ApiLimitError extends Error {
  constructor(message: string) { super(message); this.name = 'ApiLimitError'; }
}

// ── iSports API types ──

interface ISportsMatch {
  matchId: string;
  leagueType: number;
  leagueId: string;
  leagueName: string;
  leagueShortName: string;
  leagueColor: string;
  subLeagueId: string;
  subLeagueName?: string;
  matchTime: number;
  status: number;
  homeName: string;
  homeId: string;
  awayName: string;
  awayId: string;
  homeScore: number;
  awayScore: number;
  homeHalfScore?: number;
  awayHalfScore?: number;
  homeRed?: number;
  awayRed?: number;
  homeYellow?: number;
  awayYellow?: number;
  homeCorner?: number;
  awayCorner?: number;
  explain?: string;
  round?: string;
  location?: string;
  season?: string;
  weather?: string;
  temperature?: string;
  hasLineup?: boolean;
  injuryTime?: number;
  halfStartTime?: number;
  extraExplain?: {
    minute?: number;
    extraTime?: number;
    winner?: number;
  };
}

interface ISportsResponse {
  code: number;
  message: string;
  data: ISportsMatch[] | null;
}

function isRateLimitedResponse(response: ISportsResponse): boolean {
  if (response.code === 2) return true;
  return /trials|try again tomorrow|rate limit|too many/i.test(response.message || '');
}

function getRateLimitMessage(rawMessage?: string): string {
  return rawMessage?.trim()
    ? `Limite diário da API de jogos atingido: ${rawMessage}`
    : 'Limite diário da API de jogos atingido. Tente novamente mais tarde.';
}

function isApiLimitError(error: unknown): boolean {
  return error instanceof ApiLimitError;
}

// ── Core API fetch — ALL calls go through cachedFetch ──

async function rawISportsFetch(path: string, params?: Record<string, string>): Promise<ISportsResponse> {
  console.log('[Oracle] iSports →', path, params || '');

  const { data, error } = await supabase.functions.invoke('football-proxy', {
    body: { path, params },
  });

  if (error) throw new Error(error.message || 'Proxy error');

  const response = data as ISportsResponse;

  if (response.code === 0) {
    lastApiError = '';
    return response;
  }

  if (isRateLimitedResponse(response)) {
    lastApiError = getRateLimitMessage(response.message);
    throw new ApiLimitError(lastApiError);
  }

  return response;
}

/**
 * Fetch from iSports API with full caching pipeline:
 * Memory → Supabase DB → API call → save everywhere
 */
async function iSportsFetch(
  path: string,
  params?: Record<string, string>,
  tipo: CacheDataType = 'jogos',
  priority: 'high' | 'medium' | 'low' | 'minimum' = 'medium',
): Promise<ISportsResponse> {
  const cacheKey = `isports|${path}|${JSON.stringify(params || {})}`;

  return cachedFetch<ISportsResponse>({
    cacheKey,
    tipo,
    priority,
    fetchFn: () => rawISportsFetch(path, params),
  });
}

export function clearFootballCache(pathIncludes?: string): void {
  clearApiCache(pathIncludes ? `isports|${pathIncludes}` : undefined);
}

export function hasApiKey(): boolean { return true; }

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

function iSportsMatchToFixture(match: ISportsMatch): ApiFixture {
  const league = findLeagueByISportsId(match.leagueId);

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
      id: league?.id ?? parseInt(match.leagueId),
      name: league?.name ?? match.leagueName,
      country: league?.country ?? '',
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

    // Show all leagues
    return response.data
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

async function fetchMatchesByDate(date: string): Promise<ApiFixture[]> {
  try {
    const allFixtures: ApiFixture[] = [];
    const seenIds = new Set<number>();
    let rateLimited = false;

    const addFixture = (f: ApiFixture) => {
      if (!seenIds.has(f.fixture.id)) {
        seenIds.add(f.fixture.id);
        allFixtures.push(f);
      }
    };

    const res = await iSportsFetch('/sport/football/schedule/basic', { date }).catch(err => {
      if (isApiLimitError(err)) { rateLimited = true; throw err; }
      return null;
    });

    if (res?.code === 0 && res.data) {
      for (const match of res.data) {
        const fixture = iSportsMatchToFixture(match);
        addFixture(fixture);
      }
    }

    // Also try livescores for today's date
    const today = getBrazilDateString(0);
    if (date === today) {
      try {
        const liveRes = await iSportsFetch('/sport/football/livescores');
        if (liveRes.code === 0 && liveRes.data) {
          for (const match of liveRes.data) {
            const fixture = iSportsMatchToFixture(match);
            addFixture(fixture);
          }
        }
      } catch (err) {
        if (isApiLimitError(err)) rateLimited = true;
      }
    }

    allFixtures.sort((a, b) => {
      const liveStatuses = ['1H', '2H', 'HT', 'LIVE', 'PEN'];
      const aLive = liveStatuses.includes(a.fixture.status.short) ? 0 : 1;
      const bLive = liveStatuses.includes(b.fixture.status.short) ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      return a.fixture.timestamp - b.fixture.timestamp;
    });

    if (allFixtures.length === 0 && rateLimited) {
      throw new ApiLimitError(lastApiError || 'Limite diário da API de jogos atingido.');
    }

    console.log(`[Oracle] fetchMatchesByDate(${date}): found ${allFixtures.length} matches`);
    return allFixtures;
  } catch (err) {
    console.error(`[Oracle] fetchMatchesByDate(${date}) error:`, err);
    if (isApiLimitError(err)) throw err;
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
    if (isApiLimitError(err)) throw err;
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
    let rateLimited = false;

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
          if (isApiLimitError(result.reason)) rateLimited = true;
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

    if (rateLimited) {
      throw new ApiLimitError(lastApiError || 'Limite diário da API de jogos atingido.');
    }

    console.warn('[Oracle] No real fixtures found from any league');
    usingRealData = false;
    return [];
  } catch (err) {
    console.error('[Oracle] fetchAllFixtures error:', err);
    lastApiError = err instanceof Error ? err.message : 'Unknown error';
    usingRealData = false;
    if (isApiLimitError(err)) throw err;
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
