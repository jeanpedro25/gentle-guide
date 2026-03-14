// ====== Oracle Quant Analysis Types ======

export interface PoissonModel {
  homeExpectedGoals: number;
  awayExpectedGoals: number;
  mostLikelyScores: { score: string; prob: number }[];
}

export interface Probabilities {
  homeWin: number;
  draw: number;
  awayWin: number;
  over25: number;
  btts: number;
}

export interface MarketComparison {
  homeImpliedProb: number;
  drawImpliedProb: number;
  awayImpliedProb: number;
  valueDetected: 'HOME' | 'DRAW' | 'AWAY' | 'OVER' | 'UNDER' | 'BTTS' | 'NONE';
}

export interface PrimaryBet {
  market: string;
  confidence: 'A+' | 'A' | 'B' | 'C' | 'D';
  ev: number;
  kellyFraction: number;
  reasoning: string;
}

export interface AlternativeBet {
  market: string;
  confidence: string;
  ev: number;
}

export interface KeyDuel {
  homePlayer: string;
  awayPlayer: string;
  advantage: 'CASA' | 'VISITANTE' | 'IGUAL';
  impact: string;
}

// ====== New: Enhanced Player & Tactical Types ======

export interface PlayerRating {
  name: string;
  position: 'GOL' | 'ZAG' | 'LAT' | 'MEI' | 'ATA';
  rating: number;
  keyStats: Record<string, number>;
}

export interface PlayerDuel {
  homePlayer: string;
  homeRating: number;
  awayPlayer: string;
  awayRating: number;
  advantage: 'HOME' | 'AWAY' | 'EQUAL';
  homeStats: Record<string, number>;
  awayStats: Record<string, number>;
}

export interface GoalkeeperDuel {
  home: {
    name: string;
    rating: number;
    reflexes: number;
    positioning: number;
    ballDistribution: number;
  };
  away: {
    name: string;
    rating: number;
    reflexes: number;
    positioning: number;
    ballDistribution: number;
  };
  winner: 'HOME' | 'AWAY' | 'EQUAL';
}

export interface FormationAnalysis {
  home: string;
  away: string;
  tacticalEdge: 'HOME' | 'AWAY' | 'EQUAL';
  reason: string;
}

export interface ScoreScenario {
  score: string;
  prob: number;
}

export interface PredictedScore {
  home: number;
  away: number;
}

export interface OracleAnalysis {
  poisson: PoissonModel;
  probabilities: Probabilities;
  marketComparison: MarketComparison;
  primaryBet: PrimaryBet;
  alternativeBets: AlternativeBet[];
  redFlags: string[];
  homeAdvantage: string;
  goalkeeperEdge: string;
  tacticalEdge: string;
  keyDuels: KeyDuel[];
  injuryImpact: string;
  verdict: 'APOSTAR' | 'PASSAR';
  verdictReason: string;
  // New enhanced fields
  predictedScore?: PredictedScore;
  scoreScenarios?: ScoreScenario[];
  playerRatings?: {
    home: PlayerRating[];
    away: PlayerRating[];
  };
  playerDuels?: PlayerDuel[];
  goalkeeperDuel?: GoalkeeperDuel;
  formationAnalysis?: FormationAnalysis;
}

// Legacy compatibility wrapper
export interface PredictionResult {
  homeWinPercent: number;
  drawPercent: number;
  awayWinPercent: number;
  prediction: 'HOME_WIN' | 'DRAW' | 'AWAY_WIN';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  reasoning: string;
  keyFactors: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestedBet: string;
  oddsTrend: string;
  bothTeamsScore?: boolean;
  expectedGoals?: number;
}

export interface MatchAnalysis {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  sport: string;
  league: string;
  date: string;
  result: PredictionResult;
  oracle?: OracleAnalysis;
  timestamp: number;
  fixtureId?: number;
}

export const confidenceLabels: Record<string, string> = {
  LOW: 'BAIXA',
  MEDIUM: 'MÉDIA',
  HIGH: 'ALTA',
  VERY_HIGH: 'MUITO ALTA',
};

export const riskLabels: Record<string, string> = {
  LOW: 'BAIXO RISCO',
  MEDIUM: 'RISCO MÉDIO',
  HIGH: 'ALTO RISCO',
};

export const predictionLabels: Record<string, string> = {
  HOME_WIN: 'VITÓRIA DA CASA',
  DRAW: 'EMPATE',
  AWAY_WIN: 'VITÓRIA VISITANTE',
};

export const confidenceGradeLabels: Record<string, string> = {
  'A+': 'ELITE — EV > 15%',
  'A': 'FORTE — EV > 8%',
  'B': 'MODERADO — EV > 3%',
  'C': 'MARGINAL — PULAR',
  'D': 'CONTRA A MATEMÁTICA',
};

export const confidenceGradeColors: Record<string, string> = {
  'A+': 'text-oracle-win',
  'A': 'text-oracle-win',
  'B': 'text-oracle-draw',
  'C': 'text-oracle-muted',
  'D': 'text-oracle-loss',
};

export const verdictLabels: Record<string, string> = {
  APOSTAR: 'APOSTAR',
  PASSAR: 'PASSAR',
};

/**
 * Normalize probability values: detect if they are 0-1 (decimals) or 0-100 (percentages)
 * and always return them in 0-1 format.
 */
export function normalizeProbabilities(probs: Probabilities): Probabilities {
  const sum = probs.homeWin + probs.draw + probs.awayWin;
  // If sum > 3, they're already percentages (0-100 range)
  if (sum > 3) {
    return {
      homeWin: probs.homeWin / 100,
      draw: probs.draw / 100,
      awayWin: probs.awayWin / 100,
      over25: probs.over25 > 1 ? probs.over25 / 100 : probs.over25,
      btts: probs.btts > 1 ? probs.btts / 100 : probs.btts,
    };
  }
  return probs;
}

/**
 * Get probability as percentage (0-100) safely regardless of AI output format.
 */
export function probAsPercent(value: number): number {
  // If value > 1, it's already a percentage
  return value > 1 ? value : value * 100;
}

// Convert OracleAnalysis to legacy PredictionResult for backward compat
export function oracleToLegacy(oracle: OracleAnalysis, homeTeam: string, awayTeam: string): PredictionResult {
  const normalized = normalizeProbabilities(oracle.probabilities);
  const maxP = Math.max(normalized.homeWin, normalized.draw, normalized.awayWin);
  const prediction =
    maxP === normalized.homeWin ? 'HOME_WIN' as const :
    maxP === normalized.draw ? 'DRAW' as const : 'AWAY_WIN' as const;

  const confMap: Record<string, PredictionResult['confidence']> = {
    'A+': 'VERY_HIGH', 'A': 'HIGH', 'B': 'MEDIUM', 'C': 'LOW', 'D': 'LOW',
  };

  const riskMap: Record<string, PredictionResult['riskLevel']> = {
    'A+': 'LOW', 'A': 'LOW', 'B': 'MEDIUM', 'C': 'HIGH', 'D': 'HIGH',
  };

  return {
    homeWinPercent: Math.round(normalized.homeWin * 100),
    drawPercent: Math.round(normalized.draw * 100),
    awayWinPercent: Math.round(normalized.awayWin * 100),
    prediction,
    confidence: confMap[oracle.primaryBet.confidence] || 'MEDIUM',
    reasoning: oracle.primaryBet.reasoning,
    keyFactors: oracle.redFlags.length > 0 ? oracle.redFlags : [oracle.tacticalEdge],
    riskLevel: riskMap[oracle.primaryBet.confidence] || 'MEDIUM',
    suggestedBet: oracle.primaryBet.market,
    oddsTrend: oracle.verdictReason,
    bothTeamsScore: normalized.btts > 0.5,
    expectedGoals: oracle.poisson.homeExpectedGoals + oracle.poisson.awayExpectedGoals,
  };
}
