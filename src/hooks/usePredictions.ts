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
  id: string;
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
      const { data, error } = await supabase
        .from('bankroll')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as unknown as BankrollRow;
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
          { id: user.id, amount, updated_at: new Date().toISOString() } as any,
          { onConflict: 'id' }
        );

      if (error) throw error;
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
