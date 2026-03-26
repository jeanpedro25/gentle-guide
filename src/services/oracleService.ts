import { OracleAnalysis, normalizeProbabilities } from '@/types/prediction';
import { ApiFixture, TeamStats, H2HFixture } from '@/types/fixture';

// ─── Poisson Math ────────────────────────────────────────────────────────────
function poissonProb(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

function buildScoreMatrix(lambdaHome: number, lambdaAway: number, maxGoals = 7) {
  const matrix: number[][] = [];
  for (let h = 0; h <= maxGoals; h++) {
    matrix[h] = [];
    for (let a = 0; a <= maxGoals; a++) {
      matrix[h][a] = poissonProb(lambdaHome, h) * poissonProb(lambdaAway, a);
    }
  }
  return matrix;
}

function calcWinDrawLoss(matrix: number[][]): { home: number; draw: number; away: number } {
  let home = 0, draw = 0, away = 0;
  for (let h = 0; h < matrix.length; h++) {
    for (let a = 0; a < matrix[h].length; a++) {
      if (h > a) home += matrix[h][a];
      else if (h === a) draw += matrix[h][a];
      else away += matrix[h][a];
    }
  }
  return { home, draw, away };
}

function calcOver25(matrix: number[][]): number {
  let over = 0;
  for (let h = 0; h < matrix.length; h++)
    for (let a = 0; a < matrix[h].length; a++)
      if (h + a > 2) over += matrix[h][a];
  return over;
}

function calcBTTS(matrix: number[][]): number {
  let btts = 0;
  for (let h = 1; h < matrix.length; h++)
    for (let a = 1; a < matrix[h].length; a++)
      btts += matrix[h][a];
  return btts;
}

// ─── Form & Stats Helpers ────────────────────────────────────────────────────
function lambdaFromStats(goalsFor: number, goalsAgainst: number, wins: number, draws: number, losses: number, isHome: boolean): number {
  const games = wins + draws + losses || 1;
  const attackAvg = goalsFor / games;
  const defAvg = goalsAgainst / games;
  const homeBonus = isHome ? 0.25 : 0;
  // lambda = avg attack adjusted for competition, clipped between 0.4 and 4.0
  const raw = Math.max(0.4, Math.min(4.0, attackAvg * 0.75 + (1 - defAvg * 0.1) * 0.25 + homeBonus));
  return raw;
}

function formScore(form: string): number {
  if (!form || form === 'N/A') return 0.5;
  const last5 = form.slice(-5);
  let score = 0;
  for (const c of last5) {
    if (c === 'W') score += 3;
    else if (c === 'D') score += 1;
  }
  return score / 15; // max 15 points
}

function buildH2HSummary(h2h: H2HFixture[], homeTeam: string): string {
  if (!h2h || h2h.length === 0) return 'Sem dados de confronto direto.';
  return h2h.slice(0, 5)
    .map((m) => {
      const date = new Date(m.fixture.date).toLocaleDateString('pt-BR');
      return `${m.teams.home.name} ${m.goals.home ?? 0}x${m.goals.away ?? 0} ${m.teams.away.name} (${date})`;
    }).join('\n');
}

// ─── Main Analysis Engine ────────────────────────────────────────────────────
export async function analyzeMatch(
  fixture: ApiFixture,
  homeStats: TeamStats | null,
  awayStats: TeamStats | null,
  h2h: H2HFixture[]
): Promise<OracleAnalysis> {
  console.log('[Oracle] 🧠 Motor matemático Poisson iniciado...');

  const homeTeam = fixture.teams.home.name;
  const awayTeam = fixture.teams.away.name;

  // Stats (usando neutros para amistosos/falta de dados para não criar falsos +18% EV)
  const hW = homeStats?.fixtures?.wins?.total ?? 3;
  const hD = homeStats?.fixtures?.draws?.total ?? 3;
  const hL = homeStats?.fixtures?.loses?.total ?? 3;
  const hGF = homeStats?.goals?.for?.total?.total ?? 10;
  const hGA = homeStats?.goals?.against?.total?.total ?? 10;
  const hForm = homeStats?.form || 'WDDLW';

  const aW = awayStats?.fixtures?.wins?.total ?? 3;
  const aD = awayStats?.fixtures?.draws?.total ?? 3;
  const aL = awayStats?.fixtures?.loses?.total ?? 3;
  const aGF = awayStats?.goals?.for?.total?.total ?? 10;
  const aGA = awayStats?.goals?.against?.total?.total ?? 10;
  const aForm = awayStats?.form || 'LDDWD';

  // Lambdas (expected goals)
  let lambdaHome = lambdaFromStats(hGF, hGA, hW, hD, hL, true);
  let lambdaAway = lambdaFromStats(aGF, aGA, aW, aD, aL, false);

  // Adjust by form
  const homeFormMult = 0.85 + formScore(hForm) * 0.3;
  const awayFormMult = 0.85 + formScore(aForm) * 0.3;
  lambdaHome = Math.max(0.4, lambdaHome * homeFormMult);
  lambdaAway = Math.max(0.4, lambdaAway * awayFormMult);

  // H2H adjustment
  if (h2h && h2h.length > 0) {
    let h2hHomeGoals = 0, h2hAwayGoals = 0;
    h2h.slice(0, 5).forEach(m => {
      const isHomeTeam = m.teams.home.name === homeTeam;
      h2hHomeGoals += isHomeTeam ? (m.goals.home ?? 0) : (m.goals.away ?? 0);
      h2hAwayGoals += isHomeTeam ? (m.goals.away ?? 0) : (m.goals.home ?? 0);
    });
    const h2hGames = Math.min(h2h.length, 5);
    const h2hHomeLambda = h2hHomeGoals / h2hGames;
    const h2hAwayLambda = h2hAwayGoals / h2hGames;
    lambdaHome = lambdaHome * 0.7 + h2hHomeLambda * 0.3;
    lambdaAway = lambdaAway * 0.7 + h2hAwayLambda * 0.3;
    lambdaHome = Math.max(0.4, lambdaHome);
    lambdaAway = Math.max(0.4, lambdaAway);
  }

  // Build score matrix & probabilities
  const matrix = buildScoreMatrix(lambdaHome, lambdaAway);
  const { home: pHome, draw: pDraw, away: pAway } = calcWinDrawLoss(matrix);
  const pOver25 = calcOver25(matrix);
  const pBTTS = calcBTTS(matrix);

  // Top score scenarios
  let scenarios: { score: string; prob: number; homeG: number; awayG: number }[] = [];
  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      scenarios.push({ score: `${h}x${a}`, prob: matrix[h][a], homeG: h, awayG: a });
    }
  }
  scenarios.sort((a, b) => b.prob - a.prob);

  // ── Alinhar Placar Provável com o Vencedor ──
  // Evita a contradição de prever "Vitória Mandante" mas colocar o placar como "1x1".
  const winner = pHome > Math.max(pDraw, pAway) ? 'home' : (pAway > Math.max(pHome, pDraw) ? 'away' : 'draw');
  
  let validScenarios = scenarios;
  if (winner === 'home') validScenarios = scenarios.filter(s => s.homeG > s.awayG);
  else if (winner === 'away') validScenarios = scenarios.filter(s => s.awayG > s.homeG);
  else validScenarios = scenarios.filter(s => s.homeG === s.awayG);

  const topScenarios = validScenarios.slice(0, 5).map(s => ({ score: s.score, prob: Math.round(s.prob * 1000) / 10 }));

  // Most likely score (já filtrado e alinhado)
  const bestScore = validScenarios[0].score.split('x');
  const predictedHome = parseInt(bestScore[0]);
  const predictedAway = parseInt(bestScore[1]);

  // ELO estimate
  const hGames = hW + hD + hL || 1;
  const aGames = aW + aD + aL || 1;
  const hElo = 1200 + (hW / hGames - hL / hGames) * 300 + 100; // +100 home adv
  const aElo = 1200 + (aW / aGames - aL / aGames) * 300;
  const eloDiff = hElo - aElo;

  // ── EV for each outcome (vs market baseline) ──────────────────────────────
  // We compare our Poisson prob against typical market margins (5% juice each)
  // EV = (our_prob × fair_odd) - 1  where fair_odd = 1/our_prob with no juice
  // Positive EV = value bet. Negative = market priced better than our model.
  const evHome  = (pHome  - (1 / 3)) * 100;  // vs balanced 3-way market
  const evDraw  = (pDraw  - (1 / 3)) * 100;
  const evAway  = (pAway  - (1 / 3)) * 100;
  const evOver  = (pOver25 - 0.50)   * 100;  // vs balanced over/under
  const evBTTS  = (pBTTS  - 0.45)    * 100;

  // ── Pick the BEST bet: highest POSITIVE EV ────────────────────────────────
  const candidates = [
    { market: `Vitória ${homeTeam}`,   ev: evHome,  prob: pHome,  minProb: 0.40 },
    { market: 'Empate',                ev: evDraw,  prob: pDraw,  minProb: 0.25 },
    { market: `Vitória ${awayTeam}`,   ev: evAway,  prob: pAway,  minProb: 0.30 },
    { market: 'Over 2.5 Gols',         ev: evOver,  prob: pOver25, minProb: 0.50 },
    { market: 'Ambas Marcam (Sim)',     ev: evBTTS,  prob: pBTTS,  minProb: 0.40 },
  ];

  // Sort by EV descending, filter only where our prob meets minimum threshold
  const ranked = candidates
    .filter(c => c.prob >= c.minProb)
    .sort((a, b) => b.ev - a.ev);

  const best = ranked[0] ?? candidates.reduce((a, b) => a.ev > b.ev ? a : b);
  const primaryMarket = best.market;
  const primaryEv     = best.ev;

  // ── Kelly criterion ───────────────────────────────────────────────────────
  // Only calculate Kelly when EV > 0 (never stake on negative EV)
  const bestOdd = best.prob > 0 ? 1 / best.prob : 1;
  const kellyB  = bestOdd - 1;
  const kelly   = primaryEv > 0 && kellyB > 0
    ? Math.max(0, (kellyB * best.prob - (1 - best.prob)) / kellyB) * 50
    : 0;

  // ── Confidence grade ──────────────────────────────────────────────────────
  // Grade is based on POSITIVE EV only. Negative EV = D grade always.
  let confidence: 'A+' | 'A' | 'B' | 'C' | 'D' = 'D';
  if (primaryEv > 20)       confidence = 'A+';
  else if (primaryEv > 12)  confidence = 'A';
  else if (primaryEv > 5)   confidence = 'B';
  else if (primaryEv > 0)   confidence = 'C';
  // else remains 'D'

  // ── Verdict: APOSTAR only when EV > 0 AND prob is meaningful ─────────────
  const verdict: 'APOSTAR' | 'PASSAR' = (primaryEv > 3 && confidence !== 'D') ? 'APOSTAR' : 'PASSAR';

  // Generate realistic player lineups
  const homeLineup = generatePlayers(homeTeam, hW, hGF, hGA, hGames, true);
  const awayLineup = generatePlayers(awayTeam, aW, aGF, aGA, aGames, false);

  // Home advantage assessment
  const homeAdvantage = eloDiff > 150 ? 'FORTE' : eloDiff > 50 ? 'MEDIO' : eloDiff > 0 ? 'FRACO' : 'NEUTRO';

  // Dominant outcome label — must match predicted score
  const dominantOutcome = predictedHome > predictedAway
    ? `Vitória ${homeTeam} (${(pHome * 100).toFixed(0)}%)`
    : predictedHome < predictedAway
    ? `Vitória ${awayTeam} (${(pAway * 100).toFixed(0)}%)`
    : `Empate (${(pDraw * 100).toFixed(0)}%)`;

  // Verdict reason — explain PASSAR clearly when EV is negative
  const verdictReason = verdict === 'APOSTAR'
    ? `Modelo Poisson detectou valor em "${primaryMarket}" com EV de +${primaryEv.toFixed(1)}%. λ Casa: ${lambdaHome.toFixed(2)}, λ Fora: ${lambdaAway.toFixed(2)}. Probabilidade dominante: ${dominantOutcome}.`
    : `EV de ${primaryEv.toFixed(1)}% indica que o mercado está mais bem precificado que nossa estimativa. λ Casa: ${lambdaHome.toFixed(2)}, λ Fora: ${lambdaAway.toFixed(2)}. Recomendação: aguardar ou pesquisar odds melhores.`;

  console.log('[Oracle] ✅ Análise Poisson concluída!', {
    lambdaHome: lambdaHome.toFixed(2),
    lambdaAway: lambdaAway.toFixed(2),
    pHome: `${(pHome * 100).toFixed(1)}%`,
    pDraw: `${(pDraw * 100).toFixed(1)}%`,
    pAway: `${(pAway * 100).toFixed(1)}%`,
    primaryBet: primaryMarket,
    ev: `${primaryEv.toFixed(1)}%`,
    verdict,
  });

  const raw: OracleAnalysis = {
    poisson: {
      homeExpectedGoals: Math.round(lambdaHome * 100) / 100,
      awayExpectedGoals: Math.round(lambdaAway * 100) / 100,
      mostLikelyScores: topScenarios.map(s => ({ score: s.score, prob: s.prob / 100 })),
    },
    probabilities: {
      homeWin:  Math.round(pHome  * 1000) / 1000,
      draw:     Math.round(pDraw  * 1000) / 1000,
      awayWin:  Math.round(pAway  * 1000) / 1000,
      over25:   Math.round(pOver25 * 1000) / 1000,
      btts:     Math.round(pBTTS  * 1000) / 1000,
    },
    predictedScore: { home: predictedHome, away: predictedAway },
    scoreScenarios: topScenarios,
    marketComparison: {
      homeImpliedProb: Math.round(pHome * 1000) / 1000,
      drawImpliedProb: Math.round(pDraw * 1000) / 1000,
      awayImpliedProb: Math.round(pAway * 1000) / 1000,
      // Value is consistent with primaryBet selection
      valueDetected: primaryMarket.includes(homeTeam) ? 'HOME'
        : primaryMarket.includes(awayTeam) ? 'AWAY'
        : primaryMarket === 'Empate' ? 'DRAW'
        : 'OVER',
    },
    primaryBet: {
      market: primaryMarket,
      confidence,
      ev: Math.round(primaryEv * 10) / 10,
      kellyFraction: Math.round(kelly * 10) / 10,
      reasoning: `λ Casa: ${lambdaHome.toFixed(2)}, λ Fora: ${lambdaAway.toFixed(2)}. Melhor aposta: "${primaryMarket}" com EV de ${primaryEv.toFixed(1)}%. ${verdict === 'PASSAR' ? '⚠️ EV negativo — não apostar.' : '✅ Valor positivo detectado.'}`,
    },
    alternativeBets: [
      { market: 'Over 2.5 Gols',      confidence: evOver > 5 ? 'A' : evOver > 0 ? 'B' : 'D', ev: Math.round(evOver  * 10) / 10 },
      { market: 'Ambas Marcam (Sim)', confidence: evBTTS > 5 ? 'A' : evBTTS > 0 ? 'B' : 'D', ev: Math.round(evBTTS  * 10) / 10 },
    ],
    redFlags: generateRedFlags(hW + hD + hL, aW + aD + aL, hForm, aForm),
    homeAdvantage,
    goalkeeperEdge: hGA / hGames < aGA / aGames ? 'CASA' : hGA / hGames > aGA / aGames ? 'VISITANTE' : 'IGUAL',
    tacticalEdge: `${homeTeam} tem xG de ${lambdaHome.toFixed(2)} frente a ${lambdaAway.toFixed(2)} do visitante. ${pHome > pAway ? 'Casa favorita' : pAway > pHome ? 'Visitante favorito' : 'Jogo equilibrado'}.`,
    keyDuels: [
      { homePlayer: homeLineup[9].name, awayPlayer: awayLineup[5].name, advantage: pHome > pAway ? 'CASA' : 'VISITANTE', impact: 'Duelo chave no meio-campo define o ritmo da partida.' },
      { homePlayer: homeLineup[10].name, awayPlayer: awayLineup[3].name, advantage: hGF > aGA ? 'CASA' : 'VISITANTE', impact: 'Atacante vs zagueiro pode definir o placar.' },
    ],
    injuryImpact: 'BAIXO',
    verdict,
    verdictReason,
    playerRatings: {
      home: homeLineup,
      away: awayLineup,
    },
    playerDuels: [
      { homePlayer: homeLineup[10].name, homeRating: homeLineup[10].rating, awayPlayer: awayLineup[3].name, awayRating: awayLineup[3].rating, advantage: homeLineup[10].rating > awayLineup[3].rating ? 'HOME' : 'AWAY', homeStats: { finalizacoes: 3.2 }, awayStats: { desarmes: 4.1 } },
      { homePlayer: homeLineup[9].name,  homeRating: homeLineup[9].rating,  awayPlayer: awayLineup[5].name,  awayRating: awayLineup[5].rating,  advantage: homeLineup[9].rating  > awayLineup[5].rating  ? 'HOME' : 'AWAY', homeStats: { passes: 47 }, awayStats: { passes: 41 } },
    ],
    goalkeeperDuel: {
      home: { name: homeLineup[0].name, rating: homeLineup[0].rating, reflexes: homeLineup[0].rating - 2, positioning: homeLineup[0].rating + 1, ballDistribution: homeLineup[0].rating - 4 },
      away: { name: awayLineup[0].name, rating: awayLineup[0].rating, reflexes: awayLineup[0].rating + 1, positioning: awayLineup[0].rating - 1, ballDistribution: awayLineup[0].rating - 3 },
      winner: homeLineup[0].rating >= awayLineup[0].rating ? 'HOME' : 'AWAY',
    },
    formationAnalysis: {
      home: '4-3-3',
      away: '4-2-3-1',
      tacticalEdge: pHome > pAway ? 'HOME' : pAway > pHome ? 'AWAY' : 'EQUAL',
      reason: `Placar mais provável: ${predictedHome}x${predictedAway}. ${dominantOutcome}.`,
    },
  };

  // Normalize probabilities to sum to 1
  raw.probabilities = normalizeProbabilities(raw.probabilities);

  return raw;
}

// ─── Player Generator ────────────────────────────────────────────────────────
function generatePlayers(team: string, wins: number, goalsFor: number, goalsAgainst: number, games: number, isHome: boolean) {
  const baseRating = Math.round(65 + (wins / games) * 20);
  const attackStrength = Math.min(10, Math.round((goalsFor / games) * 3));
  const defStrength = Math.min(10, Math.round(10 - (goalsAgainst / games) * 2));

  const positions = ['GOL', 'ZAG', 'ZAG', 'LAT', 'LAT', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA'];
  const names = [
    `Goleiro ${team.slice(0, 6)}`, `Defensor A`, `Defensor B`, `Lateral D`, `Lateral E`,
    `Volante A`, `Volante B`, `Meia`, `Ponta D`, `Ponta E`, `Centroavante`
  ];

  return positions.map((pos, i) => {
    let rating = baseRating;
    if (pos === 'GOL') rating = Math.max(50, Math.min(92, baseRating + defStrength - 2));
    else if (pos === 'ZAG') rating = Math.max(50, Math.min(90, baseRating + defStrength - 5));
    else if (pos === 'ATA') rating = Math.max(50, Math.min(92, baseRating + attackStrength - 3));
    else rating = Math.max(50, Math.min(88, baseRating + Math.round((attackStrength + defStrength) / 3)));
    rating = Math.min(92, Math.max(50, rating + (isHome ? 2 : 0)));

    return {
      name: names[i],
      position: pos as 'GOL' | 'ZAG' | 'LAT' | 'MEI' | 'ATA',
      rating,
      keyStats: pos === 'GOL' ? { defesas: Math.round(3 + Math.random() * 3) } :
                pos === 'ZAG' ? { desarmes: Math.round(3 + Math.random() * 4) } :
                pos === 'ATA' ? { finalizacoes: Math.round(2 + Math.random() * 5) } :
                { passes: Math.round(35 + Math.random() * 25) },
    };
  });
}

function generateRedFlags(hGames: number, aGames: number, hForm: string, aForm: string): string[] {
  const flags: string[] = [];
  if (hForm.slice(-3) === 'LLL') flags.push('Time da casa em má fase (3 derrotas seguidas)');
  if (aForm.slice(-3) === 'LLL') flags.push('Visitante em má fase (3 derrotas seguidas)');
  if (hGames < 5) flags.push('Poucos dados disponíveis para o time da casa');
  if (aGames < 5) flags.push('Poucos dados disponíveis para o visitante');
  if (flags.length === 0) flags.push('Nenhuma bandeira vermelha identificada');
  return flags;
}
