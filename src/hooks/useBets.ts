import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BetRow {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  fixture_id: number | null;
  prediction: '1' | 'X' | '2';
  stake: number;
  potential_profit: number;
  odd: number;
  status: 'pending' | 'won' | 'lost';
  actual_result: string | null;
  actual_score: string | null;
  profit_loss: number;
  created_at: string;
  resolved_at: string | null;
}

export function useBets() {
  return useQuery({
    queryKey: ['bets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as BetRow[];
    },
  });
}

export function useCreateBet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bet: Omit<BetRow, 'id' | 'created_at' | 'resolved_at' | 'status' | 'actual_result' | 'actual_score' | 'profit_loss'>) => {
      const { data, error } = await supabase
        .from('bets')
        .insert(bet as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as BetRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bets'] }),
  });
}

export function useResolveBet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, actual_result, actual_score, profit_loss }: {
      id: string; status: 'won' | 'lost'; actual_result: string; actual_score: string; profit_loss: number;
    }) => {
      const { error } = await supabase
        .from('bets')
        .update({ status, actual_result, actual_score, profit_loss, resolved_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bets'] }),
  });
}
