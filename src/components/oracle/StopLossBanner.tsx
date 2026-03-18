import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldOff, OctagonX } from 'lucide-react';
import { StopLossStatus } from '@/hooks/useStopLoss';

interface Props {
  status: StopLossStatus;
}

export function StopLossBanner({ status }: Props) {
  if (status.severity === 'safe') return null;

  const config = {
    warning: {
      icon: AlertTriangle,
      border: 'border-yellow-500/40',
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
    },
    danger: {
      icon: ShieldOff,
      border: 'border-orange-500/40',
      bg: 'bg-orange-500/10',
      text: 'text-orange-400',
    },
    critical: {
      icon: OctagonX,
      border: 'border-destructive/40',
      bg: 'bg-destructive/10',
      text: 'text-destructive',
    },
  }[status.severity] ?? { icon: AlertTriangle, border: 'border-border', bg: 'bg-card', text: 'text-foreground' };

  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`mx-4 mt-4 p-3 rounded-xl border ${config.border} ${config.bg} flex items-start gap-3`}
      >
        <Icon className={`w-5 h-5 ${config.text} shrink-0 mt-0.5`} />
        <div>
          <p className={`text-sm font-bold ${config.text}`}>
            {status.severity === 'warning' ? 'Stop Diário' : status.severity === 'danger' ? 'Stop Semanal' : 'Stop Total'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{status.message}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
