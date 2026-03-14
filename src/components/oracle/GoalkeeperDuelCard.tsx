import { motion } from 'framer-motion';
import { OracleAnalysis } from '@/types/prediction';
import { Shield, Trophy } from 'lucide-react';

interface GoalkeeperDuelProps {
  oracle: OracleAnalysis;
  homeTeam: string;
  awayTeam: string;
}

function StatBar({ label, homeVal, awayVal, homeName, awayName }: {
  label: string; homeVal: number; awayVal: number; homeName: string; awayName: string;
}) {
  const max = Math.max(homeVal, awayVal, 1);
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-body text-muted-foreground text-center uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-xs font-display text-foreground w-8 text-right">{homeVal}</span>
        <div className="flex-1 flex gap-1 h-4">
          <div className="flex-1 flex justify-end">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(homeVal / max) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-l-full ${homeVal >= awayVal ? 'bg-oracle-win' : 'bg-secondary'}`}
            />
          </div>
          <div className="flex-1">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(awayVal / max) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-r-full ${awayVal >= homeVal ? 'bg-oracle-win' : 'bg-secondary'}`}
            />
          </div>
        </div>
        <span className="text-xs font-display text-foreground w-8">{awayVal}</span>
      </div>
    </div>
  );
}

export function GoalkeeperDuelCard({ oracle, homeTeam, awayTeam }: GoalkeeperDuelProps) {
  if (!oracle.goalkeeperDuel) return null;

  const { home, away, winner } = oracle.goalkeeperDuel;

  const winnerName = winner === 'HOME' ? home.name : winner === 'AWAY' ? away.name : null;
  const winnerTeam = winner === 'HOME' ? homeTeam : winner === 'AWAY' ? awayTeam : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card p-5 space-y-4"
    >
      <h3 className="font-display text-lg tracking-wider text-foreground flex items-center gap-2">
        <Shield className="w-5 h-5 text-oracle-draw" />
        ⚡ DUELO DE GOLEIROS
      </h3>

      {/* Names header */}
      <div className="flex items-center justify-between px-2">
        <div className="text-center">
          <p className="font-display text-sm text-foreground">{home.name}</p>
          <p className="text-[10px] font-body text-muted-foreground">{homeTeam}</p>
          <p className="font-display text-2xl text-foreground mt-1">{home.rating}</p>
        </div>
        <span className="font-display text-lg text-muted-foreground">VS</span>
        <div className="text-center">
          <p className="font-display text-sm text-foreground">{away.name}</p>
          <p className="text-[10px] font-body text-muted-foreground">{awayTeam}</p>
          <p className="font-display text-2xl text-foreground mt-1">{away.rating}</p>
        </div>
      </div>

      {/* Stats comparison */}
      <div className="space-y-3 pt-2 border-t border-border">
        <StatBar label="Reflexos" homeVal={home.reflexes} awayVal={away.reflexes} homeName={home.name} awayName={away.name} />
        <StatBar label="Posicionamento" homeVal={home.positioning} awayVal={away.positioning} homeName={home.name} awayName={away.name} />
        <StatBar label="Saída de Bola" homeVal={home.ballDistribution} awayVal={away.ballDistribution} homeName={home.name} awayName={away.name} />
      </div>

      {/* Winner badge */}
      {winnerName && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center py-3 rounded-xl bg-oracle-draw/10 border border-oracle-draw/30"
          style={{ boxShadow: '0 0 20px hsl(43 100% 50% / 0.15)' }}
        >
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4 text-oracle-draw" />
            <span className="font-display text-sm tracking-wider text-oracle-draw">
              MELHOR GOLEIRO: {winnerName.toUpperCase()} ({winnerTeam})
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
