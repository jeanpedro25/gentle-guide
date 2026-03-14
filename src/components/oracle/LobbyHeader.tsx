import { Zap, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface LobbyHeaderProps {
  onRefresh: () => void;
}

export function LobbyHeader({ onRefresh }: LobbyHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="glass-card px-4 py-3 md:px-6 md:py-4 flex items-center justify-between">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => navigate('/')}
      >
        <Zap className="w-6 h-6 text-primary" />
        <h1 className="font-display text-2xl md:text-3xl tracking-wider text-foreground">
          ORACLE BET
        </h1>
      </div>

      <p className="hidden md:block text-muted-foreground text-sm font-body">
        Previsões com IA para os próximos jogos
      </p>

      <motion.button
        whileTap={{ rotate: 360 }}
        transition={{ duration: 0.5 }}
        onClick={onRefresh}
        className="flex items-center gap-2 px-3 py-2 glass-card hover:bg-secondary/50 transition-colors text-sm font-body text-muted-foreground hover:text-foreground"
      >
        <RefreshCw className="w-4 h-4" />
        <span className="hidden sm:inline">Atualizar</span>
      </motion.button>
    </header>
  );
}
