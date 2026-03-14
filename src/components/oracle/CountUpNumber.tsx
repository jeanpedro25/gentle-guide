import { useEffect, useState } from 'react';

interface CountUpNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
}

export function CountUpNumber({ value, duration = 1000, decimals = 0 }: CountUpNumberProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const factor = Math.pow(10, decimals);
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * value * factor) / factor);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration, decimals]);

  return <>{decimals > 0 ? current.toFixed(decimals) : current}</>;
}
