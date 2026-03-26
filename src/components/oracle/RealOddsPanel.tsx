/**
 * RealOddsPanel — exibe odds reais do mercado + EV vs nosso Poisson.
 * Integrado com The Odds API.
 */
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Loader2, ExternalLink, Star, AlertCircle } from 'lucide-react';
import { useMatchOdds } from '@/hooks/useMatchOdds';

interface RealOddsPanelProps {
  homeTeam: string;
  awayTeam: string;
  leagueId?: string;
  leagueName?: string;
  homeProb: number;
  drawProb: number;
  awayProb: number;
}

function EVBadge({ ev }: { ev: number }) {
  const pct = (ev * 100).toFixed(1);
  if (ev > 0.08) return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-oracle-win/20 text-oracle-win">+{pct}% EV ⚡</span>;
  if (ev > 0.03) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400">+{pct}% EV</span>;
  if (ev > 0) return <span className="px-2 py-0.5 rounded-full text-[10px] text-muted-foreground bg-white/5">+{pct}% EV</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] text-destructive bg-destructive/10">{pct}% EV</span>;
}

function OddsRow({
  label, ourProb, bestOdd, bookmaker, isWinner
}: {
  label: string; ourProb: number; bestOdd: number; bookmaker: string; isWinner: boolean;
}) {
  const impliedProb = bestOdd > 0 ? (1 / bestOdd) * 100 : 0;
  const ev = bestOdd > 0 ? ourProb * bestOdd - 1 : -1;
  const hasValue = ev > 0.03;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      hasValue
        ? 'bg-oracle-win/5 border-oracle-win/30'
        : isWinner
        ? 'bg-white/5 border-border/50'
        : 'bg-transparent border-transparent'
    }`}>
      <div className="w-16 text-[11px] font-bold text-muted-foreground uppercase">{label}</div>

      {/* Nossa prob */}
      <div className="flex-1">
        <div className="text-xs text-muted-foreground mb-0.5">Nossa prob.</div>
        <div className="font-bold text-white">{(ourProb * 100).toFixed(0)}%</div>
      </div>

      {/* Mercado implica */}
      <div className="flex-1">
        <div className="text-xs text-muted-foreground mb-0.5">Mercado</div>
        <div className="font-bold text-muted-foreground">{impliedProb.toFixed(0)}%</div>
      </div>

      {/* Melhor odd */}
      <div className="flex-1 text-right">
        <div className="text-xs text-muted-foreground mb-0.5">{bookmaker || '—'}</div>
        <div className={`text-lg font-black ${hasValue ? 'text-oracle-win' : 'text-white'}`}>
          {bestOdd > 0 ? bestOdd.toFixed(2) : '—'}
        </div>
      </div>

      {/* EV */}
      <div className="w-20 text-right">
        {bestOdd > 0 ? <EVBadge ev={ev} /> : <span className="text-[10px] text-muted-foreground">sem odds</span>}
      </div>
    </div>
  );
}

export function RealOddsPanel({
  homeTeam, awayTeam, leagueId, leagueName,
  homeProb, drawProb, awayProb
}: RealOddsPanelProps) {
  const { odds, recommendation, isLoading, isError, sportKey } = useMatchOdds({
    homeTeam, awayTeam, leagueId, leagueName,
    homeProb, drawProb, awayProb,
    enabled: homeProb + drawProb + awayProb > 0.5,
  });

  if (!sportKey) {
    return (
      <div className="glass-card p-4 border border-border/30 text-center text-muted-foreground text-sm">
        Liga sem cobertura de odds em tempo real.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card border border-primary/20 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between bg-primary/5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="font-black text-sm uppercase tracking-wide text-primary">Odds Reais do Mercado</span>
        </div>
        <span className="text-[10px] text-muted-foreground">via The Odds API</span>
      </div>

      <div className="p-4 space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Consultando mercado...</span>
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
            <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
            <span>Odds indisponíveis para este jogo no momento.</span>
          </div>
        )}

        {!isLoading && !isError && !odds && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            Este jogo ainda não está listado nas casas de apostas.
          </div>
        )}

        {odds && (
          <>
            {/* Tabela de odds */}
            <div className="space-y-1">
              <OddsRow
                label="Casa"
                ourProb={homeProb}
                bestOdd={odds.bestOdds.home.price}
                bookmaker={odds.bestOdds.home.bookmaker}
                isWinner={homeProb > drawProb && homeProb > awayProb}
              />
              <OddsRow
                label="Empate"
                ourProb={drawProb}
                bestOdd={odds.bestOdds.draw.price}
                bookmaker={odds.bestOdds.draw.bookmaker}
                isWinner={drawProb > homeProb && drawProb > awayProb}
              />
              <OddsRow
                label="Fora"
                ourProb={awayProb}
                bestOdd={odds.bestOdds.away.price}
                bookmaker={odds.bestOdds.away.bookmaker}
                isWinner={awayProb > homeProb && awayProb > drawProb}
              />
            </div>

            {/* Recomendação */}
            {recommendation && recommendation.outcome && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 p-4 rounded-xl bg-oracle-win/10 border border-oracle-win/40"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-oracle-win" />
                  <span className="text-xs font-black text-oracle-win uppercase tracking-wide">Oportunidade de Valor!</span>
                </div>
                <p className="text-sm text-white font-bold">{recommendation.label}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Poisson: {(recommendation.ourProb * 100).toFixed(0)}% vs Mercado: {(recommendation.impliedProb * 100).toFixed(0)}% implícito
                </p>
              </motion.div>
            )}

            {recommendation && !recommendation.outcome && (
              <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-border/30">
                <TrendingDown className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Nenhum resultado com EV positivo (&gt;3%). O mercado está bem precificado para este jogo.
                </p>
              </div>
            )}

            {/* Total de casas */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-muted-foreground">
                {odds.bookmakers.length} casa{odds.bookmakers.length !== 1 ? 's' : ''} comparadas
              </span>
              {odds.remainingRequests !== undefined && (
                <span className="text-[10px] text-muted-foreground">
                  {odds.remainingRequests} req. restantes este mês
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
