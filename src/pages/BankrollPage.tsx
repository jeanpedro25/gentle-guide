import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, Edit2, Check, ShieldCheck, TrendingUp, Wallet,
  AlertTriangle, Lock, Zap, BarChart2, History, ArrowRight,
  Loader2, X, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBets } from '@/hooks/useBets';
import { useBankrollManager, PROFILES, RiskProfile } from '@/hooks/useBankrollManager';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const PROFILE_ORDER: RiskProfile[] = ['conservador', 'moderado', 'agressivo'];

export default function BankrollPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: bets = [] } = useBets();
  const {
    settings, profileConfig, stopStatus,
    stakeMin, stakeMax, stakeRecommended, weeklyStopValue,
    saving, saveBankroll, setProfile,
  } = useBankrollManager(bets);

  const [editingAmount, setEditingAmount] = useState(false);
  const [amountInput, setAmountInput] = useState('');

  const isNewUser = settings.amount === 0;

  const handleSave = async () => {
    const amount = parseFloat(amountInput.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      toast.error('Insira um valor válido maior que zero');
      return;
    }
    
    const wasBlocked = stopStatus.totalBlocked;
    
    await saveBankroll(amount, undefined, wasBlocked);
    
    if (wasBlocked && !isNewUser) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      localStorage.setItem(`profeta_last_reset_${user?.id || 'guest'}`, currentMonth);
      toast.success('✅ Banca reiniciada e registrada! Próxima recarga só mês que vem.');
    } else {
      toast.success('✅ Banca salva com sucesso!');
    }
    
    setEditingAmount(false);
  };

  const resolved = bets.filter(b => b.status !== 'pending');
  const wins = resolved.filter(b => b.status === 'won');
  const losses = resolved.filter(b => b.status === 'lost');
  const pending = bets.filter(b => b.status === 'pending');
  const winRate = resolved.length > 0 ? (wins.length / resolved.length * 100) : 0;
  const totalPnL = resolved.reduce((s, b) => s + (b.profit_loss ?? 0), 0);

  // ── New User Setup ─────────────────────────────────────────────────────────
  if (isNewUser) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 w-full max-w-lg text-center space-y-6 border-primary/30"
        >
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
            <Wallet className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Bem-vindo ao Profeta!</h1>
            <p className="text-sm text-muted-foreground">Configure sua banca inicial e escolha seu perfil de risco para começar.</p>
          </div>

          {/* Profile selection */}
          <div className="grid grid-cols-3 gap-2 text-left">
            {PROFILE_ORDER.map((key) => {
              const p = PROFILES[key];
              const selected = settings.profile === key;
              return (
                <button
                  key={key}
                  onClick={() => setProfile(key)}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    selected ? 'border-primary bg-primary/10' : 'border-border/40 bg-white/5 hover:border-border'
                  }`}
                >
                  <span className="text-2xl">{p.emoji}</span>
                  <p className="text-xs font-bold text-white mt-1">{p.label}</p>
                  <p className="text-[10px] text-muted-foreground">{p.stakeMinPct}-{p.stakeMaxPct}% por aposta</p>
                </button>
              );
            })}
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-primary">R$</span>
            <input
              type="number"
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              placeholder="Ex: 500,00"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-xl font-black text-white focus:border-primary outline-none transition-all"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !amountInput}
            className="w-full py-4 rounded-xl bg-primary text-black font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            Confirmar Banca Inicial
          </button>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: ShieldCheck, label: 'Segurança', desc: 'Stops automáticos de perda' },
              { icon: TrendingUp, label: 'Lucratividade', desc: 'Foco em valor esperado (EV)' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="p-3 rounded-lg bg-white/5 border border-white/5 text-left">
                <Icon className="w-4 h-4 text-oracle-win mb-1" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase">{label}</p>
                <p className="text-[11px] text-white font-medium">{desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main Dashboard ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-8">
      <header>
        <h1 className="text-2xl font-black gold-gradient-text uppercase tracking-tighter">Gestão de Banca</h1>
        <p className="text-xs text-muted-foreground">Controle financeiro e proteção da sua conta</p>
      </header>

      {/* STOP ALERT */}
      <AnimatePresence>
        {stopStatus.blocked && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-xl border-2 flex items-start gap-3 ${
              stopStatus.severity === 'critical' ? 'border-red-500/60 bg-red-500/10' :
              stopStatus.severity === 'danger'   ? 'border-orange-500/60 bg-orange-500/10' :
                                                   'border-yellow-500/60 bg-yellow-500/10'
            }`}
          >
            <Lock className={`w-5 h-5 mt-0.5 shrink-0 ${
              stopStatus.severity === 'critical' ? 'text-red-400' :
              stopStatus.severity === 'danger'   ? 'text-orange-400' : 'text-yellow-400'
            }`} />
            <div>
              <p className="font-bold text-sm text-white">{stopStatus.message}</p>
              <p className="text-xs text-muted-foreground mt-1">
                O Profeta Bet protege sua banca automaticamente. 💪
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BANCA CARD */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-4 border border-primary/20">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Saldo Disponível</span>
            {editingAmount ? (
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold">R$</span>
                <input
                  type="number"
                  value={amountInput}
                  onChange={e => setAmountInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  className="bg-secondary border border-border rounded-lg px-3 py-2 text-foreground text-lg w-36 focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <button onClick={handleSave} disabled={saving} className="p-2 bg-primary rounded text-primary-foreground">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button onClick={() => setEditingAmount(false)} className="p-2 bg-secondary rounded text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="font-black text-4xl text-primary">R$ {settings.amount.toFixed(2)}</span>
                <button
                  onClick={() => {
                    if (!stopStatus.totalBlocked) {
                      toast.error('Proteção Ativa', { description: 'Você só pode reiniciar a banca caso atinja o "Stop Total". A gestão de risco proíbe recargas no meio de drawdowns para evitar apostas emocionais.' });
                      return;
                    }
                    const currentMonth = new Date().toISOString().slice(0, 7);
                    const lastReset = localStorage.getItem(`profeta_last_reset_${user?.id || 'guest'}`);
                    if (lastReset === currentMonth) {
                      toast.error('Limite de Recarga Mensal Atingido', { description: 'Você já reiniciou sua banca 1 vez este mês. A disciplina é fundamental! Você só poderá zerar novamente e recomeçar no mês que vem.' });
                      return;
                    }

                    toast.info('Modo Recomeço', { description: 'Você atingiu o alvo crítico. Liberado o recomeço da banca (1x no mês).' });
                    setEditingAmount(true);
                    setAmountInput(String(settings.amount)); 
                  }}
                  className="p-1.5 bg-secondary rounded-full text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className="text-right space-y-1">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Saúde</p>
            <p className={`text-xl font-black ${
              stopStatus.totalHealthPct >= 80 ? 'text-oracle-win' :
              stopStatus.totalHealthPct >= 65 ? 'text-yellow-400' : 'text-destructive'
            }`}>{stopStatus.totalHealthPct.toFixed(0)}%</p>
          </div>
        </div>

        {/* Health bar */}
        <div className="w-full bg-white/5 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, stopStatus.totalHealthPct)}%` }}
            transition={{ duration: 0.8 }}
            className={`h-2 rounded-full ${
              stopStatus.totalHealthPct >= 80 ? 'bg-oracle-win' :
              stopStatus.totalHealthPct >= 65 ? 'bg-yellow-400' : 'bg-destructive'
            }`}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Banca inicial: R$ {settings.initialAmount.toFixed(2)}</span>
          <span className={totalPnL >= 0 ? 'text-oracle-win' : 'text-destructive'}>
            {totalPnL >= 0 ? '+' : ''}R$ {totalPnL.toFixed(2)} total
          </span>
        </div>
      </motion.div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Apostas', value: bets.length, color: 'text-white' },
          { label: 'Pendentes', value: pending.length, color: 'text-primary' },
          { label: 'Greens ✅', value: wins.length, color: 'text-oracle-win' },
          { label: 'Reds ❌', value: losses.length, color: 'text-destructive' },
        ].map(stat => (
          <div key={stat.label} className="glass-card p-3 text-center border border-border/50">
            <p className={`font-black text-2xl ${stat.color}`}>{stat.value}</p>
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* PERFIL DE RISCO */}
      <div className="glass-card p-5 space-y-4 border border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-primary" />
          <h2 className="font-bold text-sm uppercase tracking-widest text-foreground">Perfil de Risco</h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PROFILE_ORDER.map((key) => {
            const p = PROFILES[key];
            const selected = settings.profile === key;
            return (
              <button
                key={key}
                onClick={() => { setProfile(key); toast.success(`Perfil ${p.label} ativado!`); }}
                className={`p-3 rounded-xl border-2 transition-all text-center relative ${
                  selected ? 'border-primary bg-primary/10' : 'border-border/40 bg-white/5 hover:border-border'
                }`}
              >
                {selected && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary absolute top-1.5 right-1.5" />
                )}
                <span className="text-xl">{p.emoji}</span>
                <p className="text-xs font-bold text-white mt-1">{p.label}</p>
                <p className="text-[10px] text-muted-foreground">{p.stakeMinPct}-{p.stakeMaxPct}%/aposta</p>
              </button>
            );
          })}
        </div>
        <div className="rounded-lg bg-white/5 border border-border/30 p-3">
          <p className="text-xs text-white font-semibold">{profileConfig.emoji} {profileConfig.label}: {profileConfig.description}</p>
        </div>
      </div>

      {/* STAKES & STOPS */}
      <div className="glass-card p-5 space-y-4 border border-border/50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#C9A84C]" />
          <h2 className="font-bold text-sm uppercase tracking-widest text-foreground">Limites e Proteções</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Stake Recomendada', value: stakeRecommended, desc: `${((profileConfig.stakeMinPct + profileConfig.stakeMaxPct) / 2)}% da banca`, icon: BarChart2, color: 'text-primary' },
            { label: 'Stake Máxima', value: stakeMax, desc: `${profileConfig.stakeMaxPct}% da banca`, icon: TrendingUp, color: 'text-amber-400' },
            { label: 'Stop Semanal 🚨', value: weeklyStopValue, desc: `${profileConfig.weeklyStopPct}% de perda na semana`, icon: AlertTriangle, color: 'text-orange-400' },
            { label: 'Apostas Hoje', value: null, desc: `${stopStatus.dailyBetsCount} de ${profileConfig.maxBetsPerDay} permitidas`, icon: Lock, color: stopStatus.dailyBlocked ? 'text-destructive' : 'text-oracle-win' },
          ].map(({ label, value, desc, icon: Icon, color }) => (
            <div key={label} className="rounded-xl bg-secondary/30 border border-border p-4">
              <Icon className={`w-4 h-4 ${color} mb-1`} />
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{label}</p>
              {value !== null ? (
                <p className="font-black text-xl text-white">R$ {value.toFixed(2)}</p>
              ) : (
                <p className={`font-black text-xl ${color}`}>{stopStatus.dailyBetsCount}/{profileConfig.maxBetsPerDay}</p>
              )}
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        {/* Stop bars */}
        <div className="space-y-3 pt-1">
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
              <span>Stop Semanal: {stopStatus.weeklyLossPct.toFixed(1)}% perdido</span>
              <span>Limite: {profileConfig.weeklyStopPct}%</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${stopStatus.weeklyBlocked ? 'bg-destructive' : 'bg-orange-400'}`}
                style={{ width: `${Math.min(100, (stopStatus.weeklyLossPct / profileConfig.weeklyStopPct) * 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
              <span>Apostas hoje: {stopStatus.dailyBetsCount}/{profileConfig.maxBetsPerDay}</span>
              <span>{stopStatus.dailyBlocked ? '🔒 Bloqueado' : '✅ Disponível'}</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${stopStatus.dailyBlocked ? 'bg-destructive' : 'bg-primary'}`}
                style={{ width: `${Math.min(100, (stopStatus.dailyBetsCount / profileConfig.maxBetsPerDay) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Win rate */}
        {resolved.length > 0 && (
          <div className="rounded-lg bg-white/5 border border-border/30 p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Taxa de Acerto</p>
              <p className={`font-black text-xl ${winRate >= 55 ? 'text-oracle-win' : winRate >= 40 ? 'text-yellow-400' : 'text-destructive'}`}>
                {winRate.toFixed(0)}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground font-bold uppercase">P&L Total</p>
              <p className={`font-black text-xl ${totalPnL >= 0 ? 'text-oracle-win' : 'text-destructive'}`}>
                {totalPnL >= 0 ? '+' : ''}R$ {totalPnL.toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* REGRAS */}
      <div className="glass-card p-5 space-y-3 border border-border/50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-oracle-win" />
          <h2 className="font-bold text-sm uppercase tracking-widest">Regras do Profeta Bet</h2>
        </div>
        {[
          { rule: `Máximo ${profileConfig.maxBetsPerDay} apostas por dia`, ok: !stopStatus.dailyBlocked },
          { rule: `Stop semanal de ${profileConfig.weeklyStopPct}% da banca`, ok: !stopStatus.weeklyBlocked },
          { rule: `Stop total em ${profileConfig.totalStopPct}% de perda`, ok: !stopStatus.totalBlocked },
          { rule: 'Histórico e banca isolados por usuário', ok: true },
          { rule: 'Dados de outros usuários nunca visíveis', ok: true },
        ].map(({ rule, ok }) => (
          <div key={rule} className="flex items-center gap-2 text-sm">
            {ok ? <CheckCircle2 className="w-4 h-4 text-oracle-win shrink-0" /> : <Lock className="w-4 h-4 text-destructive shrink-0" />}
            <span className={ok ? 'text-muted-foreground' : 'text-destructive'}>{rule}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/historico')}
        className="w-full py-4 rounded-xl bg-secondary/50 border border-border text-foreground font-bold text-sm flex items-center justify-between px-6 hover:bg-secondary transition-all"
      >
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-[#C9A84C]" />
          <span>VER HISTÓRICO COMPLETO</span>
        </div>
        <ArrowRight className="w-5 h-5 text-muted-foreground" />
      </button>
    </div>
  );
}
