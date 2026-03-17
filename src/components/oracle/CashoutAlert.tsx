import { motion, AnimatePresence } from 'framer-motion';

interface CashoutAlertProps {
  type: 'DANGER' | 'PROFIT' | null;
  message: string;
}

export function CashoutAlert({ type, message }: CashoutAlertProps) {
  if (!type) return null;

  const isDanger = type === 'DANGER';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: [1, 0.8, 1], y: 0 }}
        transition={{ opacity: { duration: 1.5, repeat: Infinity }, y: { duration: 0.3 } }}
        className={`mt-3 p-3 rounded-lg border text-xs font-bold ${
          isDanger
            ? 'bg-destructive/10 border-destructive/30 text-destructive'
            : 'bg-primary/10 border-primary/30 text-primary'
        }`}
      >
        {message}
      </motion.div>
    </AnimatePresence>
  );
}
