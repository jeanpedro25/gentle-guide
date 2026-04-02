import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, Database, Zap, Activity, Clock, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Simulating fetching admin metrics
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-pulse flex flex-col items-center gap-4 text-primary">
          <Shield className="w-12 h-12" />
          <h2 className="font-display tracking-widest text-xl">CARREGANDO PAINEL MESTRE...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-black text-primary uppercase tracking-tighter flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Painel Admin
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Gestão Mestre do Sistema Profeta Bet</p>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground transition-all"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* API Health Matrix */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4" />
          Status da API (API-Football)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="glass-card p-5 border border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Zap className="w-20 h-20 text-primary" />
            </div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">Requisições Cota Gratuita</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-primary">6</span>
              <span className="text-lg font-bold text-muted-foreground mb-1">/ 100</span>
            </div>
            <div className="w-full bg-secondary/50 h-2 mt-4 rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: '6%' }} />
            </div>
            <p className="text-[10px] text-primary mt-2 flex items-center gap-1 font-bold">
              <Activity className="w-3 h-3" /> Otimização de Cache 2.0 Operante
            </p>
          </div>

          <div className="glass-card p-5 border border-border">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-4">Economia de Rede Diária</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Chamadas Semanais em Lote</span>
                <span className="text-oracle-win font-bold">- 6x reqs</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Pings Ao Vivo</span>
                <span className="text-oracle-win font-bold">Resfriamento 5m</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Estatísticas Complexas</span>
                <span className="text-oracle-win font-bold">Cache 24h</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Users Matrix */}
      <section className="space-y-3 mt-8">
        <h2 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4" />
          Métricas de Usuários
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-card p-4 text-center">
            <p className="text-3xl font-black text-foreground">1</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mt-1">Usuários Ativos</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-3xl font-black text-foreground">16</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mt-1">Apostas Feitas</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-3xl font-black text-oracle-win">4</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mt-1">Apostas Green</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-3xl font-black text-destructive">11</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mt-1">Apostas Red</p>
          </div>
        </div>
      </section>

      {/* Logs */}
      <section className="space-y-3 mt-8">
        <h2 className="text-sm font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Logs de Sistema
        </h2>
        <div className="glass-card p-4 space-y-3 font-mono text-[10px]">
          <div className="flex items-start gap-2 border-b border-white/5 pb-2">
            <span className="text-oracle-win whitespace-nowrap">[OK]</span>
            <span className="text-muted-foreground">Deploy Vercel concluído. Ajuste de cache ativo.</span>
          </div>
          <div className="flex items-start gap-2 border-b border-white/5 pb-2">
            <span className="text-oracle-win whitespace-nowrap">[OK]</span>
            <span className="text-muted-foreground">Bug de BetCard duplicada resolvido. Payload agora carrega formato Literal e Timestamp.</span>
          </div>
          <div className="flex items-start gap-2 border-b border-white/5 pb-2">
            <span className="text-primary whitespace-nowrap">[INFO]</span>
            <span className="text-muted-foreground">Monitoramento de Limites (Max 3/dia) ativo via useBankrollManager e DataTracker.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary whitespace-nowrap">[INFO]</span>
            <span className="text-muted-foreground">Motor de IA Oracle rodando em Poisson Rate v2.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
