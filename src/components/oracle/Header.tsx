import { History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onToggleHistory: () => void;
  historyCount: number;
}

export function Header({ onToggleHistory, historyCount }: HeaderProps) {
  const navigate = useNavigate();
  
  return (
    <header className="glass-card px-4 py-3 md:px-6 md:py-4 flex items-center justify-between">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
        <img 
          src="https://ai.gateway.lovable.dev/v1/storage/v1/object/public/project-assets/s65smus65smus65s.png" 
          alt="Profeta Bet" 
          className="h-12 md:h-16 object-contain drop-shadow-[0_0_10px_rgba(236,200,19,0.3)]" 
        />
        <h1 className="font-display text-2xl md:text-3xl tracking-wider text-foreground hidden sm:block">
          PROFETA BET
        </h1>
      </div>
      <p className="hidden lg:block text-oracle-muted text-sm font-body">
        Previsões Inteligentes Para Suas Apostas
      </p>
      <button
        onClick={onToggleHistory}
        className="relative flex items-center gap-2 px-3 py-2 glass-card hover:bg-secondary/50 transition-colors text-sm font-body text-oracle-muted hover:text-foreground"
      >
        <History className="w-4 h-4" />
        <span className="hidden sm:inline">ÚLTIMAS ANÁLISES</span>
        {historyCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-oracle-win text-primary-foreground text-xs flex items-center justify-center font-bold">
            {historyCount}
          </span>
        )}
      </button>
    </header>
  );
}