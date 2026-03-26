import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, User, Edit3, Check, X, Copy, Crown,
  TrendingUp, Target, Calendar, Shield, BarChart2,
  CheckCircle2, Loader2, Mail, Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBets } from "@/hooks/useBets";
import { useBankrollManager } from "@/hooks/useBankrollManager";
import { toast } from "sonner";

type ProfileRow = {
  display_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

const AVATAR_COLORS = [
  "from-yellow-500 to-orange-600",
  "from-purple-500 to-pink-600",
  "from-blue-500 to-cyan-600",
  "from-green-500 to-emerald-600",
  "from-red-500 to-rose-600",
];

function getAvatarColor(email: string) {
  const idx = email.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: bets = [] } = useBets();
  const { settings, profileConfig, stopStatus } = useBankrollManager(bets);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.id) { setProfile(null); return; }
    let active = true;
    (async () => {
      const { data } = await (supabase.from("profiles") as any)
        .select("display_name, avatar_url, created_at")
        .eq("id", user.id)
        .maybeSingle();
      if (active) setProfile(data ?? null);
    })();
    return () => { active = false; };
  }, [user?.id]);

  const displayName = useMemo(() => {
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    const fallback = meta?.name ?? meta?.full_name;
    return profile?.display_name ?? (typeof fallback === "string" ? fallback : null);
  }, [profile?.display_name, user?.user_metadata]);

  const initials = useMemo(() => {
    const name = displayName ?? user?.email ?? "?";
    return name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  }, [displayName, user?.email]);

  const avatarColor = useMemo(() =>
    getAvatarColor(user?.email ?? "a"), [user?.email]);

  const planLabel = useMemo(() => {
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    const appMeta = user?.app_metadata as Record<string, unknown> | undefined;
    const plan = meta?.plan ?? meta?.plan_name ?? appMeta?.plan;
    return typeof plan === "string" && plan.trim() ? plan : "Gratuito";
  }, [user?.user_metadata, user?.app_metadata]);

  const createdAtLabel = useMemo(() => {
    const raw = profile?.created_at ?? (user as any)?.created_at;
    if (!raw) return "—";
    const d = new Date(raw);
    return isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "long", year: "numeric"
    }).format(d);
  }, [profile?.created_at, user]);

  // Estatísticas das apostas
  const resolved = bets.filter(b => b.status !== "pending");
  const wins = resolved.filter(b => b.status === "won").length;
  const losses = resolved.filter(b => b.status === "lost").length;
  const winRate = resolved.length > 0 ? (wins / resolved.length * 100) : 0;
  const totalPnL = resolved.reduce((s, b) => s + (b.profit_loss ?? 0), 0);
  const todayBets = bets.filter(b => new Date(b.created_at) >= (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })()).length;

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSavingName(true);
    try {
      await (supabase.from("profiles") as any).upsert(
        { id: user?.id, display_name: nameInput.trim(), updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
      setProfile(prev => ({ ...prev!, display_name: nameInput.trim() }));
      setEditingName(false);
      toast.success("✅ Nome atualizado!");
    } catch {
      toast.error("Erro ao salvar nome");
    } finally {
      setSavingName(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(user?.id ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("ID copiado!");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/welcome");
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-black gold-gradient-text uppercase tracking-tighter">Meu Perfil</h1>
        <p className="text-xs text-muted-foreground">Gerencie suas informações e preferências</p>
      </header>

      {/* Avatar + Identity Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 border border-primary/20 relative overflow-hidden"
      >
        {/* Background glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />

        <div className="flex items-start gap-5 relative z-10">
          {/* Avatar */}
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarColor} flex items-center justify-center shrink-0 shadow-lg`}>
            <span className="text-2xl font-black text-white">{initials}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Nome */}
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Nome</p>
              <AnimatePresence mode="wait">
                {editingName ? (
                  <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                      className="bg-black/40 border border-primary/40 rounded-lg px-3 py-1.5 text-white text-sm w-full max-w-[200px] focus:outline-none focus:border-primary"
                      placeholder="Seu nome..."
                    />
                    <button onClick={handleSaveName} disabled={savingName} className="p-1.5 bg-primary rounded-lg text-black">
                      {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setEditingName(false)} className="p-1.5 bg-white/10 rounded-lg text-muted-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="display" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                    <span className="font-bold text-lg text-white">{displayName ?? "Sem nome"}</span>
                    <button
                      onClick={() => { setEditingName(true); setNameInput(displayName ?? ""); }}
                      className="p-1 bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Email */}
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground truncate">{user?.email ?? "—"}</span>
            </div>

            {/* Plano */}
            <div className="flex items-center gap-2">
              <Crown className={`w-3.5 h-3.5 shrink-0 ${planLabel === "Gratuito" ? "text-muted-foreground" : "text-primary"}`} />
              <span className={`text-sm font-bold ${planLabel === "Gratuito" ? "text-muted-foreground" : "text-primary"}`}>
                Plano {planLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 mt-5 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-xs">Membro desde {createdAtLabel}</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
            stopStatus.blocked ? "bg-destructive/20 text-destructive" : "bg-oracle-win/20 text-oracle-win"
          }`}>
            {stopStatus.blocked ? "⛔ Bloqueado" : "✅ Ativo"}
          </span>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3"
      >
        <div className="glass-card p-4 border border-border/50 space-y-1">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-[10px] text-muted-foreground font-bold uppercase">Taxa de Acerto</span>
          </div>
          <p className={`font-black text-2xl ${winRate >= 55 ? "text-oracle-win" : winRate >= 40 ? "text-yellow-400" : "text-destructive"}`}>
            {winRate.toFixed(0)}%
          </p>
          <p className="text-[10px] text-muted-foreground">{wins}W · {losses}L · {bets.filter(b=>b.status==="pending").length} pendentes</p>
        </div>

        <div className="glass-card p-4 border border-border/50 space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-[10px] text-muted-foreground font-bold uppercase">P&L Total</span>
          </div>
          <p className={`font-black text-2xl ${totalPnL >= 0 ? "text-oracle-win" : "text-destructive"}`}>
            {totalPnL >= 0 ? "+" : ""}R$ {Math.abs(totalPnL).toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">{bets.length} apostas no total</p>
        </div>

        <div className="glass-card p-4 border border-border/50 space-y-1">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            <span className="text-[10px] text-muted-foreground font-bold uppercase">Banca Atual</span>
          </div>
          <p className="font-black text-2xl text-primary">R$ {settings.amount.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Saúde: {stopStatus.totalHealthPct.toFixed(0)}%</p>
        </div>

        <div className="glass-card p-4 border border-border/50 space-y-1">
          <div className="flex items-center gap-2">
            <Shield className={`w-4 h-4 ${stopStatus.dailyBlocked ? "text-destructive" : "text-oracle-win"}`} />
            <span className="text-[10px] text-muted-foreground font-bold uppercase">Hoje</span>
          </div>
          <p className={`font-black text-2xl ${stopStatus.dailyBlocked ? "text-destructive" : "text-white"}`}>
            {todayBets}/{profileConfig.maxBetsPerDay}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Perfil: {profileConfig.emoji} {profileConfig.label}
          </p>
        </div>
      </motion.div>

      {/* Account Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-5 border border-border/50 space-y-4"
      >
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          <h2 className="font-bold text-sm uppercase tracking-widest">Dados da Conta</h2>
        </div>

        <div className="space-y-3">
          {/* ID */}
          <div className="rounded-lg bg-white/5 border border-border/30 p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">ID do Usuário</p>
              <p className="text-xs text-muted-foreground font-mono truncate">{user?.id ?? "—"}</p>
            </div>
            <button
              onClick={handleCopyId}
              className="p-2 bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors shrink-0"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-oracle-win" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Membro desde */}
          <div className="rounded-lg bg-white/5 border border-border/30 p-3 flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Membro desde</p>
              <p className="text-sm text-white font-medium">{createdAtLabel}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Logout */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onClick={handleLogout}
        className="w-full py-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive font-bold text-sm flex items-center justify-center gap-3 hover:bg-destructive/20 transition-all"
      >
        <LogOut className="w-5 h-5" />
        Sair da Conta
      </motion.button>
    </div>
  );
};

export default ProfilePage;
