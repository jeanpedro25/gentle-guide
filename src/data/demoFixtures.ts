import { ApiFixture, LeagueConfig, LEAGUES } from '@/types/fixture';
import { addDays, format } from 'date-fns';

// Generate realistic demo fixtures for all leagues
function generateDemoFixtures(): { league: LeagueConfig; fixtures: ApiFixture[] }[] {
  const now = new Date();

  const leagueTeams: Record<number, { name: string; logo: string; id: number }[]> = {
    // Brasileirão Série A
    71: [
      { id: 127, name: 'Flamengo', logo: 'https://media.api-sports.io/football/teams/127.png' },
      { id: 128, name: 'Palmeiras', logo: 'https://media.api-sports.io/football/teams/128.png' },
      { id: 130, name: 'Corinthians', logo: 'https://media.api-sports.io/football/teams/130.png' },
      { id: 126, name: 'São Paulo', logo: 'https://media.api-sports.io/football/teams/126.png' },
      { id: 131, name: 'Santos', logo: 'https://media.api-sports.io/football/teams/131.png' },
      { id: 121, name: 'Grêmio', logo: 'https://media.api-sports.io/football/teams/121.png' },
      { id: 119, name: 'Internacional', logo: 'https://media.api-sports.io/football/teams/119.png' },
      { id: 1062, name: 'Atlético Mineiro', logo: 'https://media.api-sports.io/football/teams/1062.png' },
      { id: 129, name: 'Fluminense', logo: 'https://media.api-sports.io/football/teams/129.png' },
      { id: 120, name: 'Botafogo', logo: 'https://media.api-sports.io/football/teams/120.png' },
      { id: 133, name: 'Cruzeiro', logo: 'https://media.api-sports.io/football/teams/133.png' },
      { id: 122, name: 'Vasco da Gama', logo: 'https://media.api-sports.io/football/teams/122.png' },
    ],
    // Série B
    72: [
      { id: 134, name: 'Coritiba', logo: 'https://media.api-sports.io/football/teams/134.png' },
      { id: 135, name: 'Sport Recife', logo: 'https://media.api-sports.io/football/teams/135.png' },
      { id: 136, name: 'Ceará', logo: 'https://media.api-sports.io/football/teams/136.png' },
      { id: 137, name: 'Goiás', logo: 'https://media.api-sports.io/football/teams/137.png' },
      { id: 1193, name: 'Guarani', logo: 'https://media.api-sports.io/football/teams/1193.png' },
      { id: 1194, name: 'Avaí', logo: 'https://media.api-sports.io/football/teams/1194.png' },
    ],
    // Premier League
    39: [
      { id: 50, name: 'Manchester City', logo: 'https://media.api-sports.io/football/teams/50.png' },
      { id: 40, name: 'Liverpool', logo: 'https://media.api-sports.io/football/teams/40.png' },
      { id: 42, name: 'Arsenal', logo: 'https://media.api-sports.io/football/teams/42.png' },
      { id: 49, name: 'Chelsea', logo: 'https://media.api-sports.io/football/teams/49.png' },
      { id: 33, name: 'Manchester United', logo: 'https://media.api-sports.io/football/teams/33.png' },
      { id: 47, name: 'Tottenham', logo: 'https://media.api-sports.io/football/teams/47.png' },
      { id: 66, name: 'Aston Villa', logo: 'https://media.api-sports.io/football/teams/66.png' },
      { id: 34, name: 'Newcastle', logo: 'https://media.api-sports.io/football/teams/34.png' },
    ],
    // La Liga
    140: [
      { id: 541, name: 'Real Madrid', logo: 'https://media.api-sports.io/football/teams/541.png' },
      { id: 529, name: 'Barcelona', logo: 'https://media.api-sports.io/football/teams/529.png' },
      { id: 530, name: 'Atlético Madrid', logo: 'https://media.api-sports.io/football/teams/530.png' },
      { id: 536, name: 'Sevilla', logo: 'https://media.api-sports.io/football/teams/536.png' },
      { id: 548, name: 'Real Sociedad', logo: 'https://media.api-sports.io/football/teams/548.png' },
      { id: 543, name: 'Real Betis', logo: 'https://media.api-sports.io/football/teams/543.png' },
    ],
    // Serie A (Italy)
    135: [
      { id: 489, name: 'AC Milan', logo: 'https://media.api-sports.io/football/teams/489.png' },
      { id: 505, name: 'Inter', logo: 'https://media.api-sports.io/football/teams/505.png' },
      { id: 496, name: 'Juventus', logo: 'https://media.api-sports.io/football/teams/496.png' },
      { id: 492, name: 'Napoli', logo: 'https://media.api-sports.io/football/teams/492.png' },
      { id: 497, name: 'Roma', logo: 'https://media.api-sports.io/football/teams/497.png' },
      { id: 487, name: 'Lazio', logo: 'https://media.api-sports.io/football/teams/487.png' },
    ],
    // Bundesliga
    78: [
      { id: 157, name: 'Bayern Munich', logo: 'https://media.api-sports.io/football/teams/157.png' },
      { id: 165, name: 'Borussia Dortmund', logo: 'https://media.api-sports.io/football/teams/165.png' },
      { id: 168, name: 'Bayer Leverkusen', logo: 'https://media.api-sports.io/football/teams/168.png' },
      { id: 160, name: 'RB Leipzig', logo: 'https://media.api-sports.io/football/teams/160.png' },
      { id: 169, name: 'Eintracht Frankfurt', logo: 'https://media.api-sports.io/football/teams/169.png' },
      { id: 161, name: 'VfB Stuttgart', logo: 'https://media.api-sports.io/football/teams/161.png' },
    ],
    // Ligue 1
    61: [
      { id: 85, name: 'Paris Saint-Germain', logo: 'https://media.api-sports.io/football/teams/85.png' },
      { id: 81, name: 'Marseille', logo: 'https://media.api-sports.io/football/teams/81.png' },
      { id: 80, name: 'Lyon', logo: 'https://media.api-sports.io/football/teams/80.png' },
      { id: 91, name: 'Monaco', logo: 'https://media.api-sports.io/football/teams/91.png' },
      { id: 79, name: 'Lille', logo: 'https://media.api-sports.io/football/teams/79.png' },
      { id: 93, name: 'Rennes', logo: 'https://media.api-sports.io/football/teams/93.png' },
    ],
    // Champions League
    2: [
      { id: 541, name: 'Real Madrid', logo: 'https://media.api-sports.io/football/teams/541.png' },
      { id: 50, name: 'Manchester City', logo: 'https://media.api-sports.io/football/teams/50.png' },
      { id: 157, name: 'Bayern Munich', logo: 'https://media.api-sports.io/football/teams/157.png' },
      { id: 505, name: 'Inter', logo: 'https://media.api-sports.io/football/teams/505.png' },
      { id: 529, name: 'Barcelona', logo: 'https://media.api-sports.io/football/teams/529.png' },
      { id: 85, name: 'Paris Saint-Germain', logo: 'https://media.api-sports.io/football/teams/85.png' },
    ],
  };

  const rounds: Record<number, string> = {
    71: 'Regular Season - 12',
    72: 'Regular Season - 10',
    39: 'Regular Season - 30',
    140: 'Regular Season - 28',
    135: 'Regular Season - 29',
    78: 'Regular Season - 27',
    61: 'Regular Season - 26',
    2: 'Round of 16',
  };

  return LEAGUES.map((league) => {
    const teams = leagueTeams[league.id] || [];
    const fixtures: ApiFixture[] = [];

    // Generate 3-4 matches per league over next few days
    const numMatches = Math.min(Math.floor(teams.length / 2), 4);
    for (let i = 0; i < numMatches; i++) {
      const homeTeam = teams[i * 2];
      const awayTeam = teams[i * 2 + 1];
      if (!homeTeam || !awayTeam) break;

      const matchDay = addDays(now, Math.floor(Math.random() * 5));
      const hour = 15 + Math.floor(Math.random() * 7); // 15:00 - 21:00
      matchDay.setHours(hour, 0, 0, 0);

      fixtures.push({
        fixture: {
          id: league.id * 1000 + i,
          date: matchDay.toISOString(),
          timestamp: Math.floor(matchDay.getTime() / 1000),
          status: { short: 'NS', long: 'Not Started' },
        },
        league: {
          id: league.id,
          name: league.name,
          country: league.country,
          logo: `https://media.api-sports.io/football/leagues/${league.id}.png`,
          round: rounds[league.id] || 'Regular Season - 1',
        },
        teams: {
          home: { ...homeTeam, winner: null },
          away: { ...awayTeam, winner: null },
        },
        goals: { home: null, away: null },
      });
    }

    return { league, fixtures };
  }).filter((g) => g.fixtures.length > 0);
}

let demoCache: { league: LeagueConfig; fixtures: ApiFixture[] }[] | null = null;

export function getDemoFixtures(): { league: LeagueConfig; fixtures: ApiFixture[] }[] {
  if (!demoCache) {
    demoCache = generateDemoFixtures();
  }
  return demoCache;
}

export function getDemoFixtureById(id: number): ApiFixture | undefined {
  const all = getDemoFixtures();
  for (const group of all) {
    const found = group.fixtures.find((f) => f.fixture.id === id);
    if (found) return found;
  }
  return undefined;
}
