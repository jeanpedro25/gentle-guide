import { ApiFixture, LeagueConfig, LEAGUES, TeamStats, H2HFixture } from '@/types/fixture';
import { supabase } from '@/integrations/supabase/client';

const CACHE_TTL = 5 * 60 * 1000;

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


function eventToFixture(
  event: SportsDbEvent,
  league: LeagueConfig,
  homeBadge: string,
  awayBadge: string
): ApiFixture {
  const dateStr = event.strTimestamp
    ? new Date(event.strTimestamp).toISOString()
    : `${event.dateEvent}T${event.strTime || '00:00:00'}`;

  const homeScore = event.intHomeScore !== null && event.intHomeScore !== '' ? parseInt(event.intHomeScore) : null;
  const awayScore = event.intAwayScore !== null && event.intAwayScore !== '' ? parseInt(event.intAwayScore) : null;

  const homeWinner = homeScore !== null && awayScore !== null
    ? (homeScore > awayScore ? true : homeScore < awayScore ? false : null)
    : null;
  const awayWinner = homeScore !== null && awayScore !== null
    ? (awayScore > homeScore ? true : awayScore < homeScore ? false : null)
    : null;

  return {
    fixture: {
      id: parseInt(event.idEvent),
      date: dateStr,
      timestamp: new Date(dateStr).getTime() / 1000,
      status: {
        short: event.strStatus === 'Match Finished' ? 'FT' : 'NS',
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
      home: {
        id: parseInt(event.idHomeTeam),
        name: event.strHomeTeam,
        logo: homeBadge,
        winner: homeWinner,
      },
      away: {
        id: parseInt(event.idAwayTeam),
        name: event.strAwayTeam,
        logo: awayBadge,
        winner: awayWinner,
      },
    },
    goals: {
      home: homeScore,
      away: awayScore,
    },
  };
}

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
  const today = new Date().toISOString().slice(0, 10);

  try {
    const data = await sportsDbFetch<{ events: SportsDbEvent[] | null }>(
      `eventsday.php?d=${today}&s=Soccer`
    );

    if (!data?.events) return [];

    return data.events
      .filter(e => {
        // Include live + recently finished
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
    // Fetch next events, past events, and full season in parallel for broader coverage
    const [nextData, pastData, seasonData] = await Promise.allSettled([
      sportsDbFetch<{ events: SportsDbEvent[] | null }>(
        `eventsnextleague.php?id=${league.sportsDbId}`
      ),
      sportsDbFetch<{ events: SportsDbEvent[] | null }>(
        `eventspastleague.php?id=${league.sportsDbId}`
      ),
      sportsDbFetch<{ events: SportsDbEvent[] | null }>(
        `eventsseason.php?id=${league.sportsDbId}&s=${league.season}`
      ),
    ]);

    const allEvents = new Map<string, SportsDbEvent>();

    const addEvents = (events: SportsDbEvent[] | null | undefined) => {
      if (!events) return;
      events.forEach(e => allEvents.set(e.idEvent, e));
    };

    if (nextData.status === 'fulfilled') addEvents(nextData.value?.events);
    if (pastData.status === 'fulfilled') addEvents(pastData.value?.events);
    if (seasonData.status === 'fulfilled') addEvents(seasonData.value?.events);

    if (allEvents.size === 0) return [];

    // Filter to events within ±30 days
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const minDate = now - thirtyDaysMs;
    const maxDate = now + thirtyDaysMs;

    const filtered = Array.from(allEvents.values()).filter(event => {
      const eventDate = event.strTimestamp
        ? new Date(event.strTimestamp).getTime()
        : new Date(`${event.dateEvent}T${event.strTime || '00:00:00'}`).getTime();
      return eventDate >= minDate && eventDate <= maxDate;
    });

    // Sort by date ascending
    filtered.sort((a, b) => {
      const dateA = a.strTimestamp ? new Date(a.strTimestamp).getTime() : new Date(`${a.dateEvent}T${a.strTime || '00:00:00'}`).getTime();
      const dateB = b.strTimestamp ? new Date(b.strTimestamp).getTime() : new Date(`${b.dateEvent}T${b.strTime || '00:00:00'}`).getTime();
      return dateA - dateB;
    });

    return filtered.map(event =>
      eventToFixture(
        event,
        league,
        event.strHomeTeamBadge || '/placeholder.svg',
        event.strAwayTeamBadge || '/placeholder.svg'
      )
    );
  } catch (err) {
    console.warn(`[Oracle] ${league.name} failed:`, err);
    return [];
  }
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

export async function fetchTeamStats(teamId: number, leagueId: number, _season: number): Promise<TeamStats | null> {
  // TheSportsDB free tier doesn't have detailed team stats
  // We'll try to get form from league table
  try {
    const league = LEAGUES.find(l => l.id === leagueId);
    if (!league) return null;

    const data = await sportsDbFetch<{ table: Array<{
      idTeam: string;
      strForm: string;
      intWin: string;
      intDraw: string;
      intLoss: string;
      intGoalsFor: string;
      intGoalsAgainst: string;
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
  // TheSportsDB free tier doesn't have H2H endpoint
  // We'll search for events between the two teams using past events
  try {
    // Look up team names first
    const [homeData, awayData] = await Promise.all([
      sportsDbFetch<{ teams: SportsDbTeam[] | null }>(`lookupteam.php?id=${homeId}`),
      sportsDbFetch<{ teams: SportsDbTeam[] | null }>(`lookupteam.php?id=${awayId}`),
    ]);

    const homeName = homeData?.teams?.[0]?.strTeam;
    const awayName = awayData?.teams?.[0]?.strTeam;
    if (!homeName || !awayName) return [];

    // Search for past events between these teams
    const searchTerm = `${homeName.replace(/\s+/g, '_')}_vs_${awayName.replace(/\s+/g, '_')}`;
    const data = await sportsDbFetch<{ event: SportsDbEvent[] | null }>(
      `searchevents.php?e=${encodeURIComponent(searchTerm)}`
    );

    if (!data?.event) return [];

    return data.event
      .filter(e => e.intHomeScore !== null && e.intAwayScore !== null)
      .slice(0, 5)
      .map(e => {
        const homeScore = parseInt(e.intHomeScore || '0');
        const awayScore = parseInt(e.intAwayScore || '0');
        return {
          fixture: { date: `${e.dateEvent}T${e.strTime || '00:00:00'}` },
          teams: {
            home: {
              id: parseInt(e.idHomeTeam),
              name: e.strHomeTeam,
              winner: homeScore > awayScore ? true : homeScore < awayScore ? false : null,
            },
            away: {
              id: parseInt(e.idAwayTeam),
              name: e.strAwayTeam,
              winner: awayScore > homeScore ? true : awayScore < homeScore ? false : null,
            },
          },
          goals: { home: homeScore, away: awayScore },
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
