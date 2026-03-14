import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function LoadingState() {
  const [text, setText] = useState('');
  const fullText = 'ORACLE PENSANDO...';

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setText(fullText.slice(0, i + 1));
      i++;
      if (i >= fullText.length) i = 0;
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-8">
      {/* Spinning ball */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="text-6xl"
      >
        ⚽
      </motion.div>

      {/* Typewriter text */}
      <div className="font-display text-2xl tracking-widest text-oracle-win">
        {text}
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          |
        </motion.span>
      </div>

      {/* Skeleton cards */}
      <div className="w-full max-w-lg space-y-4">
        {[1, 2, 3].map(i => (
          <motion.div
            key={i}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            className="glass-card h-24 w-full"
          />
        ))}
      </div>
    </div>
  );
}
