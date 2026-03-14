export interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    status: {
      short: string;
      long: string;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    round: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

export interface LeagueConfig {
  id: number;
  name: string;
  country: string;
  emoji: string;
  season: number;
  /** TheSportsDB league ID */
  sportsDbId: number;
}

export const LEAGUES: LeagueConfig[] = [
  { id: 71, name: 'Brasileirão A', country: 'Brazil', emoji: '🇧🇷', season: 2026, sportsDbId: 4351 },
  { id: 72, name: 'Série B', country: 'Brazil', emoji: '🇧🇷', season: 2026, sportsDbId: 4404 },
  { id: 39, name: 'Premier League', country: 'England', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', season: 2025, sportsDbId: 4328 },
  { id: 140, name: 'La Liga', country: 'Spain', emoji: '🇪🇸', season: 2025, sportsDbId: 4335 },
  { id: 135, name: 'Serie A', country: 'Italy', emoji: '🇮🇹', season: 2025, sportsDbId: 4332 },
  { id: 78, name: 'Bundesliga', country: 'Germany', emoji: '🇩🇪', season: 2025, sportsDbId: 4331 },
  { id: 61, name: 'Ligue 1', country: 'France', emoji: '🇫🇷', season: 2025, sportsDbId: 4334 },
  { id: 2, name: 'Champions League', country: 'Europe', emoji: '⭐', season: 2025, sportsDbId: 4480 },
];

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

export interface MatchContext {
  fixture: ApiFixture;
  homeStats: TeamStats | null;
  awayStats: TeamStats | null;
  h2h: H2HFixture[];
}
