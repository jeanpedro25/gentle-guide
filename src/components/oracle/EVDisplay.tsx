import { motion } from 'framer-motion';
import { OracleAnalysis } from '@/types/prediction';
import { Calculator, Percent } from 'lucide-react';
import { CountUpNumber } from './CountUpNumber';
import { getEvExplanation } from '@/lib/evDecision';

interface EVDisplayProps {
  oracle: OracleAnalysis;
}

export function EVDisplay({ oracle }: EVDisplayProps) {
  const { primaryBet } = oracle;
  const ev = primaryBet.ev;

  // Color rules based on EV
  const evColor = ev >= 8 ? 'text-oracle-win' : ev >= 5 ? 'text-oracle-draw' : 'text-oracle-loss';
  const evBg = ev >= 8 ? 'bg-oracle-win/10 border-oracle-win/40' : ev >= 5 ? 'bg-oracle-draw/10 border-oracle-draw/40' : 'bg-oracle-loss/10 border-oracle-loss/40';
  const evGlow = ev >= 8 ? 'neon-glow-green' : ev >= 5 ? 'neon-glow-amber' : '';
  const evLabel = ev >= 8 ? 'Edge forte detectado' : ev >= 5 ? 'Edge moderado — cautela' : ev >= 2 ? 'Edge fraco — considere pular' : ev >= 0 ? 'Sem edge — proteja sua banca' : 'EV negativo — evite';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className={`glass-card p-5 space-y-4 ${evGlow}`}
    >
      <h3 className="font-display text-lg tracking-wider text-foreground flex items-center gap-2">
        <Calculator className="w-5 h-5 text-primary" />
        ANÁLISE DE VALOR
      </h3>

      {/* Main EV Card */}
      <div className={`rounded-xl border p-5 text-center ${evBg}`}>
        <p className="text-xs font-body text-oracle-muted uppercase tracking-wider mb-2">Expected Value</p>
        <div className={`font-display text-5xl md:text-6xl ${evColor}`}>
          {ev > 0 ? '+' : ''}<CountUpNumber value={Math.abs(ev)} duration={1000} decimals={1} />%
        </div>
        <p className={`text-sm font-body mt-2 ${evColor}`}>
          {evLabel}
        </p>
        <p className="text-[11px] font-body mt-1 text-muted-foreground">
          {getEvExplanation(ev)}
        </p>
        {ev === 0 && (
          <p className="text-xs font-body mt-3 text-oracle-draw flex items-center justify-center gap-1">
            ⚠️ Odds reais não conectadas — configure VITE_ODDS_API_KEY para EV real
          </p>
        )}
        {ev > 0 && (
          <p className="text-xs font-body mt-3 text-oracle-win flex items-center justify-center gap-1">
            ✅ Edge positivo detectado
          </p>
        )}
        {ev < 0 && (
          <p className="text-xs font-body mt-3 text-oracle-loss flex items-center justify-center gap-1">
            ❌ Valor negativo — considere não apostar
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kelly */}
        <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
          <p className="text-xs font-body text-oracle-muted uppercase tracking-wider mb-1">Half-Kelly Fraction</p>
          <div className="font-display text-3xl text-foreground">
            <CountUpNumber value={primaryBet.kellyFraction} duration={800} decimals={1} />%
          </div>
          <p className="text-xs font-body text-oracle-muted mt-1">do bankroll recomendado</p>
        </div>

        {/* Market */}
        <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
          <p className="text-xs font-body text-oracle-muted uppercase tracking-wider mb-1">Aposta Principal</p>
          <p className="font-display text-lg text-foreground leading-tight">{primaryBet.market}</p>
          <p className={`text-xs font-display mt-1 ${getConfColor(primaryBet.confidence)}`}>
            GRAU {primaryBet.confidence}
          </p>
        </div>
      </div>

      {/* Reasoning */}
      <div className="border-t border-border pt-3">
        <p className="text-sm font-body text-muted-foreground leading-relaxed">
          {primaryBet.reasoning}
        </p>
      </div>

      {/* Alternative Bets */}
      {oracle.alternativeBets && oracle.alternativeBets.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-body text-oracle-muted uppercase tracking-wider">Apostas Alternativas</p>
          <div className="flex flex-wrap gap-2">
            {oracle.alternativeBets.map((bet, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border"
              >
                <Percent className="w-3 h-3 text-oracle-muted" />
                <span className="text-xs font-body text-foreground">{bet.market}</span>
                <span className={`text-xs font-display ${getConfColor(bet.confidence)}`}>
                  {bet.confidence}
                </span>
                <span className={`text-xs font-body ${bet.ev > 0 ? 'text-oracle-win' : 'text-oracle-loss'}`}>
                  {bet.ev > 0 ? '+' : ''}{typeof bet.ev === 'number' ? bet.ev.toFixed(1) : bet.ev}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function getConfColor(conf: string): string {
  if (conf === 'A+' || conf === 'A') return 'text-oracle-win';
  if (conf === 'B') return 'text-oracle-draw';
  return 'text-oracle-loss';
}
