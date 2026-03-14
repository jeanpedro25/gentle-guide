import { motion } from 'framer-motion';
import { OracleAnalysis, PlayerRating } from '@/types/prediction';

interface FormationPitchProps {
  oracle: OracleAnalysis;
  homeTeam: string;
  awayTeam: string;
}

// Map positions to Y coordinates on the pitch (0=goal, 100=midfield)
const positionY: Record<string, number> = {
  GOL: 10,
  ZAG: 28,
  LAT: 35,
  MEI: 55,
  ATA: 78,
};

function distributeX(count: number, side: 'left' | 'right'): number[] {
  if (count === 0) return [];
  if (count === 1) return [50];
  const spacing = 70 / (count + 1);
  return Array.from({ length: count }, (_, i) => 15 + spacing * (i + 1));
}

export function FormationPitch({ oracle, homeTeam, awayTeam }: FormationPitchProps) {
  if (!oracle.playerRatings || !oracle.formationAnalysis) return null;

  const posOrder = ['GOL', 'ZAG', 'LAT', 'MEI', 'ATA'];

  const groupByPos = (players: PlayerRating[]) => {
    const groups: Record<string, PlayerRating[]> = {};
    for (const p of players) {
      if (!groups[p.position]) groups[p.position] = [];
      groups[p.position].push(p);
    }
    return groups;
  };

  const homeGroups = groupByPos(oracle.playerRatings.home);
  const awayGroups = groupByPos(oracle.playerRatings.away);

  const renderPlayers = (groups: Record<string, PlayerRating[]>, side: 'left' | 'right', color: string) => {
    const nodes: JSX.Element[] = [];
    for (const pos of posOrder) {
      const players = groups[pos] || [];
      const baseY = positionY[pos] || 50;
      const xPositions = distributeX(players.length, side);

      players.forEach((p, i) => {
        const x = side === 'left' ? xPositions[i] * 0.48 : 52 + xPositions[i] * 0.48;
        const y = side === 'left' ? baseY : 100 - baseY;

        const ratingColor = p.rating >= 85 ? '#00FF87' : p.rating >= 75 ? '#FFB800' : '#9CA3AF';

        nodes.push(
          <motion.g
            key={`${side}-${p.name}-${i}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + nodes.length * 0.04 }}
          >
            <circle cx={`${x}%`} cy={`${y}%`} r="12" fill={color} opacity="0.9" stroke={ratingColor} strokeWidth="2" />
            <text x={`${x}%`} y={`${y}%`} textAnchor="middle" dy="4" fill="white" fontSize="8" fontFamily="'Bebas Neue', sans-serif">
              {p.rating}
            </text>
            <text x={`${x}%`} y={`${y + 5.5}%`} textAnchor="middle" fill="white" fontSize="5" opacity="0.8" fontFamily="'DM Sans', sans-serif">
              {p.name.split(' ').pop()?.slice(0, 8)}
            </text>
          </motion.g>
        );
      });
    }
    return nodes;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg tracking-wider text-foreground">CAMPO TÁTICO</h3>
        <div className="flex gap-4 text-xs font-display">
          <span className="text-blue-400">{oracle.formationAnalysis.home} {homeTeam.split(' ').pop()}</span>
          <span className="text-oracle-loss">{oracle.formationAnalysis.away} {awayTeam.split(' ').pop()}</span>
        </div>
      </div>

      <div className="relative w-full aspect-[3/2] rounded-xl overflow-hidden border border-border">
        <svg viewBox="0 0 600 400" className="w-full h-full" style={{ background: 'hsl(140, 50%, 18%)' }}>
          {/* Pitch markings */}
          <rect x="2" y="2" width="596" height="396" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" rx="8" />
          {/* Center line */}
          <line x1="300" y1="2" x2="300" y2="398" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
          {/* Center circle */}
          <circle cx="300" cy="200" r="50" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
          <circle cx="300" cy="200" r="3" fill="rgba(255,255,255,0.4)" />
          {/* Left penalty area */}
          <rect x="2" y="110" width="100" height="180" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
          <rect x="2" y="150" width="40" height="100" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
          {/* Right penalty area */}
          <rect x="498" y="110" width="100" height="180" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
          <rect x="558" y="150" width="40" height="100" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />

          {/* Players */}
          {renderPlayers(homeGroups, 'left', 'hsl(214, 80%, 50%)')}
          {renderPlayers(awayGroups, 'right', 'hsl(349, 80%, 50%)')}
        </svg>
      </div>

      {oracle.formationAnalysis.reason && (
        <p className="text-xs font-body text-muted-foreground">
          <span className="text-primary font-semibold">Análise tática:</span> {oracle.formationAnalysis.reason}
        </p>
      )}
    </motion.div>
  );
}
