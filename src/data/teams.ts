export type Sport = 'football' | 'basketball' | 'tennis' | 'american_football';

export interface Team {
  id: string;
  name: string;
  shortName: string;
  sport: Sport;
  league: string;
  country: string;
  emoji: string;
}

export interface League {
  id: string;
  name: string;
  sport: Sport;
  country: string;
}

export const leagues: League[] = [
  { id: 'laliga', name: 'La Liga', sport: 'football', country: '🇪🇸' },
  { id: 'premier', name: 'Premier League', sport: 'football', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'seriea', name: 'Serie A', sport: 'football', country: '🇮🇹' },
  { id: 'bundesliga', name: 'Bundesliga', sport: 'football', country: '🇩🇪' },
  { id: 'ligue1', name: 'Ligue 1', sport: 'football', country: '🇫🇷' },
  { id: 'brasileirao', name: 'Brasileirão Série A', sport: 'football', country: '🇧🇷' },
  { id: 'champions', name: 'Champions League', sport: 'football', country: '🇪🇺' },
  { id: 'nba', name: 'NBA', sport: 'basketball', country: '🇺🇸' },
  { id: 'nfl', name: 'NFL', sport: 'american_football', country: '🇺🇸' },
  { id: 'atp', name: 'ATP Tour', sport: 'tennis', country: '🌍' },
];

export const teams: Team[] = [
  // La Liga
  { id: 'real_madrid', name: 'Real Madrid', shortName: 'RMA', sport: 'football', league: 'laliga', country: '🇪🇸', emoji: '⚪' },
  { id: 'barcelona', name: 'FC Barcelona', shortName: 'BAR', sport: 'football', league: 'laliga', country: '🇪🇸', emoji: '🔵🔴' },
  { id: 'atletico', name: 'Atlético de Madrid', shortName: 'ATM', sport: 'football', league: 'laliga', country: '🇪🇸', emoji: '🔴⚪' },

  // Premier League
  { id: 'man_city', name: 'Manchester City', shortName: 'MCI', sport: 'football', league: 'premier', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', emoji: '🔵' },
  { id: 'liverpool', name: 'Liverpool FC', shortName: 'LIV', sport: 'football', league: 'premier', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', emoji: '🔴' },
  { id: 'arsenal', name: 'Arsenal FC', shortName: 'ARS', sport: 'football', league: 'premier', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', emoji: '🔴⚪' },
  { id: 'chelsea', name: 'Chelsea FC', shortName: 'CHE', sport: 'football', league: 'premier', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', emoji: '🔵' },
  { id: 'man_utd', name: 'Manchester United', shortName: 'MUN', sport: 'football', league: 'premier', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', emoji: '🔴' },
  { id: 'tottenham', name: 'Tottenham Hotspur', shortName: 'TOT', sport: 'football', league: 'premier', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', emoji: '⚪' },

  // Serie A
  { id: 'juventus', name: 'Juventus FC', shortName: 'JUV', sport: 'football', league: 'seriea', country: '🇮🇹', emoji: '⚪⚫' },
  { id: 'ac_milan', name: 'AC Milan', shortName: 'MIL', sport: 'football', league: 'seriea', country: '🇮🇹', emoji: '🔴⚫' },
  { id: 'inter', name: 'Inter de Milão', shortName: 'INT', sport: 'football', league: 'seriea', country: '🇮🇹', emoji: '🔵⚫' },
  { id: 'napoli', name: 'SSC Napoli', shortName: 'NAP', sport: 'football', league: 'seriea', country: '🇮🇹', emoji: '🔵' },

  // Bundesliga
  { id: 'bayern', name: 'Bayern de Munique', shortName: 'BAY', sport: 'football', league: 'bundesliga', country: '🇩🇪', emoji: '🔴' },
  { id: 'dortmund', name: 'Borussia Dortmund', shortName: 'BVB', sport: 'football', league: 'bundesliga', country: '🇩🇪', emoji: '🟡⚫' },

  // Ligue 1
  { id: 'psg', name: 'Paris Saint-Germain', shortName: 'PSG', sport: 'football', league: 'ligue1', country: '🇫🇷', emoji: '🔵🔴' },
  { id: 'marseille', name: 'Olympique de Marseille', shortName: 'OM', sport: 'football', league: 'ligue1', country: '🇫🇷', emoji: '⚪🔵' },

  // Brasileirão
  { id: 'flamengo', name: 'Flamengo', shortName: 'FLA', sport: 'football', league: 'brasileirao', country: '🇧🇷', emoji: '🔴⚫' },
  { id: 'corinthians', name: 'Corinthians', shortName: 'COR', sport: 'football', league: 'brasileirao', country: '🇧🇷', emoji: '⚪⚫' },
  { id: 'palmeiras', name: 'Palmeiras', shortName: 'PAL', sport: 'football', league: 'brasileirao', country: '🇧🇷', emoji: '🟢' },
  { id: 'sao_paulo', name: 'São Paulo FC', shortName: 'SAO', sport: 'football', league: 'brasileirao', country: '🇧🇷', emoji: '🔴⚪⚫' },
  { id: 'santos', name: 'Santos FC', shortName: 'SAN', sport: 'football', league: 'brasileirao', country: '🇧🇷', emoji: '⚪⚫' },
  { id: 'gremio', name: 'Grêmio', shortName: 'GRE', sport: 'football', league: 'brasileirao', country: '🇧🇷', emoji: '🔵⚪⚫' },
  { id: 'internacional', name: 'Internacional', shortName: 'INR', sport: 'football', league: 'brasileirao', country: '🇧🇷', emoji: '🔴⚪' },
  { id: 'atletico_mg', name: 'Atlético Mineiro', shortName: 'CAM', sport: 'football', league: 'brasileirao', country: '🇧🇷', emoji: '⚫⚪' },
  { id: 'cruzeiro', name: 'Cruzeiro', shortName: 'CRU', sport: 'football', league: 'brasileirao', country: '🇧🇷', emoji: '🔵' },
  { id: 'fluminense', name: 'Fluminense', shortName: 'FLU', sport: 'football', league: 'brasileirao', country: '🇧🇷', emoji: '🔴🟢⚪' },
  { id: 'vasco', name: 'Vasco da Gama', shortName: 'VAS', sport: 'football', league: 'brasileirao', country: '🇧🇷', emoji: '⚫⚪' },
  { id: 'botafogo', name: 'Botafogo', shortName: 'BOT', sport: 'football', league: 'brasileirao', country: '🇧🇷', emoji: '⚫⚪' },

  // NBA
  { id: 'lakers', name: 'Los Angeles Lakers', shortName: 'LAL', sport: 'basketball', league: 'nba', country: '🇺🇸', emoji: '💜💛' },
  { id: 'warriors', name: 'Golden State Warriors', shortName: 'GSW', sport: 'basketball', league: 'nba', country: '🇺🇸', emoji: '💛💙' },
  { id: 'celtics', name: 'Boston Celtics', shortName: 'BOS', sport: 'basketball', league: 'nba', country: '🇺🇸', emoji: '💚' },
  { id: 'bulls', name: 'Chicago Bulls', shortName: 'CHI', sport: 'basketball', league: 'nba', country: '🇺🇸', emoji: '🔴' },
  { id: 'nets', name: 'Brooklyn Nets', shortName: 'BKN', sport: 'basketball', league: 'nba', country: '🇺🇸', emoji: '⚫⚪' },
  { id: 'heat', name: 'Miami Heat', shortName: 'MIA', sport: 'basketball', league: 'nba', country: '🇺🇸', emoji: '🔴' },
  { id: 'bucks', name: 'Milwaukee Bucks', shortName: 'MIL', sport: 'basketball', league: 'nba', country: '🇺🇸', emoji: '💚' },
  { id: 'suns', name: 'Phoenix Suns', shortName: 'PHX', sport: 'basketball', league: 'nba', country: '🇺🇸', emoji: '🟠💜' },
  { id: 'nuggets', name: 'Denver Nuggets', shortName: 'DEN', sport: 'basketball', league: 'nba', country: '🇺🇸', emoji: '💛💙' },
  { id: 'mavs', name: 'Dallas Mavericks', shortName: 'DAL', sport: 'basketball', league: 'nba', country: '🇺🇸', emoji: '💙' },

  // NFL
  { id: 'chiefs', name: 'Kansas City Chiefs', shortName: 'KC', sport: 'american_football', league: 'nfl', country: '🇺🇸', emoji: '🔴' },
  { id: 'eagles', name: 'Philadelphia Eagles', shortName: 'PHI', sport: 'american_football', league: 'nfl', country: '🇺🇸', emoji: '💚' },
  { id: 'cowboys', name: 'Dallas Cowboys', shortName: 'DAL', sport: 'american_football', league: 'nfl', country: '🇺🇸', emoji: '⭐' },
  { id: 'niners', name: 'San Francisco 49ers', shortName: 'SF', sport: 'american_football', league: 'nfl', country: '🇺🇸', emoji: '🔴💛' },
];

export const sportLabels: Record<Sport, string> = {
  football: '⚽ Futebol',
  basketball: '🏀 Basquete',
  tennis: '🎾 Tênis',
  american_football: '🏈 Futebol Americano',
};

export const getTeamsBySport = (sport: Sport) => teams.filter(t => t.sport === sport);
export const getLeaguesBySport = (sport: Sport) => leagues.filter(l => l.sport === sport);
export const getTeamsByLeague = (leagueId: string) => teams.filter(t => t.league === leagueId);
