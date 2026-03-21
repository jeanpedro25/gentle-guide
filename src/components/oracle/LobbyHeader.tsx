import { useNavigate } from 'react-router-dom';
import { useBankroll } from '@/hooks/usePredictions';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react';

export function LobbyHeader() {
  const navigate = useNavigate();
  const { data: bankroll } = useBankroll();
  const { signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 px-4 py-3 bg-background/80 backdrop-blur-lg border-b border-border flex items-center justify-between">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
        <img 
          src="https://ai.gateway.lovable.dev/v1/storage/v1/object/public/project-assets/s65smus65smus65s.png" 
          alt="ProfetaBet" 
          className="h-10 md:h-12 object-contain drop-shadow-[0_0_8px_rgba(236,200,19,0.3)]" 
        />
        <h1 className="text-lg font-extrabold tracking-tight gold-gradient-text hidden xs:block">PROFETABET</h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/banca')}
          className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-full"
        >
          <span className="text-primary text-xs font-bold">$</span>
          <span className="text-sm font-semibold text-foreground">
            {(bankroll?.amount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </button>
        <button
          onClick={signOut}
          className="p-2 text-muted-foreground hover:text-destructive transition-colors"
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}