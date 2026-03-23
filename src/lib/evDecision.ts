export type DecisaoAposta = {
  decisao: 'PULAR' | 'NAO_APOSTAR' | 'EVITAR' | 'PODE_APOSTAR' | 'APOSTAR_FORTE';
  texto: string;
  subtexto: string;
  cor: string;
  corTexto: string;
  botaoApostar: boolean;
};

export function gerarDecisaoFinal(ev: number, confianca: number): DecisaoAposta {
  void confianca;
  const safeEv = Number.isFinite(ev) ? ev : 0;

  if (safeEv < 5) {
    if (safeEv >= 2) {
      return {
        decisao: 'PULAR',
        texto: 'EV FRACO — PULE ESTE JOGO',
        subtexto: `EV de +${safeEv.toFixed(1)}% e insuficiente. Minimo e +5% para apostar.`,
        cor: '#854F0B',
        corTexto: '#FAC775',
        botaoApostar: false,
      };
    }
    if (safeEv >= 0) {
      return {
        decisao: 'NAO_APOSTAR',
        texto: 'NAO APOSTE AQUI',
        subtexto: `EV de +${safeEv.toFixed(1)}% nao oferece vantagem real. Aguarde um jogo melhor.`,
        cor: '#2D2D2D',
        corTexto: '#888888',
        botaoApostar: false,
      };
    }
    return {
      decisao: 'EVITAR',
      texto: 'EVITE ESTE JOGO',
      subtexto: `EV negativo de ${safeEv.toFixed(1)}%. A matematica esta contra voce.`,
      cor: '#7F1F1F',
      corTexto: '#F09595',
      botaoApostar: false,
    };
  }

  if (safeEv >= 5 && safeEv < 8) {
    return {
      decisao: 'PODE_APOSTAR',
      texto: 'PODE APOSTAR',
      subtexto: `EV de +${safeEv.toFixed(1)}% esta dentro dos criterios. Aposte 2% da banca.`,
      cor: '#185FA5',
      corTexto: '#B5D4F4',
      botaoApostar: true,
    };
  }

  return {
    decisao: 'APOSTAR_FORTE',
    texto: 'APOSTE NESTE JOGO',
    subtexto: `EV de +${safeEv.toFixed(1)}% e uma oportunidade clara. Alta vantagem matematica.`,
    cor: '#1D9E75',
    corTexto: '#9FE1CB',
    botaoApostar: true,
  };
}

export function getBadgeJogo(ev: number) {
  if (ev >= 8) return { texto: 'APOSTAR', cor: '#1D9E75' };
  if (ev >= 5) return { texto: 'APOSTAR', cor: '#185FA5' };
  if (ev >= 2) return { texto: 'EV FRACO', cor: '#854F0B' };
  if (ev >= 0) return { texto: 'NEUTRO', cor: '#444444' };
  return { texto: 'EVITAR', cor: '#7F1F1F' };
}

export function getEvExplanation(ev: number) {
  if (ev >= 5) return 'Voce tem vantagem matematica real nesta aposta.';
  if (ev >= 0) return 'EV abaixo do minimo de +5%. Nao ha vantagem suficiente para apostar.';
  return 'EV negativo. A casa de apostas tem vantagem sobre voce neste jogo.';
}
