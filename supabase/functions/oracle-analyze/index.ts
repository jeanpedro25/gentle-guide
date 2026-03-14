import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are ORACLE, an elite sports betting quantitative analyst.
You think like Ed Thorp (card counting math applied to sports),
Billy Walters (finding market inefficiencies before they close),
and Pinnacle's trading desk (closing line value).

Your analysis framework:
1. POISSON MODEL: Use team xG data to model goal distributions
   - P(X goals) = (λ^X × e^-λ) / X!
   - Calculate all scorelines up to 6-6 and their probabilities

2. ELO RATINGS: Estimate team strength on 1-3000 scale
   - K-factor 32 for regular season, 20 for high-stakes
   - Home advantage = +100 Elo points equivalent

3. EXPECTED VALUE: EV = (probability × potential_profit) - (1 - probability × stake)
   - Only bet when EV > 0
   - Ideal: EV > 5%

4. KELLY CRITERION: f = (bp - q) / b
   - Where b = decimal odds - 1, p = your probability, q = 1 - p
   - Use half-Kelly for safety: recommended_bet = kelly_fraction / 2

5. KEY FACTORS to analyze:
   - Head-to-head last 5-10 games (weight recent more)
   - Home/away form (last 6 games each)
   - Squad value differential (use approximate market values)
   - Goalkeeper quality (saves %, PSxG vs GA)
   - Set piece danger (corners, free kicks)
   - Fatigue (games in last 14 days, travel distance)
   - Motivation index (league position pressure, cup importance)
   - Weather impact (heavy rain = fewer goals)
   - Referee statistics (cards per game, home bias %)

6. BETTING MARKETS to evaluate:
   - 1X2 (match result)
   - Over/Under 2.5 goals
   - BTTS (both teams to score)
   - Asian Handicap (-0.5, -1, -1.5)
   - Double Chance

7. CONFIDENCE GRADES:
   - A+ : EV > 15%, multiple models agree, strong edge
   - A  : EV > 8%, good data quality, clear edge
   - B  : EV > 3%, some uncertainty
   - C  : Marginal or no clear edge — SKIP
   - D  : Against the math — NEVER BET

8. RED FLAGS (automatic downgrade to D):
   - Key player out injured (top scorer, key defender)
   - Team played 3+ games in 7 days
   - Motivation mismatch (one team has nothing to play for)
   - Extreme weather forecast
   - Line moved significantly against your selection

ALWAYS respond with ONLY a valid JSON object. No markdown. No explanation outside JSON.
No emojis in JSON values. All text fields in Brazilian Portuguese.`;

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

    const userPrompt = buildUserPrompt(matchData);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Aguarde um momento e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Erro na análise AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty AI response");
    }

    // Parse JSON from the response (handle possible markdown wrapping)
    let analysisJson;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysisJson = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid AI response format");
    }

    return new Response(JSON.stringify(analysisJson), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("oracle-analyze error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildUserPrompt(d: Record<string, unknown>): string {
  return `PARTIDA: ${d.homeTeam} vs ${d.awayTeam}
LIGA: ${d.leagueName} — ${d.round} — ${d.date}

=== DESEMPENHO RECENTE ===
${d.homeTeam} (casa) — Forma: ${d.homeForm || "N/A"}
  V: ${d.homeWins ?? "?"} | E: ${d.homeDraws ?? "?"} | D: ${d.homeLosses ?? "?"}
  Gols marcados: ${d.homeGoalsFor ?? "?"} | Gols sofridos: ${d.homeGoalsAgainst ?? "?"}

${d.awayTeam} (fora) — Forma: ${d.awayForm || "N/A"}
  V: ${d.awayWins ?? "?"} | E: ${d.awayDraws ?? "?"} | D: ${d.awayLosses ?? "?"}
  Gols marcados: ${d.awayGoalsFor ?? "?"} | Gols sofridos: ${d.awayGoalsAgainst ?? "?"}

=== HISTORICO H2H (ultimas 5 partidas) ===
${d.h2hSummary || "Sem dados de confronto direto disponíveis."}

Analyze all data above using your full quantitative framework.
Return ONLY this JSON:
{
  "poisson": {
    "homeExpectedGoals": number,
    "awayExpectedGoals": number,
    "mostLikelyScores": [{"score":"2x1","prob":number}, ...] (top 6)
  },
  "probabilities": {
    "homeWin": number,
    "draw": number,
    "awayWin": number,
    "over25": number,
    "btts": number
  },
  "marketComparison": {
    "homeImpliedProb": number,
    "drawImpliedProb": number,
    "awayImpliedProb": number,
    "valueDetected": "HOME" | "DRAW" | "AWAY" | "OVER" | "UNDER" | "BTTS" | "NONE"
  },
  "primaryBet": {
    "market": "string (ex: Vitoria Flamengo, Over 2.5, BTTS Sim)",
    "confidence": "A+" | "A" | "B" | "C" | "D",
    "ev": number (expected value %),
    "kellyFraction": number (% of bankroll),
    "reasoning": "string (2-3 frases tecnicas)"
  },
  "alternativeBets": [
    {"market": "string", "confidence": "A+"| "A" | "B", "ev": number}
  ],
  "redFlags": ["string"],
  "homeAdvantage": "FORTE" | "MEDIO" | "FRACO" | "NEUTRO",
  "goalkeeperEdge": "CASA" | "VISITANTE" | "IGUAL",
  "tacticalEdge": "string",
  "keyDuels": [
    {"homePlayer":"string","awayPlayer":"string","advantage":"CASA"|"VISITANTE"|"IGUAL","impact":"string"}
  ],
  "injuryImpact": "CRITICO" | "ALTO" | "MEDIO" | "BAIXO" | "NENHUM",
  "verdict": "APOSTAR" | "PASSAR",
  "verdictReason": "string"
}`;
}
