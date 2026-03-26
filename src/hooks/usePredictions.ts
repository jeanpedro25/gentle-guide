import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PredictionRow {
  id: string;
  user_id: string | null;
  fixture_id: number;
  home_team: string;
  away_team: string;
  league: string;
  predicted_score: string | null;
  predicted_winner: string | null;
  confidence: number;
  recommended_market: string | null;
  min_odd: number | null;
  stake_pct: number | null;
  justification: string | null;
  status: string;
  oracle_data: Record<string, unknown> | null;
  created_at: string;
}

export interface BankrollRow {
  id?: string;
  user_id?: string | null;
  amount: number;
  updated_at: string;
}

export interface BetResultRow {
  id: string;
  user_id: string | null;
  prediction_id: string;
  won: boolean | null;
  actual_score: string | null;
  profit_loss: number | null;
  resolved_at: string;
}

function getErrorMessage(error: unknown) {
  return typeof (error as { message?: string })?.message === 'string'
    ? (error as { message: string }).message.toLowerCase()
    : '';
}

function isUserIdColumnError(error: unknown) {
  const message = getErrorMessage(error);
  return message.includes('user_id') && message.includes('column');
}

function isConflictConstraintError(error: unknown) {
  const message = getErrorMessage(error);
  return message.includes('conflict') || message.includes('constraint') || message.includes('unique');
}

export function usePredictions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['predictions', user?.id],
    queryFn: async () => {
      if (!user) return [] as PredictionRow[];
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as PredictionRow[];
    },
    enabled: !!user,
  });
}

export function usePredictionByFixture(fixtureId: number | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['predictions', 'fixture', fixtureId, user?.id],
    queryFn: async () => {
      if (!fixtureId || !user) return null;
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('fixture_id', fixtureId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] as unknown as PredictionRow) ?? null;
    },
    enabled: !!fixtureId && !!user,
  });
}

export function useSavePrediction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (prediction: Omit<PredictionRow, 'id' | 'created_at'>) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('predictions')
        .insert({ ...prediction, user_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PredictionRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions', user?.id] });
    },
  });
}

export function useUpdatePredictionStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('predictions')
        .update({ status } as any)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions', user?.id] });
    },
  });
}

export function useBankroll() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['bankroll', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      let dbAmount = 0;
      let bankrollRow: BankrollRow | null = null;
      let foundInDb = false;

      const { data, error } = await supabase
        .from('bankroll')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && !isUserIdColumnError(error)) throw error;

      if (!error && data) {
        bankrollRow = data as unknown as BankrollRow;
        dbAmount = Number(bankrollRow.amount);
        foundInDb = true;
      } else {
        const legacy = await supabase
          .from('bankroll')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        if (!legacy.error && legacy.data) {
          bankrollRow = legacy.data as unknown as BankrollRow;
          dbAmount = Number(bankrollRow.amount);
          foundInDb = true;
        }
      }

      // Sincronia de segurança: se DB não tiver a banca salvamos pelo app ou estiver zerada, puxar local.
      if (!foundInDb || dbAmount === 0 || isNaN(dbAmount)) {
        try {
          const stored = localStorage.getItem(`profeta_bankroll_${user.id}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed.amount === 'number' && parsed.amount > 0) {
              return {
                ...(bankrollRow ?? { id: user.id, user_id: user.id, updated_at: new Date().toISOString() }),
                amount: parsed.amount,
              } as unknown as BankrollRow;
            }
          }
        } catch(e) {}
      }

      return bankrollRow;
    },
    enabled: !!user,
  });
}

export function useUpdateBankroll() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (amount: number) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('bankroll')
        .upsert(
          { user_id: user.id, amount, updated_at: new Date().toISOString() } as any,
          { onConflict: 'user_id' }
        );

      if (!error) return;

      const shouldFallback = isUserIdColumnError(error) || isConflictConstraintError(error);
      if (!shouldFallback) throw error;

      const legacy = await supabase
        .from('bankroll')
        .upsert(
          { id: user.id, amount, updated_at: new Date().toISOString() } as any,
          { onConflict: 'id' }
        );
      if (legacy.error) throw legacy.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankroll', user?.id] });
    },
  });
}

export function useBetResults() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['bet_results', user?.id],
    queryFn: async () => {
      if (!user) return [] as any[];
      const { data, error } = await supabase
        .from('bet_results')
        .select('*')
        .eq('user_id', user.id)
        .order('resolved_at', { ascending: false });
      if (error) throw error;
      return data as unknown as any[];
    },
    enabled: !!user,
  });
}
