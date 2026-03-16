import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LiveAdvice {
  action: 'CASHOUT' | 'HOLD' | 'BET_MORE' | 'HEDGE';
  confidence: number;
  reasoning: string;
  emoji: string;
  riskLevel: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';
  suggestion: string;
  profitTip: string;
}

interface MatchData {
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  league: string;
  status: string;
  minute?: string;
  userBet?: string;
  context?: string;
}

export function useLiveAdvisor() {
  const [advice, setAdvice] = useState<Record<string, LiveAdvice>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const getAdvice = useCallback(async (matchId: string, matchData: MatchData) => {
    setLoading(prev => ({ ...prev, [matchId]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('live-advisor', {
        body: { matchData },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setAdvice(prev => ({ ...prev, [matchId]: data as LiveAdvice }));
    } catch (err) {
      console.error('[LiveAdvisor] error:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao consultar advisor');
    } finally {
      setLoading(prev => ({ ...prev, [matchId]: false }));
    }
  }, []);

  const clearAdvice = useCallback((matchId: string) => {
    setAdvice(prev => {
      const next = { ...prev };
      delete next[matchId];
      return next;
    });
  }, []);

  return { advice, loading, getAdvice, clearAdvice };
}
