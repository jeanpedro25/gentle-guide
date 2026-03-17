import { useNavigate } from 'react-router-dom';
import { useBankroll } from '@/hooks/usePredictions';

export function LobbyHeader() {
  const navigate = useNavigate();
  const { data: bankroll } = useBankroll();

  return (
    <header className="sticky top-0 z-50 px-4 py-4 bg-background/80 backdrop-blur-lg border-b border-border flex items-center justify-between">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
          </svg>
        </div>
        <h1 className="text-lg font-extrabold tracking-tight gold-gradient-text">PROFETABET</h1>
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
      </div>
    </header>
  );
}
