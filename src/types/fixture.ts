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
  // Brazil — season 2026
  { id: 71, name: 'Brasileirão A', country: 'Brazil', emoji: '🇧🇷', season: 2026, sportsDbId: 4351 },
  { id: 72, name: 'Série B', country: 'Brazil', emoji: '🇧🇷', season: 2026, sportsDbId: 4404 },
  { id: 73, name: 'Copa do Brasil', country: 'Brazil', emoji: '🇧🇷🏆', season: 2026, sportsDbId: 4725 },
  { id: 74, name: 'Brasileiro Feminino', country: 'Brazil', emoji: '🇧🇷👩', season: 2026, sportsDbId: 5201 },
  // Argentina — season 2026
  { id: 128, name: 'Liga Argentina', country: 'Argentina', emoji: '🇦🇷', season: 2026, sportsDbId: 4406 },
  // South American cups — season 2026
  { id: 13, name: 'Libertadores', country: 'South America', emoji: '🏆', season: 2026, sportsDbId: 4350 },
  { id: 26, name: 'Copa Sul-Americana', country: 'South America', emoji: '🌎', season: 2026, sportsDbId: 4724 },
  { id: 11, name: 'Copa América', country: 'Worldwide', emoji: '🌎', season: 2024, sportsDbId: 4499 },
  // Europe — season 2025 (Aug 2025 – May 2026)
  { id: 39, name: 'Premier League', country: 'England', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', season: 2025, sportsDbId: 4328 },
  { id: 140, name: 'La Liga', country: 'Spain', emoji: '🇪🇸', season: 2025, sportsDbId: 4335 },
  { id: 135, name: 'Serie A', country: 'Italy', emoji: '🇮🇹', season: 2025, sportsDbId: 4332 },
  { id: 78, name: 'Bundesliga', country: 'Germany', emoji: '🇩🇪', season: 2025, sportsDbId: 4331 },
  { id: 61, name: 'Ligue 1', country: 'France', emoji: '🇫🇷', season: 2025, sportsDbId: 4334 },
  // Europe — Other
  { id: 94, name: 'Primeira Liga', country: 'Portugal', emoji: '🇵🇹', season: 2025, sportsDbId: 4344 },
  { id: 88, name: 'Eredivisie', country: 'Netherlands', emoji: '🇳🇱', season: 2025, sportsDbId: 4337 },
  { id: 203, name: 'Süper Lig', country: 'Turkey', emoji: '🇹🇷', season: 2025, sportsDbId: 4339 },
  { id: 144, name: 'Jupiler Pro', country: 'Belgium', emoji: '🇧🇪', season: 2025, sportsDbId: 4355 },
  { id: 179, name: 'Premiership', country: 'Scotland', emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', season: 2025, sportsDbId: 4330 },
  // USA — season 2026
  { id: 253, name: 'MLS', country: 'USA', emoji: '🇺🇸', season: 2026, sportsDbId: 4346 },
  // European cups — season 2025
  { id: 2, name: 'Champions League', country: 'Europe', emoji: '⭐', season: 2025, sportsDbId: 4480 },
  { id: 3, name: 'Europa League', country: 'Europe', emoji: '🟠', season: 2025, sportsDbId: 4481 },
  { id: 848, name: 'Conference League', country: 'Europe', emoji: '🟢', season: 2025, sportsDbId: 4570 },
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
