import { motion } from 'framer-motion';

export type TimeFilter = 'live' | 'today' | 'tomorrow' | 'week';

const TABS: { key: TimeFilter; label: string; emoji: string }[] = [
  { key: 'live', label: 'Ao Vivo', emoji: '🔴' },
  { key: 'today', label: 'Hoje', emoji: '🔥' },
  { key: 'tomorrow', label: 'Amanhã', emoji: '📅' },
  { key: 'week', label: 'Semana', emoji: '📆' },
];

interface TimeTabsProps {
  selected: TimeFilter;
  onSelect: (tab: TimeFilter) => void;
  liveBadge?: number;
}

export function TimeTabs({ selected, onSelect, liveBadge }: TimeTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {TABS.map(({ key, label, emoji }) => {
        const isActive = selected === key;
        return (
          <motion.button
            key={key}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(key)}
            className={`shrink-0 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border relative ${
              isActive
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-foreground hover:border-primary/50'
            }`}
          >
            {emoji} {label}
            {key === 'live' && liveBadge !== undefined && liveBadge > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {liveBadge}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
