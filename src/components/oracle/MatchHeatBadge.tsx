import { MatchHeat } from '@/lib/matchVerdict';

interface MatchHeatBadgeProps {
  heat: MatchHeat;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function MatchHeatBadge({ heat, emoji, bgColor, borderColor }: MatchHeatBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${bgColor} ${borderColor}`}>
      {emoji} {heat}
    </span>
  );
}
