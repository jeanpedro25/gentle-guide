import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, TrendingUp, AlertTriangle, Target, DollarSign, Check } from 'lucide-react';
import { OracleAnalysis, probAsPercent } from '@/types/prediction';
import { BetCard } from './BetCard';
import { toast } from 'sonner';

interface AnalyzeModalProps {
  isOpen: boolean;
  onClose: () => void;
  oracle: OracleAnalysis | null;
  homeTeam: string;
  awayTeam: string;
  isLoading: boolean;
  bankrollAmount?: number;
  fixtureId?: number;
  league?: string;
}

export function AnalyzeModal({ 
  isOpen, 
  onClose, 
  oracle, 
  homeTeam, 
  awayTeam, 
  isLoading, 
  bankrollAmount = 200,
  fixtureId,
  league = ''
}: AnalyzeModalProps) {
  if (!isOpen) return null;

  const kellyStake = oracle ? Math.min(oracle.primaryBet.kellyFraction * bankrollAmount, bankrollAmount * 0.1) : 0;
  const kellyPct = oracle ? Math.min(oracle.primaryBet.kellyFraction * 100, 10) : 0;

  const handleClose = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="font-display text-xl tracking-wider text-foreground">ANÁLISE PROFETA</h2>
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center py-12 space-y-4">
              <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="font-body text-muted-foreground text-sm">Analisando com IA...</p>
            </div>
          ) : oracle ? (
            <>
              {oracle.predictedScore && (
                <div className="text-center space-y-2">
                  <p className="text-xs font-display tracking-wider text-muted-foreground">PLACAR PREVISTO</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-body text-sm text-foreground">{homeTeam}</span>
                    <span className="font-display text-5xl text-primary">{oracle.predictedScore.home}</span>
                    <span className="font-display text-2xl text-muted-foreground">×</span>
                    <span className="font-display text-5xl text-primary">{oracle.predictedScore.away}</span>
                    <span className="font-body text-sm text-foreground">{awayTeam}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-body">
                  <span className="text-muted-foreground">Confiança</span>
                  <span className="text-foreground font-semibold">{oracle.primaryBet.confidence}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${oracle.primaryBet.ev > 15 ? 95 : oracle.primaryBet.ev > 8 ? 75 : oracle.primaryBet.ev > 3 ? 55 : 30}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      oracle.verdict === 'APOSTAR' ? 'bg-primary neon-glow-green' : 'bg-destructive neon-glow-crimson'
                    }`}
                  />
                </div>
              </div>

              <div className={`p-4 rounded-xl border text-center ${
                oracle.verdict === 'APOSTAR'
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-destructive/40 bg-destructive/5'
              }`}>
                <span className={`font-display text-2xl tracking-widest ${
                  oracle.verdict === 'APOSTAR' ? 'text-primary' : 'text-destructive'
                }`}>
                  {oracle.verdict === 'APOSTAR' ? '✅ APOSTAR' : '❌ PASSAR'}
                </span>
              </div>

              {/* NOVO: Card de Aposta Premium aqui no Modal */}
              {fixtureId && (
                <BetCard
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                  league={league}
                  fixtureId={fixtureId}
                  prediction={oracle.primaryBet.market.includes(homeTeam) ? '1' : oracle.primaryBet.market.includes(awayTeam) ? '2' : 'X'}
                  odd={oracle.primaryBet.ev > 0 ? 1.85 : 2.10}
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-3 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-body">
                    <Target className="w-3 h-3" /> Mercado
                  </div>
                  <p className="font-body text-sm text-foreground font-semibold">{oracle.primaryBet.market}</p>
                </div>
                <div className="glass-card p-3 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-body">
                    <TrendingUp className="w-3 h-3" /> EV
                  </div>
                  <p className={`font-display text-lg ${oracle.primaryBet.ev > 0 ? 'text-primary' : 'text-destructive'}`}>
                    {oracle.primaryBet.ev > 0 ? '+' : ''}{oracle.primaryBet.ev.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="glass-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
                  <DollarSign className="w-3 h-3" /> Kelly Criterion — Sugestão
                </div>
                <p className="font-display text-xl text-primary">
                  R$ {kellyStake.toFixed(2)} <span className="text-sm text-muted-foreground">({kellyPct.toFixed(1)}% da banca)</span>
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-display tracking-wider text-muted-foreground">JUSTIFICATIVA</p>
                <p className="font-body text-sm text-foreground leading-relaxed">{oracle.primaryBet.reasoning}</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: homeTeam, value: oracle.probabilities.homeWin },
                  { label: 'Empate', value: oracle.probabilities.draw },
                  { label: awayTeam, value: oracle.probabilities.awayWin },
                ].map(({ label, value }) => (
                  <div key={label} className="glass-card p-3 text-center">
                    <p className="text-xs font-body text-muted-foreground truncate">{label}</p>
                    <p className="font-display text-lg text-foreground">{probAsPercent(value).toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}