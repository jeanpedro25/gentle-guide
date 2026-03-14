import { motion } from 'framer-motion';
import { LEAGUES } from '@/types/fixture';

interface LeagueTabsProps {
  selectedLeagueId: number | null;
  onSelect: (id: number | null) => void;
  /** Pass 'today' to enable the HOJE tab as the special filter */
  todayMode?: boolean;
  onTodayToggle?: () => void;
}

export function LeagueTabs({ selectedLeagueId, onSelect, todayMode, onTodayToggle }: LeagueTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {/* HOJE special tab */}
      <TabButton
        label="🔥 HOJE"
        isActive={!!todayMode}
        onClick={() => {
          onTodayToggle?.();
        }}
      />
      <TabButton
        label="📋 Todos"
        isActive={selectedLeagueId === null && !todayMode}
        onClick={() => {
          if (todayMode) onTodayToggle?.();
          onSelect(null);
        }}
      />
      {LEAGUES.map((league) => (
        <TabButton
          key={league.id}
          label={`${league.emoji} ${league.name}`}
          isActive={selectedLeagueId === league.id && !todayMode}
          onClick={() => {
            if (todayMode) onTodayToggle?.();
            onSelect(league.id);
          }}
        />
      ))}
    </div>
  );
}

function TabButton({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`shrink-0 px-4 py-2 rounded-xl text-sm font-body whitespace-nowrap transition-all ${
        isActive
          ? 'bg-primary text-primary-foreground neon-glow-green'
          : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
      }`}
    >
      {label}
    </motion.button>
  );
}
