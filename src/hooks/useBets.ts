import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
        .insert({ ...bet, status: 'pending' } as any)
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
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status, actual_result, actual_score, profit_loss }: {
      id: string; status: 'won' | 'lost'; actual_result: string; actual_score: string; profit_loss: number;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { data: updatedBet, error } = await supabase
        .from('bets')
        .update({ status, actual_result, actual_score, profit_loss, resolved_at: new Date().toISOString() } as any)
        .eq('id', id)
        .eq('status', 'pending')
        .select('id, status')
        .maybeSingle();
      if (error) throw error;

      if (!updatedBet) return;

      const { data: bankrollRow, error: bankrollError } = await supabase
        .from('bankroll')
        .select('amount')
        .eq('id', user.id)
        .maybeSingle();
      if (bankrollError) throw bankrollError;
      if (!bankrollRow) return;

      const newAmount = Number(bankrollRow.amount) + Number(profit_loss);

      const { error: updateBankrollError } = await supabase
        .from('bankroll')
        .update({ amount: newAmount, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (updateBankrollError) throw updateBankrollError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bets'] });
      qc.invalidateQueries({ queryKey: ['bankroll', user?.id] });
    },
  });
}

export function useUpdateBetManual() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      actual_result,
      actual_score,
      profit_loss,
      previous_profit_loss,
    }: {
      id: string;
      status: 'pending' | 'won' | 'lost';
      actual_result: string | null;
      actual_score: string | null;
      profit_loss: number;
      previous_profit_loss: number;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const resolved_at = status === 'pending' ? null : new Date().toISOString();

      const { data: updatedBet, error } = await supabase
        .from('bets')
        .update({ status, actual_result, actual_score, profit_loss, resolved_at } as any)
        .eq('id', id)
        .select('id, status, profit_loss')
        .maybeSingle();
      if (error) throw error;

      if (!updatedBet) return;

      const delta = Number(profit_loss) - Number(previous_profit_loss);
      if (delta === 0) return;

      const { data: bankrollRow, error: bankrollError } = await supabase
        .from('bankroll')
        .select('amount')
        .eq('id', user.id)
        .maybeSingle();
      if (bankrollError) throw bankrollError;
      if (!bankrollRow) return;

      const newAmount = Number(bankrollRow.amount) + delta;

      const { error: updateBankrollError } = await supabase
        .from('bankroll')
        .update({ amount: newAmount, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (updateBankrollError) throw updateBankrollError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bets'] });
      qc.invalidateQueries({ queryKey: ['bankroll', user?.id] });
    },
  });
}
