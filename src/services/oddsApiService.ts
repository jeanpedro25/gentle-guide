/**
 * The Odds API — https://the-odds-api.com
 * Busca odds reais de 40+ casas de apostas para calcular EV real vs nosso Poisson.
 *
 * Plano gratuito: 500 requests/mês (~16/dia)
 * Endpoint base: https://api.the-odds-api.com/v4
 */

const ODDS_API_KEY = import.meta.env.VITE_ODDS_API_KEY as string;
const BASE_URL = 'https://api.the-odds-api.com/v4';

// ── Mapa de ligas: nosso ID → sport key da The Odds API ──
export const LEAGUE_SPORT_MAP: Record<string, string> = {
  'brasileirao-a':    'soccer_brazil_campeonato',
  'serie-b':          'soccer_brazil_serie_b',
  'copa-do-brasil':   'soccer_brazil_campeonato', // usa mesma categoria
  'champions-league': 'soccer_uefa_champs_league',
  'europa-league':    'soccer_uefa_europa_league',
  'premier-league':   'soccer_epl',
  'la-liga':          'soccer_spain_la_liga',
  'serie-a-it':       'soccer_italy_serie_a',
  'bundesliga':       'soccer_germany_bundesliga',
  'ligue-1':          'soccer_france_ligue_one',
  'liga-argentina':   'soccer_argentina_primera_division',
  'libertadores':     'soccer_conmebol_copa_libertadores',
  'mls':              'soccer_usa_mls',
  'liga-mx':          'soccer_mexico_ligamx',
  'copa-do-mundo':    'soccer_fifa_world_cup',
  'eliminatorias-copa': 'soccer_conmebol_cup',
};

// Nomes amigáveis das casas de apostas
const BOOKMAKER_NAMES: Record<string, string> = {
  'bet365':        'Bet365',
  'betway':        'Betway',
  'pinnacle':      'Pinnacle',
  'betfair':       'Betfair',
  'unibet_eu':     'Unibet',
  'williamhill':   'William Hill',
  'draftkings':    'DraftKings',
  'bwin':          'Bwin',
  'betano':        'Betano',
  'superbet':      'Superbet',
  '1xbet':         '1xBet',
  'marathonbet':   'Marathonbet',
};

export interface OddsOutcome {
  name: string;      // "Home", "Away", "Draw"
  price: number;     // decimal odd, ex: 2.10
}

export interface BookmakerOdds {
  key: string;
  title: string;     // nome amigável
  outcomes: {
    home: number;
    draw: number;
    away: number;
  };
}

export interface OddsEvent {
  id: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  bookmakers: BookmakerOdds[];
  bestOdds: {
    home: { price: number; bookmaker: string };
    draw: { price: number; bookmaker: string };
    away: { price: number; bookmaker: string };
  };
  remainingRequests?: number;
}

// ── Cache localStorage com TTL ──
const LS_KEY = 'profeta_odds_cache_';
const ODDS_TTL = 10 * 60 * 1000; // 10 minutos

function getOddsCache(sport: string): OddsEvent[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY + sport);
    if (!raw) return null;
    const entry: { data: OddsEvent[]; exp: number } = JSON.parse(raw);
    if (Date.now() > entry.exp) return null;
    return entry.data;
  } catch { return null; }
}

function setOddsCache(sport: string, data: OddsEvent[]) {
  try {
    localStorage.setItem(LS_KEY + sport, JSON.stringify({ data, exp: Date.now() + ODDS_TTL }));
  } catch {}
}

// ── Busca odds de um esporte ──
export async function fetchOddsBySport(sportKey: string): Promise<OddsEvent[]> {
  const cached = getOddsCache(sportKey);
  if (cached) {
    console.log(`[OddsAPI] 📦 Cache hit: ${sportKey}`);
    return cached;
  }

  if (!ODDS_API_KEY) {
    console.warn('[OddsAPI] API key não configurada.');
    return [];
  }

  const url = `${BASE_URL}/sports/${sportKey}/odds?` + new URLSearchParams({
    apiKey: ODDS_API_KEY,
    regions: 'eu',          // casas europeias (Bet365, Pinnacle, Betway, Bwin...)
    markets: 'h2h',         // head-to-head = 1X2
    oddsFormat: 'decimal',
    dateFormat: 'iso',
  });

  try {
    const resp = await fetch(url);
    const remaining = resp.headers.get('x-requests-remaining');
    const used = resp.headers.get('x-requests-used');
    console.log(`[OddsAPI] ✅ ${sportKey} | Requests: ${used} usados, ${remaining} restantes`);

    if (!resp.ok) {
      console.error(`[OddsAPI] Erro ${resp.status}:`, await resp.text());
      return [];
    }

    const raw: any[] = await resp.json();
    const events = raw.map(ev => parseEvent(ev, remaining));
    setOddsCache(sportKey, events);
    return events;
  } catch (err) {
    console.error('[OddsAPI] Falha na requisição:', err);
    return [];
  }
}

function parseEvent(ev: any, remaining: string | null): OddsEvent {
  const bookmakers: BookmakerOdds[] = (ev.bookmakers ?? []).map((bk: any) => {
    const market = bk.markets?.find((m: any) => m.key === 'h2h');
    if (!market) return null;

    const home = market.outcomes.find((o: any) => o.name === ev.home_team)?.price ?? 0;
    const away = market.outcomes.find((o: any) => o.name === ev.away_team)?.price ?? 0;
    const draw = market.outcomes.find((o: any) => o.name === 'Draw')?.price ?? 0;

    return {
      key: bk.key,
      title: BOOKMAKER_NAMES[bk.key] ?? bk.title,
      outcomes: { home, draw, away },
    } satisfies BookmakerOdds;
  }).filter(Boolean);

  // Melhor odd de cada resultado
  const bestOdds = {
    home: bookmakers.reduce((best, bk) =>
      bk.outcomes.home > best.price ? { price: bk.outcomes.home, bookmaker: bk.title } : best,
      { price: 0, bookmaker: '' }
    ),
    draw: bookmakers.reduce((best, bk) =>
      bk.outcomes.draw > best.price ? { price: bk.outcomes.draw, bookmaker: bk.title } : best,
      { price: 0, bookmaker: '' }
    ),
    away: bookmakers.reduce((best, bk) =>
      bk.outcomes.away > best.price ? { price: bk.outcomes.away, bookmaker: bk.title } : best,
      { price: 0, bookmaker: '' }
    ),
  };

  return {
    id: ev.id,
    homeTeam: ev.home_team,
    awayTeam: ev.away_team,
    commenceTime: ev.commence_time,
    bookmakers,
    bestOdds,
    remainingRequests: remaining ? parseInt(remaining) : undefined,
  };
}

// ── Busca odds de um jogo específico por nome dos times ──
export async function findOddsForMatch(
  homeTeam: string,
  awayTeam: string,
  sportKey: string
): Promise<OddsEvent | null> {
  const events = await fetchOddsBySport(sportKey);
  if (!events.length) return null;

  const normalizeTeam = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

  const homeNorm = normalizeTeam(homeTeam);
  const awayNorm = normalizeTeam(awayTeam);

  return events.find(ev => {
    const evHome = normalizeTeam(ev.homeTeam);
    const evAway = normalizeTeam(ev.awayTeam);
    return (
      (evHome.includes(homeNorm) || homeNorm.includes(evHome)) &&
      (evAway.includes(awayNorm) || awayNorm.includes(evAway))
    );
  }) ?? null;
}

/**
 * Calcula EV real: compara probabilidade Poisson com odds reais do mercado.
 *
 * EV = (prob_nossa × odd_real) - (1 - prob_nossa)
 * EV > 0 = valor positivo → APOSTAR
 * EV < 0 = mercado exige mais do que a odd implica → NÃO APOSTAR
 */
export function calcRealEV(
  ourProbability: number,   // 0-1, ex: 0.60 (60% chance de vitória casa)
  bestOdd: number           // odd decimal real, ex: 2.10
): number {
  if (bestOdd <= 1 || ourProbability <= 0) return -1;
  return (ourProbability * bestOdd) - 1;
}

/**
 * Retorna recomendação de aposta baseada em EV real.
 */
export function getOddsRecommendation(
  homeProb: number,
  drawProb: number,
  awayProb: number,
  odds: OddsEvent
): {
  outcome: 'home' | 'draw' | 'away' | null;
  ev: number;
  odd: number;
  bookmaker: string;
  impliedProb: number;
  ourProb: number;
  label: string;
} {
  const candidates = [
    {
      outcome: 'home' as const,
      ourProb: homeProb,
      odd: odds.bestOdds.home.price,
      bookmaker: odds.bestOdds.home.bookmaker,
    },
    {
      outcome: 'draw' as const,
      ourProb: drawProb,
      odd: odds.bestOdds.draw.price,
      bookmaker: odds.bestOdds.draw.bookmaker,
    },
    {
      outcome: 'away' as const,
      ourProb: awayProb,
      odd: odds.bestOdds.away.price,
      bookmaker: odds.bestOdds.away.bookmaker,
    },
  ];

  const scored = candidates
    .map(c => ({
      ...c,
      ev: calcRealEV(c.ourProb, c.odd),
      impliedProb: c.odd > 1 ? 1 / c.odd : 0,
    }))
    .filter(c => c.ev > 0.03) // só EV > 3%
    .sort((a, b) => b.ev - a.ev);

  if (!scored.length) {
    return { outcome: null, ev: 0, odd: 0, bookmaker: '', impliedProb: 0, ourProb: 0, label: 'Sem valor' };
  }

  const best = scored[0];
  const outcomeLabel = best.outcome === 'home' ? 'Casa' : best.outcome === 'away' ? 'Fora' : 'Empate';

  return {
    ...best,
    label: `${outcomeLabel} @ ${best.odd.toFixed(2)} (EV: +${(best.ev * 100).toFixed(1)}%) via ${best.bookmaker}`,
  };
}

// ── Verifica quantas requisições restam ──
export async function checkOddsApiQuota(): Promise<{ used: number; remaining: number } | null> {
  if (!ODDS_API_KEY) return null;
  try {
    const resp = await fetch(`${BASE_URL}/sports?apiKey=${ODDS_API_KEY}`);
    return {
      used: parseInt(resp.headers.get('x-requests-used') ?? '0'),
      remaining: parseInt(resp.headers.get('x-requests-remaining') ?? '0'),
    };
  } catch { return null; }
}
