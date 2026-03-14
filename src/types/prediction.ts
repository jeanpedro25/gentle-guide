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

// Convert OracleAnalysis to legacy PredictionResult for backward compat
export function oracleToLegacy(oracle: OracleAnalysis, homeTeam: string, awayTeam: string): PredictionResult {
  const { probabilities, primaryBet } = oracle;
  const maxP = Math.max(probabilities.homeWin, probabilities.draw, probabilities.awayWin);
  const prediction =
    maxP === probabilities.homeWin ? 'HOME_WIN' as const :
    maxP === probabilities.draw ? 'DRAW' as const : 'AWAY_WIN' as const;

  const confMap: Record<string, PredictionResult['confidence']> = {
    'A+': 'VERY_HIGH', 'A': 'HIGH', 'B': 'MEDIUM', 'C': 'LOW', 'D': 'LOW',
  };

  const riskMap: Record<string, PredictionResult['riskLevel']> = {
    'A+': 'LOW', 'A': 'LOW', 'B': 'MEDIUM', 'C': 'HIGH', 'D': 'HIGH',
  };

  return {
    homeWinPercent: Math.round(probabilities.homeWin * 100),
    drawPercent: Math.round(probabilities.draw * 100),
    awayWinPercent: Math.round(probabilities.awayWin * 100),
    prediction,
    confidence: confMap[primaryBet.confidence] || 'MEDIUM',
    reasoning: primaryBet.reasoning,
    keyFactors: oracle.redFlags.length > 0 ? oracle.redFlags : [oracle.tacticalEdge],
    riskLevel: riskMap[primaryBet.confidence] || 'MEDIUM',
    suggestedBet: primaryBet.market,
    oddsTrend: oracle.verdictReason,
    bothTeamsScore: probabilities.btts > 0.5,
    expectedGoals: oracle.poisson.homeExpectedGoals + oracle.poisson.awayExpectedGoals,
  };
}
