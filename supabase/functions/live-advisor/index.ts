import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Voce e o PROFETA, um consultor de apostas ao vivo de elite.
Analise a situacao atual do jogo ao vivo e de uma recomendacao CLARA e OBJETIVA.

Sua resposta DEVE ser um JSON valido com esta estrutura exata:
{
  "action": "CASHOUT" | "HOLD" | "BET_MORE" | "HEDGE",
  "confidence": number (0-100),
  "reasoning": "string (2-3 frases em portugues)",
  "emoji": "string (1 emoji que represente a acao)",
  "riskLevel": "BAIXO" | "MEDIO" | "ALTO" | "CRITICO",
  "suggestion": "string (frase curta com acao recomendada)",
  "profitTip": "string (dica sobre lucro/prejuizo)"
}

Regras:
- CASHOUT: quando o time apostado esta perdendo ou o jogo mudou de rumo
- HOLD: quando esta no caminho certo, mantenha a aposta
- BET_MORE: quando ha oportunidade clara de lucro extra (raro, alta confianca)
- HEDGE: quando o resultado esta incerto, sugira aposta de protecao

Considere: placar atual, tempo de jogo, momento do jogo, cartoes, e tendencia geral.
Responda APENAS com JSON valido. Sem markdown. Sem explicacao fora do JSON.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { matchData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userPrompt = `JOGO AO VIVO:
${matchData.homeTeam} ${matchData.homeScore} x ${matchData.awayScore} ${matchData.awayTeam}
Liga: ${matchData.league}
Status: ${matchData.status} ${matchData.minute ? `(${matchData.minute}')` : ''}
${matchData.userBet ? `\nAPOSTA DO USUARIO: ${matchData.userBet}` : ''}
${matchData.context ? `\nCONTEXTO ADICIONAL: ${matchData.context}` : ''}

Analise a situacao e de sua recomendacao.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit. Aguarde e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Creditos insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) throw new Error("Empty AI response");

    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse live advisor response:", content);
      throw new Error("Invalid AI response");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("live-advisor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
