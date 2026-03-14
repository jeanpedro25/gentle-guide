import { motion } from 'framer-motion';
import { CountUpNumber } from './CountUpNumber';

interface CircularGaugeProps {
  label: string;
  value: number;
  color: string;
  delay?: number;
}

export function CircularGauge({ label, value, color, delay = 0 }: CircularGaugeProps) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth="8"
          />
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, delay, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-2xl text-foreground">
            <CountUpNumber value={value} duration={1200} />
            <span className="text-sm">%</span>
          </span>
        </div>
      </div>
      <span className="text-xs font-body text-muted-foreground text-center max-w-[100px] truncate">
        {label}
      </span>
    </div>
  );
}
