import { motion } from 'framer-motion';
import { OracleAnalysis } from '@/types/prediction';
import { TrendingUp, Calculator, Percent } from 'lucide-react';
import { CountUpNumber } from './CountUpNumber';

interface EVDisplayProps {
  oracle: OracleAnalysis;
}

export function EVDisplay({ oracle }: EVDisplayProps) {
  const { primaryBet } = oracle;
  const evPositive = primaryBet.ev > 0;
  const evColor = evPositive ? 'text-oracle-win' : 'text-oracle-loss';
  const evBg = evPositive ? 'bg-oracle-win/10 border-oracle-win' : 'bg-oracle-loss/10 border-oracle-loss';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card p-5 space-y-4"
    >
      <h3 className="font-display text-lg tracking-wider text-foreground flex items-center gap-2">
        <Calculator className="w-5 h-5 text-primary" />
        EXPECTED VALUE & KELLY
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* EV */}
        <div className={`rounded-xl border p-4 text-center ${evBg}`}>
          <p className="text-xs font-body text-oracle-muted uppercase tracking-wider mb-1">Expected Value</p>
          <div className={`font-display text-3xl ${evColor}`}>
            {evPositive ? '+' : ''}<CountUpNumber value={Math.abs(primaryBet.ev)} duration={800} decimals={1} />%
          </div>
          <p className="text-xs font-body text-oracle-muted mt-1">
            {evPositive ? 'Valor detectado ✓' : 'Sem valor ✗'}
          </p>
        </div>

        {/* Kelly */}
        <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center">
          <p className="text-xs font-body text-oracle-muted uppercase tracking-wider mb-1">Half-Kelly</p>
          <div className="font-display text-3xl text-foreground">
            <CountUpNumber value={primaryBet.kellyFraction} duration={800} decimals={1} />%
          </div>
          <p className="text-xs font-body text-oracle-muted mt-1">do bankroll</p>
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
                  {bet.ev > 0 ? '+' : ''}{bet.ev.toFixed(1)}%
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
