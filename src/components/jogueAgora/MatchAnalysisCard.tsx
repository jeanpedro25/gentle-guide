import { motion } from 'framer-motion';
import { Trophy, Target, Compass, TrendingUp } from 'lucide-react';
import { AnaliseJogo, PICK_LABELS_FULL } from '@/lib/jogueAgora';
import { BRAZIL_TIMEZONE } from '@/services/footballApi';
import { gerarDecisaoFinal, getBadgeJogo } from '@/lib/evDecision';

interface Props {
  analise: AnaliseJogo;
  index: number;
  onBet: (analise: AnaliseJogo) => void;
}

function ConfidenceBar({ value }: { value: number }) {
  const filled = Math.round(value / 10);
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-3 rounded-sm ${
              i < filled ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-bold text-foreground">{value}%</span>
    </div>
  );
}

export function TopCard({ analise, index, onBet }: Props) {
  const decisao = gerarDecisaoFinal(analise.melhor_ev, analise.confianca);
  const badge = getBadgeJogo(analise.melhor_ev);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-5 space-y-3"
    >
      {/* Gold accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Profeta Recomenda</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{analise.fixture.league.name}</span>
      </div>

      <div>
        <p className="text-base font-extrabold text-foreground">{analise.fixture.teams.home.name}</p>
        <p className="text-sm text-muted-foreground">vs {analise.fixture.teams.away.name}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {new Date(analise.fixture.fixture.date).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: BRAZIL_TIMEZONE,
          })}
        </p>
      </div>

      {/* Prediction badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/30">
        <Target className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-bold text-primary">{PICK_LABELS_FULL[analise.melhor_resultado]}</span>
      </div>

      {/* Predicted score */}
      <div className="bg-secondary/60 rounded-lg p-3 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Placar Prov√°vel</p>
        <p className="text-2xl font-black text-foreground tracking-widest">{analise.placar_provavel}</p>
        <p className="text-[10px] text-muted-foreground">{analise.prob_placar.toFixed(1)}% de probabilidade</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-secondary/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground">EV</p>
          <p className="text-sm font-bold text-primary">+{analise.melhor_ev.toFixed(1)}%</p>
          <span
            className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-black uppercase"
            style={{ background: `${badge.cor}20`, color: badge.cor, border: `1px solid ${badge.cor}55` }}
          >
            {badge.texto}
          </span>
        </div>
        <div className="bg-secondary/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Odd</p>
          <p className="text-sm font-bold text-foreground">{analise.melhor_odd.toFixed(2)}</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Prob</p>
          <p className="text-sm font-bold text-foreground">{(analise.melhor_prob * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* Confidence */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-1">Confian√ßa</p>
        <ConfidenceBar value={analise.confianca} />
      </div>

      {/* Probability row */}
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Casa {(analise.prob_casa * 100).toFixed(0)}%</span>
        <span>Emp {(analise.prob_empate * 100).toFixed(0)}%</span>
        <span>Fora {(analise.prob_fora * 100).toFixed(0)}%</span>
      </div>

      <button
        onClick={() => onBet(analise)}
        disabled={!decisao.botaoApostar}
        className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {decisao.botaoApostar ? 'APOSTAR AGORA' : decisao.texto}
      </button>
    </motion.div>
  );
}

export function MedioCard({ analise, index, onBet }: Props) {
  const decisao = gerarDecisaoFinal(analise.melhor_ev, analise.confianca);
  const badge = getBadgeJogo(analise.melhor_ev);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.08 }}
      className="rounded-xl border border-oracle-blue/30 bg-gradient-to-br from-oracle-blue/5 via-card to-card p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-oracle-blue" />
          <span className="text-[10px] font-bold text-oracle-blue uppercase tracking-wider">Vale a Pena</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{analise.fixture.league.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">{analise.fixture.teams.home.name}</p>
          <p className="text-xs text-muted-foreground">vs {analise.fixture.teams.away.name}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            {new Date(analise.fixture.fixture.date).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: BRAZIL_TIMEZONE,
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-bold px-2 py-1 rounded bg-oracle-blue/15 text-oracle-blue border border-oracle-blue/20">
          {PICK_LABELS_FULL[analise.melhor_resultado]}
        </span>
        <span className="text-xs font-bold text-primary">EV +{analise.melhor_ev.toFixed(1)}%</span>
        <span
          className="text-[9px] font-black uppercase rounded-full px-2 py-0.5"
          style={{ background: `${badge.cor}20`, color: badge.cor, border: `1px solid ${badge.cor}55` }}
        >
          {badge.texto}
        </span>
        <span className="text-xs text-muted-foreground">Odd {analise.melhor_odd.toFixed(2)}</span>
      </div>

      <ConfidenceBar value={analise.confianca} />

      <button
        onClick={() => onBet(analise)}
        disabled={!decisao.botaoApostar}
        className="w-full py-2.5 rounded-lg bg-oracle-blue/15 text-oracle-blue border border-oracle-blue/30 font-bold text-sm hover:bg-oracle-blue/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {decisao.botaoApostar ? 'APOSTAR' : decisao.texto}
      </button>
    </motion.div>
  );
}

export function ExplorarCard({ analise, index, onBet }: Props) {
  const decisao = gerarDecisaoFinal(analise.melhor_ev, analise.confianca);
  const badge = getBadgeJogo(analise.melhor_ev);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + index * 0.05 }}
      className="rounded-lg border border-border bg-card p-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{analise.fixture.league.name}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {new Date(analise.fixture.fixture.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: BRAZIL_TIMEZONE })}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground truncate">{analise.fixture.teams.home.name} vs {analise.fixture.teams.away.name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-foreground">
            {analise.melhor_resultado}
          </span>
          <span className={`text-[10px] font-bold ${analise.melhor_ev > 0 ? 'text-primary' : 'text-destructive'}`}>
            +{analise.melhor_ev.toFixed(1)}%
          </span>
          <span
            className="text-[9px] font-black uppercase rounded-full px-2 py-0.5"
            style={{ background: `${badge.cor}20`, color: badge.cor, border: `1px solid ${badge.cor}55` }}
          >
            {badge.texto}
          </span>
          <span className="text-[10px] text-muted-foreground">{analise.melhor_odd.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <ConfidenceBar value={analise.confianca} />
        <button
          onClick={() => onBet(analise)}
          disabled={!decisao.botaoApostar}
          className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors underline disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {decisao.botaoApostar ? 'VER ANALISE' : decisao.texto}
        </button>
      </div>
    </motion.div>
  );
}
