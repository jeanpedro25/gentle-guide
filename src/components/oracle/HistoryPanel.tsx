import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { MatchAnalysis, predictionLabels } from '@/types/prediction';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: MatchAnalysis[];
  onSelect: (analysis: MatchAnalysis) => void;
}

export function HistoryPanel({ isOpen, onClose, history, onSelect }: HistoryPanelProps) {
  const getColor = (prediction: string) => {
    if (prediction === 'HOME_WIN') return 'text-oracle-win border-oracle-win';
    if (prediction === 'DRAW') return 'text-oracle-draw border-oracle-draw';
    return 'text-oracle-loss border-oracle-loss';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-80 glass-card z-50 p-5 overflow-y-auto border-l border-border"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg tracking-wider text-foreground">ÚLTIMAS ANÁLISES</h3>
              <button onClick={onClose} className="text-oracle-muted hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {history.length === 0 ? (
              <p className="text-sm font-body text-oracle-muted text-center py-8">
                Nenhuma análise ainda. Faça sua primeira previsão!
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    onClick={() => { onSelect(item); onClose(); }}
                    className="w-full text-left glass-card p-3 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-body text-oracle-muted">
                        {new Date(item.timestamp).toLocaleDateString('pt-BR')}
                      </span>
                      <span className={`text-xs font-display border rounded-full px-2 py-0.5 ${getColor(item.result.prediction)}`}>
                        {predictionLabels[item.result.prediction]}
                      </span>
                    </div>
                    <p className="text-sm font-body text-foreground">
                      {item.homeTeam} vs {item.awayTeam}
                    </p>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
