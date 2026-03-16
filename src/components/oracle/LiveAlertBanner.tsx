import { motion, AnimatePresence } from 'framer-motion';
import { usePredictions } from '@/hooks/usePredictions';
import { useLiveMatches } from '@/hooks/useLiveMatches';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export function LiveAlertBanner() {
  const { data: predictions = [] } = usePredictions();
  const { data: liveMatches = [] } = useLiveMatches();
  const navigate = useNavigate();

  // Find predictions that have a live match
  const liveAlerts = useMemo(() => {
    const pendingPredictions = predictions.filter(p => p.status === 'pending');
    return pendingPredictions.filter(p =>
      liveMatches.some(m =>
        m.homeTeam.toLowerCase().includes(p.home_team.toLowerCase().split(' ')[0]) ||
        m.awayTeam.toLowerCase().includes(p.away_team.toLowerCase().split(' ')[0])
      )
    );
  }, [predictions, liveMatches]);

  if (liveAlerts.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-2"
      >
        {liveAlerts.map(alert => (
          <motion.button
            key={alert.id}
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            onClick={() => navigate('/')}
            className="w-full px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3 text-left hover:bg-destructive/15 transition-colors"
          >
            <span className="w-3 h-3 rounded-full bg-destructive animate-pulse shrink-0" />
            <span className="font-body text-sm text-foreground">
              ⚡ <span className="font-semibold">{alert.home_team} x {alert.away_team}</span> está AO VIVO — clique para re-analisar
            </span>
            <span className="ml-auto text-xs font-display tracking-wider text-destructive">🔴 LIVE</span>
          </motion.button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
