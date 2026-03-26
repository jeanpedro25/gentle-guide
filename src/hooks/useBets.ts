import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BetRow {
  id: string;
  user_id: string | null;
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

// Helper to sync with localStorage and Supabase consistently
async function fetchBankroll(userId: string) {
  let dbAmount = 0;
  let key = 'user_id';
  let foundInDb = false;

  const { data, error } = await supabase.from('bankroll').select('amount').eq('user_id', userId).maybeSingle();
  if (!error && data) {
    dbAmount = Number(data.amount);
    foundInDb = true;
  } else {
    // Legacy fallback
    const legacy = await supabase.from('bankroll').select('amount').eq('id', userId).maybeSingle();
    if (!legacy.error && legacy.data) {
      dbAmount = Number(legacy.data.amount);
      key = 'id';
      foundInDb = true;
    }
  }

  // Falha crítica do banco ou zerado: busca do LocalStorage
  if (!foundInDb || dbAmount === 0 || isNaN(dbAmount)) {
    try {
      const stored = localStorage.getItem(`profeta_bankroll_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.amount === 'number' && parsed.amount > 0) {
          return { amount: parsed.amount, key };
        }
      }
    } catch(e) {}
  }
  
  return { amount: dbAmount, key };
}

// Helper to update localStorage
function updateLocalBankroll(userId: string, newAmount: number) {
  try {
    const storageKey = `profeta_bankroll_${userId}`;
    const stored = localStorage.getItem(storageKey);
    let initialAmount = newAmount;
    if (stored) {
      initialAmount = JSON.parse(stored).initialAmount || newAmount;
    }
    localStorage.setItem(storageKey, JSON.stringify({ amount: newAmount, initialAmount }));
  } catch (e) {
    console.error('Local update erro:', e);
  }
}

export function useBets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['bets', user?.id],
    queryFn: async () => {
      if (!user) return [] as BetRow[];
      const { data, error } = await (supabase.from('bets').select('*') as any)
        .eq('user_id', (user as any).id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as BetRow[];
    },
    enabled: !!user,
  });
}

export function useCreateBet() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (bet: Omit<BetRow, 'id' | 'created_at' | 'resolved_at' | 'status' | 'actual_result' | 'actual_score' | 'profit_loss' | 'user_id'>) => {
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Validação local
      if (bet.stake <= 0) throw new Error('Valor da aposta deve ser positivo.');

      // 2. Verifica saldo (sincronizando com LocalStorage e DB)
      const bankInfo = await fetchBankroll(user.id);
      const currentAmount = bankInfo ? bankInfo.amount : 0;
      
      if (bet.stake > currentAmount) {
        throw new Error(`Saldo insuficiente na banca (R$ ${currentAmount.toFixed(2)}).`);
      }

      // 3. Insere aposta
      console.log('[Bets] 📝 Tentando registrar aposta:', { ...bet, user_id: user.id });
      
      const { data, error: insertError } = await (supabase.from('bets') as any)
        .insert({
          home_team: bet.home_team,
          away_team: bet.away_team,
          league: bet.league,
          fixture_id: bet.fixture_id,
          prediction: bet.prediction,
          stake: bet.stake,
          potential_profit: bet.potential_profit,
          odd: bet.odd,
          status: 'pending',
          user_id: user.id,
          profit_loss: 0
        })
        .select()
        .single();

      if (insertError) {
        console.error('[Bets] ❌ Erro no insert Supabase:', insertError);
        throw new Error(insertError.message || 'Erro ao inserir no banco');
      }

      // 4. Deduz da banca imediatamente
      if (bankInfo) {
        const newAmount = currentAmount - bet.stake;
        
        // Tenta atualizar BD
        const { error: bankrollError } = await supabase
          .from('bankroll')
          .update({ amount: newAmount, updated_at: new Date().toISOString() })
          .eq(bankInfo.key, user.id);

        if (bankrollError) {
          console.error('[Bets] ❌ Erro ao atualizar banca DB (Pode ser que a linha nao exista. O fallback local cuidara.):', bankrollError);
        }

        // Atualiza UI garantidamente via LocalStorage
        updateLocalBankroll(user.id, newAmount);
      }

      return data as unknown as BetRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bets', user?.id] });
      qc.invalidateQueries({ queryKey: ['bankroll', user?.id] });
    },
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

      // 1. Atualiza aposta
      const { data: bet, error } = await (supabase.from('bets') as any)
        .update({ status, actual_result, actual_score, profit_loss, resolved_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!bet) return;

      // 2. Ajusta saldo da banca
      if (status === 'won') {
        const bankInfo = await fetchBankroll(user.id);
        if (bankInfo) {
          const totalReturn = Number(bet.stake) + Number(bet.potential_profit);
          const newAmount = bankInfo.amount + totalReturn;
          
          await supabase
            .from('bankroll')
            .update({ amount: newAmount, updated_at: new Date().toISOString() })
            .eq(bankInfo.key, user.id);

          updateLocalBankroll(user.id, newAmount);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bets', user?.id] });
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

      const { data: updatedBet, error } = await (supabase.from('bets') as any)
        .update({ status, actual_result, actual_score, profit_loss, resolved_at } as any)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .maybeSingle();
      if (error) throw error;

      if (!updatedBet) return;

      // Se mudou de PENDING para WON: adiciona Stake + Lucro
      // Se mudou de WON para LOST: remove o que foi dado (Stake + Lucro)
      // Nota: o Stake original já saiu no useCreateBet.
      let delta = 0;
      if (status === 'won' && previous_profit_loss === 0) {
        delta = Number(updatedBet.stake) + Number(updatedBet.potential_profit);
      } else if (status === 'lost' && previous_profit_loss > 0) {
        delta = -(Number(updatedBet.stake) + Number(previous_profit_loss));
      } else if (status === 'pending' && previous_profit_loss > 0) {
        delta = -(Number(updatedBet.stake) + Number(previous_profit_loss));
      }

      if (delta === 0) return;

      const bankInfo = await fetchBankroll(user.id);
      if (!bankInfo) return;

      const newAmount = bankInfo.amount + delta;

      await supabase
        .from('bankroll')
        .update({ amount: newAmount, updated_at: new Date().toISOString() })
        .eq(bankInfo.key, user.id);

      updateLocalBankroll(user.id, newAmount);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bets', user?.id] });
      qc.invalidateQueries({ queryKey: ['bankroll', user?.id] });
    },
  });
}
