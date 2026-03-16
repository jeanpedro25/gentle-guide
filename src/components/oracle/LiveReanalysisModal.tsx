import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw } from 'lucide-react';
import { LiveAdvice } from '@/hooks/useLiveAdvisor';

interface LiveReanalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  advice: LiveAdvice | null;
  isLoading: boolean;
  homeTeam: string;
  awayTeam: string;
  score?: string;
}

const DECISION_CONFIG: Record<string, { color: string; bg: string; border: string; emoji: string; label: string }> = {
  HOLD: { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/40', emoji: '🟢', label: 'MANTER' },
  CASHOUT: { color: 'text-oracle-draw', bg: 'bg-oracle-draw/10', border: 'border-oracle-draw/40', emoji: '🟡', label: 'CASH OUT' },
  HEDGE: { color: 'text-oracle-draw', bg: 'bg-oracle-draw/10', border: 'border-oracle-draw/40', emoji: '🟡', label: 'PROTEÇÃO' },
  BET_MORE: { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/40', emoji: '🟢', label: 'APOSTAR MAIS' },
};

function mapToDecision(action: string): string {
  if (action === 'CASHOUT') return 'CASH_OUT';
  if (action === 'HOLD') return 'MANTER';
  return action;
}

export function LiveReanalysisModal({ isOpen, onClose, advice, isLoading, homeTeam, awayTeam, score }: LiveReanalysisModalProps) {
  if (!isOpen) return null;

  const config = advice ? (DECISION_CONFIG[advice.action] ?? DECISION_CONFIG.HOLD) : DECISION_CONFIG.HOLD;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="glass-card w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-5"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              <h2 className="font-display text-xl tracking-wider text-foreground">RE-ANÁLISE AO VIVO</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {score && (
            <div className="text-center">
              <p className="font-body text-sm text-muted-foreground">{homeTeam} vs {awayTeam}</p>
              <p className="font-display text-3xl text-foreground">{score}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center py-12 space-y-4">
              <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="font-body text-muted-foreground text-sm">Re-analisando jogo ao vivo...</p>
            </div>
          ) : advice ? (
            <>
              {/* Decision */}
              <div className={`p-5 rounded-xl border text-center ${config.bg} ${config.border}`}>
                <p className="text-3xl mb-2">{config.emoji}</p>
                <p className={`font-display text-3xl tracking-widest ${config.color}`}>{config.label}</p>
              </div>

              {/* Confidence */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-body">
                  <span className="text-muted-foreground">Confiança atual</span>
                  <span className="text-foreground">{advice.confidence}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${advice.confidence}%` }}
                    className={`h-full rounded-full ${
                      advice.confidence >= 70 ? 'bg-primary' : advice.confidence >= 40 ? 'bg-oracle-draw' : 'bg-destructive'
                    }`}
                  />
                </div>
              </div>

              {/* Risk level */}
              <div className="flex items-center justify-between glass-card p-3">
                <span className="text-xs font-body text-muted-foreground">Nível de risco</span>
                <span className={`font-display text-sm ${
                  advice.riskLevel === 'CRITICO' ? 'text-destructive' :
                  advice.riskLevel === 'ALTO' ? 'text-destructive' :
                  advice.riskLevel === 'MEDIO' ? 'text-oracle-draw' : 'text-primary'
                }`}>{advice.riskLevel}</span>
              </div>

              {/* Reasoning */}
              <div className="space-y-2">
                <p className="text-xs font-display tracking-wider text-muted-foreground">MOTIVO</p>
                <p className="font-body text-sm text-foreground leading-relaxed">{advice.reasoning}</p>
              </div>

              {/* Suggestion */}
              <div className="space-y-2">
                <p className="text-xs font-display tracking-wider text-muted-foreground">SUGESTÃO</p>
                <p className="font-body text-sm text-foreground">{advice.suggestion}</p>
              </div>

              {/* Cash out instructions */}
              {advice.action === 'CASHOUT' && (
                <div className="glass-card p-4 border border-oracle-draw/30 space-y-2">
                  <p className="text-xs font-display tracking-wider text-oracle-draw">COMO FAZER CASH OUT</p>
                  <p className="font-body text-sm text-muted-foreground">
                    Vá na EstrelaBet → Minha Aposta → Cash Out → Confirmar
                  </p>
                  <p className="font-body text-xs text-muted-foreground">{advice.profitTip}</p>
                </div>
              )}
            </>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
