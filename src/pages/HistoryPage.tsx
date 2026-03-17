import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePredictions, useBetResults, PredictionRow, BetResultRow } from '@/hooks/usePredictions';
import { useState, useMemo } from 'react';
import { BottomNav } from '@/components/oracle/BottomNav';

type FilterStatus = 'all' | 'pending' | 'won' | 'lost';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { data: predictions = [] } = usePredictions();
  const { data: betResults = [] } = useBetResults();
  const [filter, setFilter] = useState<FilterStatus>('all');

  const resultsMap = useMemo(() => {
    const map = new Map<string, BetResultRow>();
    for (const r of betResults) {
      map.set(r.prediction_id, r);
    }
    return map;
  }, [betResults]);

  const filtered = useMemo(() => {
    return predictions.filter(p => {
      if (filter === 'all') return true;
      const result = resultsMap.get(p.id);
      if (filter === 'pending') return !result || result.won === null;
      if (filter === 'won') return result?.won === true;
      if (filter === 'lost') return result?.won === false;
      return true;
    });
  }, [predictions, filter, resultsMap]);

  const stats = useMemo(() => {
    const resolved = betResults.filter(r => r.won !== null);
    const wins = resolved.filter(r => r.won);
    return {
      total: predictions.length,
      resolved: resolved.length,
      wins: wins.length,
      losses: resolved.length - wins.length,
      pending: predictions.length - resolved.length,
    };
  }, [predictions, betResults]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 bg-background/80 backdrop-blur-lg border-b border-border flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-extrabold tracking-tight gold-gradient-text">HISTÓRICO</h1>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Total" value={stats.total} color="text-foreground" />
          <StatCard label="Pendente" value={stats.pending} color="text-primary" />
          <StatCard label="Green ✅" value={stats.wins} color="text-oracle-win" />
          <StatCard label="Red ❌" value={stats.losses} color="text-destructive" />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          {(['all', 'pending', 'won', 'lost'] as FilterStatus[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                filter === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'pending' ? '⏳ Pendente' : f === 'won' ? '✅ Green' : '❌ Red'}
            </button>
          ))}
        </div>

        {/* Predictions list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">Nenhuma análise encontrada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p, i) => (
              <HistoryCard key={p.id} prediction={p} result={resultsMap.get(p.id)} index={i} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass-card p-3 text-center">
      <p className={`font-extrabold text-xl ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground font-semibold uppercase">{label}</p>
    </div>
  );
}

function HistoryCard({ prediction: p, result, index }: { prediction: PredictionRow; result?: BetResultRow; index: number }) {
  const status = result?.won === true ? 'won' : result?.won === false ? 'lost' : 'pending';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`glass-card p-4 space-y-3 border ${
        status === 'won' ? 'border-oracle-win' :
        status === 'lost' ? 'border-oracle-loss' :
        'border-border'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-sm text-foreground">{p.home_team} vs {p.away_team}</p>
          <p className="text-[10px] text-muted-foreground">{p.league} • {new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
        </div>
        <div className="flex items-center gap-1">
          {status === 'won' && <CheckCircle className="w-5 h-5 text-oracle-win" />}
          {status === 'lost' && <XCircle className="w-5 h-5 text-destructive" />}
          {status === 'pending' && <Clock className="w-5 h-5 text-primary" />}
          <span className={`text-xs font-bold uppercase ${
            status === 'won' ? 'text-oracle-win' : status === 'lost' ? 'text-destructive' : 'text-primary'
          }`}>
            {status === 'won' ? 'GREEN' : status === 'lost' ? 'RED' : 'PENDENTE'}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="glass-card p-2">
          <p className="text-[9px] text-muted-foreground">Placar IA</p>
          <p className="text-sm font-bold text-primary">{p.predicted_score ?? '-'}</p>
        </div>
        <div className="glass-card p-2">
          <p className="text-[9px] text-muted-foreground">Confiança</p>
          <p className={`text-sm font-bold ${p.confidence >= 70 ? 'text-oracle-win' : p.confidence >= 40 ? 'text-primary' : 'text-destructive'}`}>
            {p.confidence}%
          </p>
        </div>
        <div className="glass-card p-2">
          <p className="text-[9px] text-muted-foreground">Mercado</p>
          <p className="text-[10px] font-bold text-foreground truncate">{p.recommended_market ?? '-'}</p>
        </div>
      </div>

      {/* Result row */}
      {result && (
        <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs">
          <span className="text-muted-foreground">Resultado real: <span className="text-foreground font-bold">{result.actual_score ?? '—'}</span></span>
          {result.profit_loss !== null && (
            <span className={`font-bold ${result.profit_loss >= 0 ? 'text-oracle-win' : 'text-destructive'}`}>
              {result.profit_loss >= 0 ? '+' : ''}R$ {result.profit_loss.toFixed(2)}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
