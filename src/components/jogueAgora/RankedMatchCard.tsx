import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Clock, Zap, BarChart3, Timer } from 'lucide-react';
import { AnaliseJogo, PICK_LABELS_FULL } from '@/lib/jogueAgora';
import { FIXED_LEAGUES, useLeagueFilter } from '@/contexts/LeagueFilterContext';

interface Props {
  analise: AnaliseJogo;
  rank: number;
  onAnalyze: () => void;
  onBet: () => void;
}

const FIXED_LEAGUE_IDS = new Set(FIXED_LEAGUES.map((league) => league.id));

function CountdownTimer({ date }: { date: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const target = new Date(date).getTime();
    
    const update = () => {
      const now = Date.now();
      const diff = target - now;
      
      if (diff <= 0) {
        setTimeLeft('Começando...');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setTimeLeft(`Começa em ${hours}h ${minutes}min`);
      } else {
        setTimeLeft(`Começa em ${minutes}min`);
      }
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [date]);

  return (
    <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-lg border border-primary/20 flex items-center gap-1">
      <Timer className="w-3 h-3 animate-pulse" /> {timeLeft}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const filled = Math.round(value / 10);
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2.5 rounded-sm ${i < filled ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>
      <span className="text-xs font-bold text-foreground">{value}%</span>
    </div>
  );
}

export function RankedMatchCard({ analise, rank, onAnalyze, onBet }: Props) {
  const { fixture } = analise;
  const { isLeagueAllowed, registerDynamicLeague, selectedLeagueIds } = useLeagueFilter();
  const leagueId = String(fixture.league.id);
  const hasOnlyFixedSelections = selectedLeagueIds.length > 0 && selectedLeagueIds.every((id) => FIXED_LEAGUE_IDS.has(id));

  useEffect(() => {
    registerDynamicLeague({
      id: leagueId,
      apiId: fixture.league.id,
      nome: fixture.league.name,
      bandeira: '🏟️',
    });
  }, [fixture.league.id, fixture.league.name, registerDynamicLeague]);

  if (!isLeagueAllowed(fixture.league.name, fixture.league.id) && !hasOnlyFixedSelections) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1A1A1A] border border-[#2B2B2B] rounded-2xl p-5 space-y-4 hover:border-primary/40 transition-all shadow-xl relative overflow-hidden"
    >
      {/* Rank Badge */}
      <div className="absolute top-0 left-0 bg-primary text-black font-black text-[10px] px-3 py-1 rounded-br-xl">
        TOP {rank}
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate max-w-[180px]">
          {fixture.league.name}
        </span>
        <CountdownTimer date={fixture.fixture.date} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-1">
          <p className="text-base font-black text-white leading-tight">{fixture.teams.home.name}</p>
          <p className="text-sm font-bold text-muted-foreground">vs {fixture.teams.away.name}</p>
        </div>
        <div className="bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-center min-w-[80px]">
          <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Placar</p>
          <p className="text-xl font-black text-primary tracking-tighter">{analise.placar_provavel}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
          <Target className="w-4 h-4 text-primary" />
          <div>
            <p className="text-[8px] font-black text-primary uppercase">Previsão</p>
            <p className="text-[10px] font-black text-white">{PICK_LABELS_FULL[analise.melhor_resultado]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <TrendingUp className="w-4 h-4 text-oracle-win" />
          <div>
            <p className="text-[8px] font-black text-oracle-win uppercase">Valor (EV)</p>
            <p className="text-[10px] font-black text-white">+{analise.melhor_ev.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-4">
        <div className="space-y-1">
          <p className="text-[9px] font-black text-muted-foreground uppercase">Confiança do Profeta</p>
          <ConfidenceBar value={analise.confianca} />
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-muted-foreground uppercase">Odd Estimada</p>
          <p className="text-sm font-black text-white">@{analise.melhor_odd.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onAnalyze}
          className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-black hover:bg-white/10 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
        >
          <BarChart3 className="w-4 h-4 text-primary" /> Analisar
        </button>
        <button
          onClick={onBet}
          className="flex-1 py-3 rounded-xl bg-primary text-black text-xs font-black hover:brightness-110 transition-all flex items-center justify-center gap-2 uppercase tracking-widest shadow-[0_0_20px_rgba(236,200,19,0.2)]"
        >
          <Zap className="w-4 h-4 fill-current" /> Apostar
        </button>
      </div>
    </motion.div>
  );
}