import { motion } from 'framer-motion';
import { useMultipla, MultiplaSelection } from '@/contexts/MultiplaContext';
import { X, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

interface Props {
  onClose: () => void;
}

function oddToProbability(odd: number): number {
  return 1 / odd;
}

function gradeFromOdd(odd: number): 'A' | 'B' | 'C' | 'D' {
  const prob = oddToProbability(odd);
  if (prob >= 0.6) return 'A';
  if (prob >= 0.45) return 'B';
  if (prob >= 0.3) return 'C';
  return 'D';
}

function gradeColor(grade: string) {
  switch (grade) {
    case 'A': return 'text-primary';
    case 'B': return 'text-oracle-draw';
    case 'C': return 'text-orange-400';
    case 'D': return 'text-destructive';
    default: return 'text-muted-foreground';
  }
}

function pickIcon(grade: string) {
  if (grade === 'A' || grade === 'B') return <CheckCircle className="w-4 h-4 text-primary" />;
  return <AlertTriangle className="w-4 h-4 text-oracle-draw" />;
}

const STAKES = [10, 20, 50, 100];

export function MultiplaAnalysis({ onClose }: Props) {
  const { selections, combinedOdds } = useMultipla();

  const combinedProb = selections.reduce((acc, s) => acc * oddToProbability(s.odd), 1);
  const fairOdds = 1 / combinedProb;
  const ev = ((combinedOdds / fairOdds) - 1) * 100;
  const hasWeakPick = selections.some(s => {
    const g = gradeFromOdd(s.odd);
    return g === 'C' || g === 'D';
  });

  const pickLabel = (sel: MultiplaSelection) => {
    if (sel.pick === 'home') return `${sel.fixture.teams.home.name} vence`;
    if (sel.pick === 'away') return `${sel.fixture.teams.away.name} vence`;
    return 'Empate';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
          <h2 className="font-display text-lg tracking-wider text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            SUA MÚLTIPLA
          </h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Individual picks */}
          {selections.map((sel) => {
            const grade = gradeFromOdd(sel.odd);
            return (
              <div key={sel.fixture.fixture.id} className="flex items-start gap-3 bg-secondary/30 rounded-xl p-3">
                {pickIcon(grade)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body text-foreground">{pickLabel(sel)}</p>
                  <p className="text-xs font-body text-muted-foreground">
                    {sel.fixture.teams.home.name} vs {sel.fixture.teams.away.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-primary">@{sel.odd.toFixed(2)}</p>
                  <p className={`text-xs font-display ${gradeColor(grade)}`}>Grau {grade}</p>
                </div>
              </div>
            );
          })}

          {/* Combined stats */}
          <div className="border border-border rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-body text-muted-foreground">Odd combinada</span>
              <span className="font-display text-lg text-primary">{combinedOdds.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-body text-muted-foreground">Prob. combinada</span>
              <span className="font-display text-lg text-foreground">{(combinedProb * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-body text-muted-foreground">EV da múltipla</span>
              <span className={`font-display text-lg ${ev >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {ev >= 0 ? '+' : ''}{ev.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Potential returns */}
          <div className="space-y-2">
            <p className="text-xs font-body text-muted-foreground">Retorno potencial:</p>
            <div className="grid grid-cols-4 gap-2">
              {STAKES.map(stake => (
                <div key={stake} className="bg-secondary/50 rounded-lg p-2 text-center">
                  <p className="text-xs text-muted-foreground">R${stake}</p>
                  <p className="text-sm font-semibold text-primary">R${(stake * combinedOdds).toFixed(0)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {ev < 0 && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-body text-destructive font-semibold">⚠️ ATENÇÃO: EV negativo</p>
                <p className="text-xs font-body text-muted-foreground mt-1">
                  Esta múltipla não tem valor matemático favorável. Considere revisar suas seleções.
                </p>
              </div>
            </div>
          )}

          {hasWeakPick && (
            <div className="flex items-start gap-2 bg-oracle-draw/10 border border-oracle-draw/20 rounded-xl p-3">
              <AlertTriangle className="w-5 h-5 text-oracle-draw shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-body text-oracle-draw font-semibold">Seleções com risco</p>
                <p className="text-xs font-body text-muted-foreground mt-1">
                  Uma ou mais seleções têm grau C ou D. Isso aumenta significativamente o risco da múltipla.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
