import { useLocation, useNavigate } from 'react-router-dom';
import { Home, BarChart3, Clock } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/banca', icon: BarChart3, label: 'Banca' },
  { path: '/historico', icon: Clock, label: 'Histórico' },
] as const;

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 border-t border-border backdrop-blur-md px-6 py-3 flex justify-between items-center md:hidden">
      {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
        const isActive = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-[10px] font-semibold">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
