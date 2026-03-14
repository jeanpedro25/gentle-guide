import { motion, AnimatePresence } from 'framer-motion';
import { useMultipla } from '@/contexts/MultiplaContext';
import { X, Trash2, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { MultiplaAnalysis } from './MultiplaAnalysis';

const STAKE_OPTIONS = [10, 20, 50, 100];

export function MultiplaBar() {
  const { selections, removeSelection, clearAll, combinedOdds } = useMultipla();
  const [expanded, setExpanded] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  if (selections.length === 0) return null;

  const pickLabel = (pick: 'home' | 'draw' | 'away', fixture: typeof selections[0]['fixture']) => {
    if (pick === 'home') return fixture.teams.home.name;
    if (pick === 'away') return fixture.teams.away.name;
    return 'Empate';
  };

  return (
    <>
      <AnimatePresence>
        {showAnalysis && (
          <MultiplaAnalysis onClose={() => setShowAnalysis(false)} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-2xl"
      >
        {/* Expanded selections */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-sm tracking-wider text-foreground">SUA MÚLTIPLA</span>
                  <button onClick={clearAll} className="text-xs font-body text-destructive flex items-center gap-1 hover:underline">
                    <Trash2 className="w-3 h-3" /> Limpar tudo
                  </button>
                </div>
                {selections.map((sel) => (
                  <div key={sel.fixture.fixture.id} className="flex items-center justify-between bg-secondary/50 rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-body text-muted-foreground truncate">
                        {sel.fixture.teams.home.name} vs {sel.fixture.teams.away.name}
                      </p>
                      <p className="text-sm font-body text-foreground">
                        {pickLabel(sel.pick, sel.fixture)} <span className="text-primary font-semibold">@{sel.odd.toFixed(2)}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => removeSelection(sel.fixture.fixture.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* Potential returns */}
                <div className="border-t border-border pt-3 mt-3">
                  <p className="text-xs font-body text-muted-foreground mb-2">Retorno potencial:</p>
                  <div className="flex gap-2 flex-wrap">
                    {STAKE_OPTIONS.map(stake => (
                      <div key={stake} className="bg-secondary/50 rounded-lg px-3 py-1.5 text-center">
                        <p className="text-xs text-muted-foreground">R${stake}</p>
                        <p className="text-sm font-semibold text-primary">R${(stake * combinedOdds).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom bar */}
        <div className="flex items-center justify-between p-3 gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 min-w-0"
          >
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display text-sm">
              {selections.length}
            </div>
            <div className="text-left min-w-0">
              <p className="text-sm font-body text-foreground truncate">
                Múltipla • {selections.length} {selections.length === 1 ? 'jogo' : 'jogos'}
              </p>
              <p className="text-xs font-body text-primary font-semibold">
                Odd: {combinedOdds.toFixed(2)}
              </p>
            </div>
            <ChevronUp className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={() => setShowAnalysis(true)}
            disabled={selections.length < 2}
            className="shrink-0 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-display text-sm tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            VER ANÁLISE
          </button>
        </div>
      </motion.div>
    </>
  );
}
