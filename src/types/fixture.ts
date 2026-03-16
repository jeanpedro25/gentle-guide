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
  /** iSports API league ID */
  iSportsId: string;
  /** Category for grouping in tabs */
  category: 'brazil' | 'europe' | 'americas' | 'cups';
}

/** IDs de ligas cobertas pela EstrelaBet (iSports leagueId) */
export const ESTRELABET_LEAGUES = new Set([
  '144',    // Brasileirão A
  '18536',  // Brasileirão Série B
  '16815',  // Copa do Brasil
  '284',    // Brasileirão Feminino
  '18968',  // Copa do Brasil Feminino
  '1639',   // Premier League
  '1134',   // La Liga
  '1437',   // Serie A Italiana
  '188',    // Bundesliga
  '1112',   // Ligue 1
  '13014',  // Champions League
  '13115',  // Europa League
  '122',    // Liga Argentina
  '1123',   // MLS
  '221',    // Libertadores
  '222',    // Sul-Americana
]);

export const LEAGUES: LeagueConfig[] = [
  // Brazil
  { id: 71, name: 'Brasileirão A', country: 'Brazil', emoji: '🇧🇷', season: 2026, iSportsId: '144', category: 'brazil' },
  { id: 72, name: 'Série B', country: 'Brazil', emoji: '🇧🇷', season: 2026, iSportsId: '18536', category: 'brazil' },
  { id: 73, name: 'Copa do Brasil', country: 'Brazil', emoji: '🇧🇷🏆', season: 2026, iSportsId: '16815', category: 'brazil' },
  { id: 740, name: 'Brasileirão Fem.', country: 'Brazil', emoji: '🇧🇷👩', season: 2026, iSportsId: '284', category: 'brazil' },
  { id: 1029, name: 'Copa BR Fem.', country: 'Brazil', emoji: '🇧🇷👩🏆', season: 2026, iSportsId: '18968', category: 'brazil' },
  // Americas
  { id: 128, name: 'Liga Argentina', country: 'Argentina', emoji: '🇦🇷', season: 2026, iSportsId: '122', category: 'americas' },
  { id: 253, name: 'MLS', country: 'USA', emoji: '🇺🇸', season: 2026, iSportsId: '1123', category: 'americas' },
  { id: 13, name: 'Libertadores', country: 'South America', emoji: '🏆', season: 2026, iSportsId: '221', category: 'cups' },
  { id: 11, name: 'Sul-Americana', country: 'South America', emoji: '🥈', season: 2026, iSportsId: '222', category: 'cups' },
  // Europe
  { id: 39, name: 'Premier League', country: 'England', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', season: 2025, iSportsId: '1639', category: 'europe' },
  { id: 140, name: 'La Liga', country: 'Spain', emoji: '🇪🇸', season: 2025, iSportsId: '1134', category: 'europe' },
  { id: 135, name: 'Serie A', country: 'Italy', emoji: '🇮🇹', season: 2025, iSportsId: '1437', category: 'europe' },
  { id: 78, name: 'Bundesliga', country: 'Germany', emoji: '🇩🇪', season: 2025, iSportsId: '188', category: 'europe' },
  { id: 61, name: 'Ligue 1', country: 'France', emoji: '🇫🇷', season: 2025, iSportsId: '1112', category: 'europe' },
  // European cups
  { id: 2, name: 'Champions League', country: 'Europe', emoji: '⭐', season: 2025, iSportsId: '13014', category: 'cups' },
  { id: 3, name: 'Europa League', country: 'Europe', emoji: '🟠', season: 2025, iSportsId: '13115', category: 'cups' },
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
