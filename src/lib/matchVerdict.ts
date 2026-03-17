/**
 * Match verdict engine — classifies live matches as JOGO QUENTE, PRESSÃO ALTA, or MORNO
 * based on real-time statistics.
 */

export type MatchHeat = 'JOGO QUENTE' | 'PRESSÃO ALTA' | 'MORNO';

export interface MatchVerdictInput {
  homeDangerousAttacks?: number;
  awayDangerousAttacks?: number;
  homeShotsOnTarget?: number;
  awayShotsOnTarget?: number;
  homePossession?: number;
  awayPossession?: number;
  minute?: number;
  homeScore?: number;
  awayScore?: number;
}

export interface MatchVerdict {
  heat: MatchHeat;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  favoriteNextGoal: 'HOME' | 'AWAY' | null;
  reason: string;
}

export function calculateVerdict(input: MatchVerdictInput): MatchVerdict {
  const {
    homeDangerousAttacks = 0,
    awayDangerousAttacks = 0,
    homeShotsOnTarget = 0,
    awayShotsOnTarget = 0,
    homePossession = 50,
    awayPossession = 50,
    minute = 0,
  } = input;

  const totalAttacks = homeDangerousAttacks + awayDangerousAttacks;
  const totalShots = homeShotsOnTarget + awayShotsOnTarget;

  // Determine favorite to score next
  let favoriteNextGoal: 'HOME' | 'AWAY' | null = null;
  if (homeDangerousAttacks > awayDangerousAttacks * 1.5) {
    favoriteNextGoal = 'HOME';
  } else if (awayDangerousAttacks > homeDangerousAttacks * 1.5) {
    favoriteNextGoal = 'AWAY';
  }

  // JOGO QUENTE: high activity from both sides
  if (totalAttacks >= 20 || totalShots >= 8) {
    return {
      heat: 'JOGO QUENTE',
      emoji: '🔥',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/30',
      favoriteNextGoal,
      reason: `${totalAttacks} ataques perigosos, ${totalShots} chutes ao gol`,
    };
  }

  // PRESSÃO ALTA: one team dominating
  if (favoriteNextGoal || Math.abs(homePossession - awayPossession) > 15) {
    const dominant = homePossession > awayPossession ? 'Casa' : 'Visitante';
    return {
      heat: 'PRESSÃO ALTA',
      emoji: '⚡',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30',
      favoriteNextGoal,
      reason: `${dominant} dominando com ${Math.max(homePossession, awayPossession)}% posse`,
    };
  }

  // MORNO: low activity
  return {
    heat: 'MORNO',
    emoji: '😴',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    borderColor: 'border-border',
    favoriteNextGoal: null,
    reason: 'Pouca atividade ofensiva',
  };
}

/** Check if a match is in a danger zone for cashout */
export function getCashoutAlert(input: {
  minute?: number;
  userBetTeam?: 'HOME' | 'AWAY';
  homeScore: number;
  awayScore: number;
  homeRedCards?: number;
  awayRedCards?: number;
  opponentPressure?: number; // 0-100
}): { type: 'DANGER' | 'PROFIT' | null; message: string } {
  const { minute = 0, userBetTeam, homeScore, awayScore, homeRedCards = 0, awayRedCards = 0, opponentPressure = 0 } = input;

  if (!userBetTeam) return { type: null, message: '' };

  const userIsWinning = (userBetTeam === 'HOME' && homeScore > awayScore) ||
                         (userBetTeam === 'AWAY' && awayScore > homeScore);
  const userRedCard = (userBetTeam === 'HOME' && homeRedCards > 0) ||
                       (userBetTeam === 'AWAY' && awayRedCards > 0);

  // Danger: red card or heavy opponent pressure
  if (userRedCard) {
    return {
      type: 'DANGER',
      message: '🚨 PERIGO: Seu time levou Cartão Vermelho! Considere encerrar agora.',
    };
  }

  if (opponentPressure > 70 && !userIsWinning) {
    return {
      type: 'DANGER',
      message: '🚨 PERIGO: Cenário mudou! Pressão alta do adversário.',
    };
  }

  // Profit lock: winning after 85 min
  if (minute >= 85 && userIsWinning) {
    return {
      type: 'PROFIT',
      message: '💰 Meta atingida! Sugestão: Garantir lucro (Cashout).',
    };
  }

  return { type: null, message: '' };
}
