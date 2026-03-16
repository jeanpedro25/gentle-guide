import { RefreshCw, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import profetaLogo from '@/assets/profeta-bet-logo.png';

interface LobbyHeaderProps {
  onRefresh: () => void;
}

export function LobbyHeader({ onRefresh }: LobbyHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="glass-card px-4 py-3 md:px-6 md:py-4 flex items-center justify-between">
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => navigate('/')}
      >
        <img src={profetaLogo} alt="Profeta Bet" className="w-8 h-8 md:w-10 md:h-10" />
        <h1 className="font-display text-2xl md:text-3xl tracking-wider text-foreground">
          PROFETA BET
        </h1>
      </div>

      <p className="hidden md:block text-muted-foreground text-sm font-body">
        Previsões com IA para os próximos jogos
      </p>

      <div className="flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/banca')}
          className="flex items-center gap-2 px-3 py-2 glass-card hover:bg-secondary/50 transition-colors text-sm font-body text-primary hover:text-foreground"
        >
          <DollarSign className="w-4 h-4" />
          <span className="hidden sm:inline">Banca</span>
        </motion.button>

        <motion.button
          whileTap={{ rotate: 360 }}
          transition={{ duration: 0.5 }}
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 glass-card hover:bg-secondary/50 transition-colors text-sm font-body text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Atualizar</span>
        </motion.button>
      </div>
    </header>
  );
}
