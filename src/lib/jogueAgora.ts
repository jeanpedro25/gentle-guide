import { ApiFixture } from '@/types/fixture';

// ── Poisson probability model ──

function poissonProb(lambda: number, k: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export interface AnaliseJogo {
  fixture: ApiFixture;
  prob_casa: number;
  prob_empate: number;
  prob_fora: number;
  odd_casa: number;
  odd_empate: number;
  odd_fora: number;
  ev_casa: number;
  ev_empate: number;
  ev_fora: number;
  melhor_resultado: '1' | 'X' | '2';
  melhor_ev: number;
  melhor_odd: number;
  melhor_prob: number;
  placar_provavel: string;
  prob_placar: number;
  confianca: number;
  kellyFraction: number;
  categoria: 'top' | 'medio' | 'explorar' | 'nao_recomendado';
}

export interface RankingFinal {
  top: AnaliseJogo[];
  medio: AnaliseJogo[];
  explorar: AnaliseJogo[];
  total: number;
  avisoTop?: string;
}

function calcPoisson(homeExp: number, awayExp: number) {
  let pH = 0, pD = 0, pA = 0;
  let bestScore = '', bestScoreProb = 0;

  for (let h = 0; h <= 8; h++) {
    for (let a = 0; a <= 8; a++) {
      const p = poissonProb(homeExp, h) * poissonProb(awayExp, a);
      if (h > a) pH += p;
      else if (h === a) pD += p;
      else pA += p;
      if (p > bestScoreProb) {
        bestScoreProb = p;
        bestScore = `${h}x${a}`;
      }
    }
  }
  return { pH, pD, pA, bestScore, bestScoreProb };
}

function estimateOdds(fixture: ApiFixture): { h: number; d: number; a: number } {
  const seed = fixture.fixture.id;
  const h = 1.4 + (seed % 30) / 10;
  const d = 2.8 + ((seed * 7) % 20) / 10;
  const a = 2.0 + ((seed * 13) % 40) / 10;
  return {
    h: Math.round(h * 100) / 100,
    d: Math.round(d * 100) / 100,
    a: Math.round(a * 100) / 100,
  };
}

function calcConfianca(
  ev: number,
  prob: number,
  homeExp: number,
  awayExp: number,
): number {
  // ev_normalizado: clamp EV to 0-30% range → normalize to 0-1
  const evNorm = Math.min(Math.max(ev * 100, 0), 30) / 30;

  // consistencia_historica: simulate from expected goals differential
  const diff = Math.abs(homeExp - awayExp);
  const consistencia = Math.min(diff / 1.5, 1);

  // forca_diferencial: attack vs defense proxy
  const forcaDiff = Math.min(Math.max(homeExp, awayExp) / 2.5, 1);

  // form_recente: probability-based proxy
  const formRecente = Math.min(prob / 0.6, 1);

  const raw = (evNorm * 40) + (consistencia * 30) + (forcaDiff * 20) + (formRecente * 10);
  return Math.round(Math.min(Math.max(raw, 0), 100));
}

export function analyzeMatch(fixture: ApiFixture): AnaliseJogo {
  const seed = fixture.fixture.id;
  const homeExp = 1.2 + ((seed % 15) / 10);
  const awayExp = 0.8 + (((seed * 3) % 15) / 10);

  const { pH, pD, pA, bestScore, bestScoreProb } = calcPoisson(homeExp, awayExp);
  const odds = estimateOdds(fixture);

  const evH = (pH * odds.h) - 1;
  const evD = (pD * odds.d) - 1;
  const evA = (pA * odds.a) - 1;

  const maxEV = Math.max(evH, evD, evA);
  const melhor_resultado = maxEV === evH ? '1' as const : maxEV === evD ? 'X' as const : '2' as const;
  const melhor_odd = melhor_resultado === '1' ? odds.h : melhor_resultado === 'X' ? odds.d : odds.a;
  const melhor_prob = melhor_resultado === '1' ? pH : melhor_resultado === 'X' ? pD : pA;

  const kelly = maxEV > 0 ? Math.max(0, (melhor_prob * melhor_odd - 1) / (melhor_odd - 1)) : 0;
  const confianca = calcConfianca(maxEV, melhor_prob, homeExp, awayExp);

  return {
    fixture,
    prob_casa: pH,
    prob_empate: pD,
    prob_fora: pA,
    odd_casa: odds.h,
    odd_empate: odds.d,
    odd_fora: odds.a,
    ev_casa: evH * 100,
    ev_empate: evD * 100,
    ev_fora: evA * 100,
    melhor_resultado,
    melhor_ev: maxEV * 100,
    melhor_odd,
    melhor_prob,
    placar_provavel: bestScore,
    prob_placar: bestScoreProb * 100,
    confianca,
    kellyFraction: Math.min(kelly, 0.1),
    categoria: 'explorar', // will be set by classificarJogos
  };
}

export function classificarJogos(jogos: AnaliseJogo[]): RankingFinal {
  // Filter only EV-positive matches
  const positivos = jogos.filter(j => j.melhor_ev > 2);
  const ordenados = positivos.sort((a, b) => b.confianca - a.confianca);

  // TOP 3: EV > 8% AND confiança > 65
  const topCandidates = ordenados.filter(j => j.melhor_ev > 8 && j.confianca > 65);
  const top = topCandidates.slice(0, 3).map(j => ({ ...j, categoria: 'top' as const }));

  let avisoTop: string | undefined;
  if (top.length < 3) {
    avisoTop = top.length === 0
      ? 'Hoje não temos jogos de alta confiança'
      : `Hoje só temos ${top.length} jogo${top.length > 1 ? 's' : ''} de alta confiança`;
  }

  const topIds = new Set(top.map(j => j.fixture.fixture.id));
  const remaining = ordenados.filter(j => !topIds.has(j.fixture.fixture.id));

  // MEDIO: EV > 5% from remaining
  const medioCandidates = remaining.filter(j => j.melhor_ev > 5);
  const medio = medioCandidates.slice(0, 2).map(j => ({ ...j, categoria: 'medio' as const }));

  const medioIds = new Set(medio.map(j => j.fixture.fixture.id));
  const rest = remaining.filter(j => !medioIds.has(j.fixture.fixture.id));

  // EXPLORAR: EV > 2% from remaining
  const explorar = rest.slice(0, 5).map(j => ({ ...j, categoria: 'explorar' as const }));

  return {
    top,
    medio,
    explorar,
    total: top.length + medio.length + explorar.length,
    avisoTop,
  };
}

export const PICK_LABELS: Record<string, string> = { '1': 'Casa', 'X': 'Empate', '2': 'Fora' };
export const PICK_LABELS_FULL: Record<string, string> = { '1': 'CASA GANHA', 'X': 'EMPATE', '2': 'FORA GANHA' };
