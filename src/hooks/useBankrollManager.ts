/**
 * useBankrollManager — Gerenciamento completo de banca por usuário
 * Salva perfil + stops no localStorage como fallback se Supabase falhar.
 */
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BetRow } from '@/hooks/useBets';

// ─── Tipos ───────────────────────────────────────────────────────────────────
export type RiskProfile = 'conservador' | 'moderado' | 'agressivo';

export interface ProfileConfig {
  label: string;
  emoji: string;
  description: string;
  color: string;
  maxBetsPerDay: number;
  stakeMinPct: number;    // % mínimo por aposta
  stakeMaxPct: number;    // % máximo por aposta
  weeklyStopPct: number;  // stop semanal em % da banca
  totalStopPct: number;   // stop total em % da banca
}

export const PROFILES: Record<RiskProfile, ProfileConfig> = {
  conservador: {
    label: 'Conservador',
    emoji: '🛡️',
    description: 'Proteção máxima da banca. Apostas pequenas e seguras.',
    color: '#22c55e',
    maxBetsPerDay: 3,
    stakeMinPct: 1,
    stakeMaxPct: 2,
    weeklyStopPct: 10,
    totalStopPct: 20,
  },
  moderado: {
    label: 'Moderado',
    emoji: '⚖️',
    description: 'Equilíbrio entre crescimento e proteção da banca.',
    color: '#f59e0b',
    maxBetsPerDay: 3,
    stakeMinPct: 2,
    stakeMaxPct: 5,
    weeklyStopPct: 20,
    totalStopPct: 30,
  },
  agressivo: {
    label: 'Agressivo',
    emoji: '🔥',
    description: 'Busca retornos maiores. Risco elevado. Use com cautela!',
    color: '#ef4444',
    maxBetsPerDay: 3,
    stakeMinPct: 5,
    stakeMaxPct: 10,
    weeklyStopPct: 30,
    totalStopPct: 40,
  },
};

export interface StopStatus {
  dailyBetsCount: number;
  dailyBlocked: boolean;       // atingiu max apostas/dia
  weeklyLossPct: number;
  weeklyBlocked: boolean;      // atingiu stop semanal
  totalHealthPct: number;
  totalBlocked: boolean;       // banca abaixo do mínimo
  blocked: boolean;
  severity: 'safe' | 'warning' | 'danger' | 'critical';
  message: string;
}

export interface BankrollSettings {
  amount: number;
  initialAmount: number;
  profile: RiskProfile;
}

// ─── Hook Principal ──────────────────────────────────────────────────────────
export function useBankrollManager(bets: BetRow[]) {
  const { user } = useAuth();
  const storageKey = `profeta_bankroll_${user?.id ?? 'guest'}`;
  const profileKey = `profeta_profile_${user?.id ?? 'guest'}`;

  const loadLocal = (): BankrollSettings => {
    try {
      const stored = localStorage.getItem(storageKey);
      const profile = (localStorage.getItem(profileKey) as RiskProfile) || 'moderado';
      if (stored) return { ...JSON.parse(stored), profile };
    } catch {}
    return { amount: 0, initialAmount: 0, profile: 'moderado' };
  };

  const [settings, setSettings] = useState<BankrollSettings>(loadLocal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sincronizar com Supabase ao montar
  useEffect(() => {
    if (!user) return;
    (supabase.from('bankroll') as any).select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }: { data: any }) => {
        if (data) {
          const next: BankrollSettings = {
            amount: Number(data.amount),
            initialAmount: Number(data.initial_amount ?? data.amount),
            profile: (data.profile as RiskProfile) || loadLocal().profile,
          };
          setSettings(next);
          localStorage.setItem(storageKey, JSON.stringify({ amount: next.amount, initialAmount: next.initialAmount }));
          localStorage.setItem(profileKey, next.profile);
        }
      });
  }, [user?.id]);

  // Saves — tenta Supabase primeiro, fallback localStorage
  const saveBankroll = async (amount: number, profile?: RiskProfile, forceResetInitial: boolean = false) => {
    setSaving(true);
    setError(null);
    const newProfile = profile || settings.profile;
    const initialAmount = (forceResetInitial || settings.initialAmount <= 0) ? amount : settings.initialAmount;
    
    try {
      if (user) {
        const payload = {
          user_id: user.id,
          amount,
          initial_amount: initialAmount,
          profile: newProfile,
          updated_at: new Date().toISOString(),
        };
        const { error: err } = await (supabase.from('bankroll') as any).upsert(payload, { onConflict: 'user_id' });
        if (err) throw err;
      }
    } catch (e) {
      // Supabase falhou — salva localmente mesmo assim
      console.warn('[Bankroll] Supabase indisponível, salvando localmente.', e);
    } finally {
      const next = { amount, initialAmount, profile: newProfile };
      setSettings(next);
      localStorage.setItem(storageKey, JSON.stringify({ amount, initialAmount }));
      localStorage.setItem(profileKey, newProfile);
      setSaving(false);
    }
  };

  const setProfile = (profile: RiskProfile) => {
    saveBankroll(settings.amount, profile);
  };

  // ─── Stop Loss Calculation ───────────────────────────────────────────────
  const stopStatus = useMemo((): StopStatus => {
    const profile = PROFILES[settings.profile];
    const now = new Date();

    // --- Diário ---
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayBets = bets.filter(b =>
      new Date(b.created_at) >= todayStart
    );
    const dailyBetsCount = todayBets.length;
    const dailyBlocked = dailyBetsCount >= profile.maxBetsPerDay;

    // --- Semanal ---
    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    weekStart.setHours(0, 0, 0, 0);
    const weekLoss = bets
      .filter(b => b.resolved_at && new Date(b.resolved_at) >= weekStart)
      .reduce((s, b) => s + (b.profit_loss ?? 0), 0);
    const weeklyLossPct = settings.initialAmount > 0
      ? Math.abs(Math.min(weekLoss, 0)) / settings.initialAmount * 100
      : 0;
    const weeklyBlocked = weeklyLossPct >= profile.weeklyStopPct;

    // --- Total ---
    const totalHealthPct = settings.initialAmount > 0
      ? (settings.amount / settings.initialAmount) * 100
      : 100;
    const totalBlocked = settings.initialAmount > 0 && totalHealthPct < (100 - profile.totalStopPct);

    const blocked = dailyBlocked || weeklyBlocked || totalBlocked;

    let severity: StopStatus['severity'] = 'safe';
    let message = '';

    if (totalBlocked) {
      severity = 'critical';
      message = `🔴 STOP TOTAL — Banca em ${totalHealthPct.toFixed(0)}% do inicial. Estratégia precisa ser revisada.`;
    } else if (weeklyBlocked) {
      severity = 'danger';
      message = `🟠 STOP SEMANAL — Perda de ${weeklyLossPct.toFixed(0)}% esta semana. Apostas bloqueadas por segurança.`;
    } else if (dailyBlocked) {
      severity = 'warning';
      message = `🟡 LIMITE DIÁRIO — Você já fez ${dailyBetsCount} apostas hoje. Volte amanhã!`;
    }

    return { dailyBetsCount, dailyBlocked, weeklyLossPct, weeklyBlocked, totalHealthPct, totalBlocked, blocked, severity, message };
  }, [bets, settings]);

  const profileConfig = PROFILES[settings.profile];

  // Calcular stakes recomendadas
  const stakeMin = settings.amount * profileConfig.stakeMinPct / 100;
  const stakeMax = settings.amount * profileConfig.stakeMaxPct / 100;
  const stakeRecommended = settings.amount * ((profileConfig.stakeMinPct + profileConfig.stakeMaxPct) / 2) / 100;
  const weeklyStopValue = settings.amount * profileConfig.weeklyStopPct / 100;

  return {
    settings,
    profileConfig,
    stopStatus,
    stakeMin,
    stakeMax,
    stakeRecommended,
    weeklyStopValue,
    saving,
    error,
    saveBankroll,
    setProfile,
  };
}
