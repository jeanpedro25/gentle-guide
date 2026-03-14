import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface RedFlagsCardProps {
  redFlags: string[];
}

export function RedFlagsCard({ redFlags }: RedFlagsCardProps) {
  if (redFlags.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 }}
      className="glass-card p-5 space-y-3 border-oracle-loss/30"
      style={{ borderColor: 'hsl(var(--oracle-loss) / 0.3)' }}
    >
      <h3 className="font-display text-lg tracking-wider text-oracle-loss flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" />
        RED FLAGS
      </h3>

      <div className="space-y-2">
        {redFlags.map((flag, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 + i * 0.1 }}
            className="flex items-start gap-2 px-3 py-2 rounded-lg bg-oracle-loss/5 border border-oracle-loss/20"
          >
            <span className="text-oracle-loss text-sm mt-0.5">⚠</span>
            <span className="text-sm font-body text-foreground">{flag}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
