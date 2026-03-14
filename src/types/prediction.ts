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
