import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, XCircle, Clock, Filter, Zap, Target, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePredictions, useBetResults, PredictionRow, BetResultRow } from '@/hooks/usePredictions';
import { useBets, BetRow } from '@/hooks/useBets';
import { AnalyzeModal } from '@/components/oracle/AnalyzeModal';
import { analyzeMatch } from '@/services/oracleService';
import { fetchTodayMatches } from '@/services/footballApi';
import { OracleAnalysis } from '@/types/prediction';
import { toast } from 'sonner';

type FilterStatus = 'all' | 'pending' | 'won' | 'lost';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { data: bets = [], isLoading } = useBets();
  const [filter, setFilter] = useState<FilterStatus>('all');
  
  // Modal de Análise
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [selectedBet, setSelectedBet] = useState<BetRow | null>(null);
  const [oracleResult, setOracleResult] = useState<OracleAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const filtered = useMemo(() => {
    return bets.filter(b => {
      if (filter === 'all') return true;
      return b.status === filter;
    });
  }, [bets, filter]);

  const stats = useMemo(() => {
    return {
      total: bets.length,
      wins: bets.filter(b => b.status === 'won').length,
      losses: bets.filter(b => b.status === 'lost').length,
      pending: bets.filter(b => b.status === 'pending').length,
    };
  }, [bets]);

  const handleOpenAnalysis = async (bet: BetRow) => {
    setSelectedBet(bet);
    setShowAnalyzeModal(true);
    setIsAnalyzing(true);
    setOracleResult(null);

    try {
      const matches = await fetchTodayMatches();
      const fixture = matches.find(m => m.fixture.id === bet.fixture_id);
      
      if (fixture) {
        const result = await analyzeMatch(fixture, null, null, []);
        setOracleResult(result);
      } else {
        // Fallback: se não achar o jogo hoje, tenta simular ou avisa
        toast.error('Dados originais do jogo não encontrados para re-análise.');
        setShowAnalyzeModal(false);
      }
    } catch (err) {
      toast.error('Erro ao carregar análise.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black gold-gradient-text uppercase tracking-tighter">Histórico Central</h1>
          <p className="text-xs text-muted-foreground">Todas as suas operações em um só lugar</p>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} color="text-foreground" />
        <StatCard label="Pendentes" value={stats.pending} color="text-primary" />
        <StatCard label="Greens ✅" value={stats.wins} color="text-oracle-win" />
        <StatCard label="Reds ❌" value={stats.losses} color="text-destructive" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        {(['all', 'pending', 'won', 'lost'] as FilterStatus[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-4 py-2 rounded-full text-[10px] font-bold border transition-all ${
              filter === f
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-muted-foreground hover:border-primary/30'
            }`}
          >
            {f === 'all' ? 'TODOS' : f === 'pending' ? '⏳ PENDENTES' : f === 'won' ? '✅ GREENS' : '❌ REDS'}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground animate-pulse">Carregando histórico...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          Nenhuma aposta encontrada com este filtro.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bet, i) => (
            <motion.button
              key={bet.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => handleOpenAnalysis(bet)}
              className="w-full text-left"
            >
              <BetHistoryCard bet={bet} />
            </motion.button>
          ))}
        </div>
      )}

      <AnalyzeModal
        isOpen={showAnalyzeModal}
        onClose={() => setShowAnalyzeModal(false)}
        oracle={oracleResult}
        homeTeam={selectedBet?.home_team ?? ''}
        awayTeam={selectedBet?.away_team ?? ''}
        isLoading={isAnalyzing}
      />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass-card p-4 text-center border border-border/50">
      <p className={`font-black text-2xl ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{label}</p>
    </div>
  );
}

function BetHistoryCard({ bet }: { bet: BetRow }) {
  const status = bet.status;
  const predLabel = bet.prediction === '1' ? 'Casa' : bet.prediction === 'X' ? 'Empate' : 'Fora';

  return (
    <div className={`glass-card p-4 border transition-all hover:border-primary/40 ${
      status === 'won' ? 'border-oracle-win/30 bg-oracle-win/5' :
      status === 'lost' ? 'border-destructive/30 bg-destructive/5' :
      'border-border bg-card'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-bold text-sm text-foreground">{bet.home_team} vs {bet.away_team}</p>
          <p className="text-[10px] text-muted-foreground uppercase">{bet.league} • {new Date(bet.created_at).toLocaleDateString('pt-BR')}</p>
        </div>
        <div className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${
          status === 'won' ? 'text-oracle-win border-oracle-win/40 bg-oracle-win/10' :
          status === 'lost' ? 'text-destructive border-destructive/40 bg-destructive/10' :
          'text-primary border-primary/40 bg-primary/10'
        }`}>
          {status === 'won' ? 'GREEN ✅' : status === 'lost' ? 'RED ❌' : 'PENDENTE ⏳'}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="space-y-1">
          <p className="text-[9px] text-muted-foreground font-bold uppercase">Previsão</p>
          <p className="text-xs font-black text-primary">{predLabel}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[9px] text-muted-foreground font-bold uppercase">Aposta</p>
          <p className="text-xs font-black text-foreground">R$ {bet.stake.toFixed(2)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[9px] text-muted-foreground font-bold uppercase">Resultado</p>
          <p className="text-xs font-black text-foreground">{bet.actual_score ?? '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[9px] text-muted-foreground font-bold uppercase">Lucro Real</p>
          <p className={`text-xs font-black ${bet.profit_loss >= 0 ? 'text-oracle-win' : 'text-destructive'}`}>
            {status === 'pending' ? '—' : `${bet.profit_loss >= 0 ? '+' : ''}R$ ${bet.profit_loss.toFixed(2)}`}
          </p>
        </div>
      </div>
      
      <div className="mt-3 pt-2 border-t border-border/30 flex items-center justify-center gap-1 text-[9px] text-muted-foreground font-bold uppercase">
        <Zap className="w-3 h-3 text-primary" /> Clique para ver análise detalhada
      </div>
    </div>
  );
}