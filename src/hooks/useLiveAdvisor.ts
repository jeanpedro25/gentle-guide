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

const SYSTEM_PROMPT = `Voce e o PROFETA, um consultor de apostas ao vivo de elite.
Analise e de uma recomendacao CLARA e OBJETIVA em JSON:
{
  "action": "CASHOUT" | "HOLD" | "BET_MORE" | "HEDGE",
  "confidence": number (0-100),
  "reasoning": "string (portugues)",
  "emoji": "emoji",
  "riskLevel": "BAIXO" | "MEDIO" | "ALTO" | "CRITICO",
  "suggestion": "string",
  "profitTip": "string"
}`;

export function useLiveAdvisor() {
  const [advice, setAdvice] = useState<Record<string, LiveAdvice>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const getAdvice = useCallback(async (matchId: string, matchData: MatchData) => {
    setLoading(prev => ({ ...prev, [matchId]: true }));
    let adviceResult: LiveAdvice | null = null;
    let fallbackError: string | null = null;

    try {
      // BYPASS: Se tiver chave Gemini no .env, chama direto sem depender da Edge Function do Supabase
      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyBuyyofn81gC66vrlU8uyNAIdByX3jIFwg';
      if (geminiKey && geminiKey !== 'COLE_AQUI_SUA_CHAVE_GEMINI') {
        const userPrompt = `JOGO AO VIVO:
${matchData.homeTeam} ${matchData.homeScore} x ${matchData.awayScore} ${matchData.awayTeam}
Liga: ${matchData.league}
Status: ${matchData.status} ${matchData.minute ? `(${matchData.minute}')` : ''}
${matchData.userBet ? `\nAPOSTA DO USUARIO: ${matchData.userBet}` : ''}
${matchData.context ? `\nCONTEXTO ADICIONAL: ${matchData.context}` : ''}
Analise a situacao e de sua recomendacao.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `${SYSTEM_PROMPT}\n\n${userPrompt}`
                }]
              }],
              generationConfig: {
                temperature: 0.2,
              }
            })
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || 'Falha na IA';
          
          if (response.status === 429) {
            throw new Error('O cérebro da Inteligência Artificial está sobrecarregado (Limite de uso gratuito atingido). Por favor, aguarde cerca de 1 minuto e tente novamente!');
          }
          throw new Error(`Gemini API Error: ${response.status} - ${errMsg}`);
        }
        
        const result = await response.json();
        const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          const cleaned = (content || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          adviceResult = JSON.parse(cleaned) as LiveAdvice;
          console.log('[LiveAdvisor] ✅ Advice recebido diretamente!');
        }
      }
    } catch (err) {
      console.error('[LiveAdvisor] Erro no bypass Gemini:', err);
      fallbackError = err instanceof Error ? err.message : 'Erro na Inteligência Artificial';
    }

    try {
      // Se o bypass falhou (ou não existia), usamos a API Edge do Supabase e encerramos.
      if (!adviceResult) {
        const { data, error } = await supabase.functions.invoke('live-advisor', {
          body: { matchData },
        });

        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        adviceResult = data as LiveAdvice;
      }

      setAdvice(prev => ({ ...prev, [matchId]: adviceResult as LiveAdvice }));
    } catch (err) {
      console.error('[LiveAdvisor] error:', err);
      toast.error(fallbackError || (err instanceof Error ? err.message : 'Erro ao consultar advisor'));
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
