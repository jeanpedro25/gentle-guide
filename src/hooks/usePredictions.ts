import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PredictionRow {
  id: string;
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
  prediction_id: string;
  actual_score: string | null;
  won: boolean | null;
  profit_loss: number | null;
  resolved_at: string;
}

export function usePredictions() {
  return useQuery({
    queryKey: ['predictions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as PredictionRow[];
    },
  });
}

export function usePredictionByFixture(fixtureId: number | undefined) {
  return useQuery({
    queryKey: ['predictions', 'fixture', fixtureId],
    queryFn: async () => {
      if (!fixtureId) return null;
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('fixture_id', fixtureId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] as unknown as PredictionRow) ?? null;
    },
    enabled: !!fixtureId,
  });
}

export function useSavePrediction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prediction: Omit<PredictionRow, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('predictions')
        .insert(prediction as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PredictionRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
    },
  });
}

export function useUpdatePredictionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('predictions')
        .update({ status } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
    },
  });
}

export function useBankroll() {
  return useQuery({
    queryKey: ['bankroll'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bankroll')
        .select('*')
        .limit(1);
      if (error) throw error;
      return (data?.[0] as unknown as BankrollRow) ?? null;
    },
  });
}

export function useUpdateBankroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (amount: number) => {
      // Get current bankroll id
      const { data: current } = await supabase
        .from('bankroll')
        .select('id')
        .limit(1);
      if (!current?.[0]) throw new Error('No bankroll found');
      const { error } = await supabase
        .from('bankroll')
        .update({ amount, updated_at: new Date().toISOString() } as any)
        .eq('id', current[0].id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankroll'] });
    },
  });
}

export function useBetResults() {
  return useQuery({
    queryKey: ['bet_results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bet_results')
        .select('*')
        .order('resolved_at', { ascending: false });
      if (error) throw error;
      return data as unknown as BetResultRow[];
    },
  });
}

export function useSaveBetResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (result: Omit<BetResultRow, 'id' | 'resolved_at'>) => {
      const { data, error } = await supabase
        .from('bet_results')
        .insert(result as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bet_results'] });
    },
  });
}
