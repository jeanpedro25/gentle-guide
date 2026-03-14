import { ApiFixture, LeagueConfig, LEAGUES, TeamStats, H2HFixture } from '@/types/fixture';
import { supabase } from '@/integrations/supabase/client';

const CACHE_TTL = 5 * 60 * 1000;
const LEAGUE_BATCH_SIZE = 4;

interface CachedValue {
  data: unknown;
  ts: number;
}

const cache = new Map<string, CachedValue>();

let usingRealData = false;
let lastApiError = '';

export function isUsingRealData(): boolean {
  return usingRealData;
}

export function getLastApiError(): string {
  return lastApiError;
}

async function sportsDbFetch<T>(endpoint: string): Promise<T> {
  const cached = cache.get(endpoint);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data as T;

  console.log('[Oracle] TheSportsDB →', endpoint);

  const { data, error } = await supabase.functions.invoke('football-proxy', {
    body: { endpoint },
  });

  if (error) {
    console.error('[Oracle] Proxy error:', error);
    throw new Error(error.message || 'Proxy error');
  }

  cache.set(endpoint, { data, ts: Date.now() });
  return data as T;
}

export function clearFootballCache(pathIncludes?: string): void {
  if (!pathIncludes) { cache.clear(); return; }
  for (const key of cache.keys()) {
    if (key.includes(pathIncludes)) cache.delete(key);
  }
}

export function hasApiKey(): boolean {
  return true;
}

// TheSportsDB event shape
interface SportsDbEvent {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  idHomeTeam: string;
  idAwayTeam: string;
  dateEvent: string;
  strTime: string;
  strTimestamp?: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  intRound: string;
  strStatus?: string;
  idLeague: string;
  strLeague: string;
  strLeagueBadge?: string;
  strSeason: string;
  strThumb?: string;
  strSquare?: string;
  strHomeTeamBadge?: string;
  strAwayTeamBadge?: string;
  strVenue?: string;
}

interface SportsDbTeam {
  idTeam: string;
  strTeam: string;
  strBadge: string;
  strLogo?: string;
  strCountry: string;
}

// ── Date helpers ──

function parseEventDate(event: SportsDbEvent): Date | null {
  const directTs = event.strTimestamp?.trim();
  if (directTs) {
    const parsed = new Date(directTs);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const fallback = new Date(`${event.dateEvent}T${event.strTime || '00:00:00'}`);
  if (!Number.isNaN(fallback.getTime())) return fallback;

  return null;
}

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

// ── Status mapping ──

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
    default: return { label: 'EM BREVE', color: 'text-oracle-win', pulse: true };
  }
}

// ── Fixture conversion ──

function eventToFixture(
  event: SportsDbEvent,
  league: LeagueConfig,
  homeBadge: string,
  awayBadge: string
): ApiFixture {
  const parsedDate = parseEventDate(event);
  if (!parsedDate) {
    throw new Error(`Invalid event date for event ${event.idEvent}`);
  }

  const homeScore = event.intHomeScore !== null && event.intHomeScore !== '' ? parseInt(event.intHomeScore) : null;
  const awayScore = event.intAwayScore !== null && event.intAwayScore !== '' ? parseInt(event.intAwayScore) : null;
  const hasScore = homeScore !== null && awayScore !== null;

  const homeWinner = hasScore ? (homeScore > awayScore ? true : homeScore < awayScore ? false : null) : null;
  const awayWinner = hasScore ? (awayScore > homeScore ? true : awayScore < homeScore ? false : null) : null;

  return {
    fixture: {
      id: parseInt(event.idEvent),
      date: parsedDate.toISOString(),
      timestamp: Math.floor(parsedDate.getTime() / 1000),
      status: {
        short: toStatusShort(event.strStatus || '', hasScore),
        long: event.strStatus || 'Not Started',
      },
    },
    league: {
      id: league.id,
      name: league.name,
      country: league.country,
      logo: event.strLeagueBadge || '',
      round: `Regular Season - ${event.intRound || '?'}`,
    },
    teams: {
      home: { id: parseInt(event.idHomeTeam), name: event.strHomeTeam, logo: homeBadge, winner: homeWinner },
      away: { id: parseInt(event.idAwayTeam), name: event.strAwayTeam, logo: awayBadge, winner: awayWinner },
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
  const today = getBrazilDateString(0);

  try {
    const data = await sportsDbFetch<{ events: SportsDbEvent[] | null }>(
      `eventsday.php?d=${today}&s=Soccer`
    );

    if (!data?.events) return [];

    return data.events
      .filter(e => {
        const status = e.strStatus || '';
        return ['1H', '2H', 'HT', 'ET', 'P', 'FT', 'Match Finished', 'AET', 'AP'].includes(status)
          || (e.intHomeScore !== null && e.intHomeScore !== '');
      })
      .map(e => ({
        id: e.idEvent,
        homeTeam: e.strHomeTeam,
        awayTeam: e.strAwayTeam,
        homeBadge: e.strHomeTeamBadge || '/placeholder.svg',
        awayBadge: e.strAwayTeamBadge || '/placeholder.svg',
        homeScore: e.intHomeScore,
        awayScore: e.intAwayScore,
        status: e.strStatus || '',
        league: e.strLeague,
        leagueBadge: e.strLeagueBadge || '',
        time: e.strTime || '',
        venue: e.strVenue || '',
      }));
  } catch (err) {
    console.error('[Oracle] fetchLiveMatches error:', err);
    return [];
  }
}

// ── Today's matches (all soccer) ──

/** IDs of leagues we track */
const TRACKED_LEAGUE_IDS = new Set(LEAGUES.map(l => String(l.sportsDbId)));

export async function fetchTodayMatches(): Promise<ApiFixture[]> {
  const today = getBrazilDateString(0);

  try {
    const data = await sportsDbFetch<{ events: SportsDbEvent[] | null }>(
      `eventsday.php?d=${today}&s=Soccer`
    );

    if (!data?.events) return [];

    // Only include events from our tracked leagues
    return data.events
      .filter(e => TRACKED_LEAGUE_IDS.has(e.idLeague))
      .flatMap(event => {
        const league = LEAGUES.find(l => String(l.sportsDbId) === event.idLeague);
        if (!league) return [];
        try {
          return [eventToFixture(event, league, event.strHomeTeamBadge || '/placeholder.svg', event.strAwayTeamBadge || '/placeholder.svg')];
        } catch {
          return [];
        }
      });
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
    clearFootballCache(`eventsnextleague.php?id=${league.sportsDbId}`);
    clearFootballCache(`eventspastleague.php?id=${league.sportsDbId}`);
    clearFootballCache(`eventsseason.php?id=${league.sportsDbId}`);
  }

  try {
    const [nextData, pastData] = await Promise.allSettled([
      sportsDbFetch<{ events: SportsDbEvent[] | null }>(`eventsnextleague.php?id=${league.sportsDbId}`),
      sportsDbFetch<{ events: SportsDbEvent[] | null }>(`eventspastleague.php?id=${league.sportsDbId}`),
    ]);

    const allEvents = new Map<string, SportsDbEvent>();
    const addEvents = (events: SportsDbEvent[] | null | undefined) => {
      if (!events) return;
      events.forEach(e => allEvents.set(e.idEvent, e));
    };

    if (nextData.status === 'fulfilled') addEvents(nextData.value?.events);
    if (pastData.status === 'fulfilled') addEvents(pastData.value?.events);

    // Season fallback: try current season, then season-1
    if (allEvents.size < 8) {
      for (const seasonOffset of [0, -1]) {
        const season = league.season + seasonOffset;
        try {
          const seasonData = await sportsDbFetch<{ events: SportsDbEvent[] | null }>(
            `eventsseason.php?id=${league.sportsDbId}&s=${season}`
          );
          addEvents(seasonData?.events);
          if (allEvents.size >= 8) break;
        } catch (seasonErr) {
          console.warn(`[Oracle] ${league.name} season ${season} fallback failed:`, seasonErr);
        }
      }
    }

    if (allEvents.size === 0) return [];

    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const minDate = now - thirtyDaysMs;
    const maxDate = now + thirtyDaysMs;

    const filtered = Array.from(allEvents.values())
      .map(event => ({ event, parsedDate: parseEventDate(event) }))
      .filter((entry): entry is { event: SportsDbEvent; parsedDate: Date } => {
        if (!entry.parsedDate) return false;
        const ts = entry.parsedDate.getTime();
        return ts >= minDate && ts <= maxDate;
      })
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
      .map(({ event }) => event);

    return filtered.flatMap(event => {
      try {
        return [eventToFixture(event, league, event.strHomeTeamBadge || '/placeholder.svg', event.strAwayTeamBadge || '/placeholder.svg')];
      } catch (e) {
        console.warn(`[Oracle] Skipping invalid fixture ${event.idEvent}:`, e);
        return [];
      }
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

export async function fetchTeamStats(teamId: number, leagueId: number, _season: number): Promise<TeamStats | null> {
  try {
    const league = LEAGUES.find(l => l.id === leagueId);
    if (!league) return null;

    const data = await sportsDbFetch<{ table: Array<{
      idTeam: string; strForm: string; intWin: string; intDraw: string; intLoss: string; intGoalsFor: string; intGoalsAgainst: string;
    }> | null }>(`lookuptable.php?l=${league.sportsDbId}`);

    const teamRow = data?.table?.find(t => parseInt(t.idTeam) === teamId);
    if (!teamRow) return null;

    return {
      form: teamRow.strForm || '',
      fixtures: {
        wins: { total: parseInt(teamRow.intWin) || 0 },
        draws: { total: parseInt(teamRow.intDraw) || 0 },
        loses: { total: parseInt(teamRow.intLoss) || 0 },
      },
      goals: {
        for: { total: { total: parseInt(teamRow.intGoalsFor) || 0 } },
        against: { total: { total: parseInt(teamRow.intGoalsAgainst) || 0 } },
      },
    };
  } catch {
    return null;
  }
}

export async function fetchH2H(homeId: number, awayId: number): Promise<H2HFixture[]> {
  try {
    const [homeData, awayData] = await Promise.all([
      sportsDbFetch<{ teams: SportsDbTeam[] | null }>(`lookupteam.php?id=${homeId}`),
      sportsDbFetch<{ teams: SportsDbTeam[] | null }>(`lookupteam.php?id=${awayId}`),
    ]);

    const homeName = homeData?.teams?.[0]?.strTeam;
    const awayName = awayData?.teams?.[0]?.strTeam;
    if (!homeName || !awayName) return [];

    const searchTerm = `${homeName.replace(/\s+/g, '_')}_vs_${awayName.replace(/\s+/g, '_')}`;
    const data = await sportsDbFetch<{ event: SportsDbEvent[] | null }>(
      `searchevents.php?e=${encodeURIComponent(searchTerm)}`
    );

    if (!data?.event) return [];

    return data.event
      .filter(e => e.intHomeScore !== null && e.intAwayScore !== null)
      .slice(0, 5)
      .map(e => {
        const hs = parseInt(e.intHomeScore || '0');
        const as2 = parseInt(e.intAwayScore || '0');
        return {
          fixture: { date: `${e.dateEvent}T${e.strTime || '00:00:00'}` },
          teams: {
            home: { id: parseInt(e.idHomeTeam), name: e.strHomeTeam, winner: hs > as2 ? true : hs < as2 ? false : null },
            away: { id: parseInt(e.idAwayTeam), name: e.strAwayTeam, winner: as2 > hs ? true : as2 < hs ? false : null },
          },
          goals: { home: hs, away: as2 },
        };
      });
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
