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
}

/** IDs de ligas cobertas pela EstrelaBet (iSports leagueId) */
export const ESTRELABET_LEAGUES = new Set([
  '144',   // Brasileirão A
  '145',   // Brasileirão Série B
  '146',   // Copa do Brasil
  '36',    // Premier League
  '31',    // La Liga
  '34',    // Serie A Italiana
  '8',     // Bundesliga
  '11',    // Ligue 1
  '244',   // Champions League
  '245',   // Europa League
  '406',   // Liga Argentina
  '117',   // MLS
]);

export const LEAGUES: LeagueConfig[] = [
  // Brazil
  { id: 71, name: 'Brasileirão A', country: 'Brazil', emoji: '🇧🇷', season: 2026, iSportsId: '144' },
  { id: 72, name: 'Série B', country: 'Brazil', emoji: '🇧🇷', season: 2026, iSportsId: '145' },
  { id: 73, name: 'Copa do Brasil', country: 'Brazil', emoji: '🇧🇷🏆', season: 2026, iSportsId: '146' },
  // Argentina
  { id: 128, name: 'Liga Argentina', country: 'Argentina', emoji: '🇦🇷', season: 2026, iSportsId: '406' },
  // USA
  { id: 253, name: 'MLS', country: 'USA', emoji: '🇺🇸', season: 2026, iSportsId: '117' },
  // Europe
  { id: 39, name: 'Premier League', country: 'England', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', season: 2025, iSportsId: '36' },
  { id: 140, name: 'La Liga', country: 'Spain', emoji: '🇪🇸', season: 2025, iSportsId: '31' },
  { id: 135, name: 'Serie A', country: 'Italy', emoji: '🇮🇹', season: 2025, iSportsId: '34' },
  { id: 78, name: 'Bundesliga', country: 'Germany', emoji: '🇩🇪', season: 2025, iSportsId: '8' },
  { id: 61, name: 'Ligue 1', country: 'France', emoji: '🇫🇷', season: 2025, iSportsId: '11' },
  // European cups
  { id: 2, name: 'Champions League', country: 'Europe', emoji: '⭐', season: 2025, iSportsId: '244' },
  { id: 3, name: 'Europa League', country: 'Europe', emoji: '🟠', season: 2025, iSportsId: '245' },
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
