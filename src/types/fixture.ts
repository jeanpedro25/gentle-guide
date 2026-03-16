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

/** IDs de ligas cobertas pela EstrelaBet */
export const ESTRELABET_LEAGUES = new Set([
  4351, // Brasileirão A
  4352, // Brasileirão Série B
  4353, // Copa do Brasil
  4328, // Premier League
  4335, // La Liga
  4332, // Serie A Italiana
  4331, // Bundesliga
  4334, // Ligue 1
  4480, // Champions League
  4481, // Europa League
  4406, // Liga Argentina
  4346, // MLS
]);

export const LEAGUES: LeagueConfig[] = [
  // Brazil — season 2026
  { id: 71, name: 'Brasileirão A', country: 'Brazil', emoji: '🇧🇷', season: 2026, sportsDbId: 4351 },
  { id: 72, name: 'Série B', country: 'Brazil', emoji: '🇧🇷', season: 2026, sportsDbId: 4352 },
  { id: 73, name: 'Copa do Brasil', country: 'Brazil', emoji: '🇧🇷🏆', season: 2026, sportsDbId: 4353 },
  // Argentina — season 2026
  { id: 128, name: 'Liga Argentina', country: 'Argentina', emoji: '🇦🇷', season: 2026, sportsDbId: 4406 },
  // USA — season 2026
  { id: 253, name: 'MLS', country: 'USA', emoji: '🇺🇸', season: 2026, sportsDbId: 4346 },
  // Europe — season 2025 (Aug 2025 – May 2026)
  { id: 39, name: 'Premier League', country: 'England', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', season: 2025, sportsDbId: 4328 },
  { id: 140, name: 'La Liga', country: 'Spain', emoji: '🇪🇸', season: 2025, sportsDbId: 4335 },
  { id: 135, name: 'Serie A', country: 'Italy', emoji: '🇮🇹', season: 2025, sportsDbId: 4332 },
  { id: 78, name: 'Bundesliga', country: 'Germany', emoji: '🇩🇪', season: 2025, sportsDbId: 4331 },
  { id: 61, name: 'Ligue 1', country: 'France', emoji: '🇫🇷', season: 2025, sportsDbId: 4334 },
  // European cups — season 2025
  { id: 2, name: 'Champions League', country: 'Europe', emoji: '⭐', season: 2025, sportsDbId: 4480 },
  { id: 3, name: 'Europa League', country: 'Europe', emoji: '🟠', season: 2025, sportsDbId: 4481 },
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
