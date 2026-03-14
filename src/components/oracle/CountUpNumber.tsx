import { useEffect, useState } from 'react';

interface CountUpNumberProps {
  value: number;
  duration?: number;
}

export function CountUpNumber({ value, duration = 1000 }: CountUpNumberProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);

  return <>{current}</>;
}
