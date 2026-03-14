import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_KEY = "3ffd74d8f5b404975b2f3b24cb383a23";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, params } = await req.json();

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing endpoint parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const queryString = params
      ? "&" + Object.entries(params).map(([k, v]) => `${k}=${v}`).join("&")
      : "";

    // Try multiple auth methods
    const attempts = [
      {
        name: "header-apisports",
        url: `https://v3.football.api-sports.io${endpoint}?${queryString.replace(/^&/, '')}`,
        headers: { "x-apisports-key": API_KEY },
      },
      {
        name: "header-rapidapi",
        url: `https://api-football-v1.p.rapidapi.com${endpoint}?${queryString.replace(/^&/, '')}`,
        headers: {
          "x-rapidapi-key": API_KEY,
          "x-rapidapi-host": "api-football-v1.p.rapidapi.com",
        },
      },
      {
        name: "apiv3-apifootball",
        url: `https://apiv3.apifootball.com/${endpoint.replace(/^\//, '')}?APIkey=${API_KEY}${queryString}`,
        headers: {},
      },
    ];

    let lastError = "";
    const debugLog: string[] = [];

    for (const attempt of attempts) {
      console.log(`[football-proxy] Trying ${attempt.name}: ${attempt.url}`);

      try {
        const res = await fetch(attempt.url, {
          headers: attempt.headers,
        });

        const text = await res.text();
        debugLog.push(`${attempt.name}: status=${res.status}, body=${text.substring(0, 200)}`);

        let json: any;
        try {
          json = JSON.parse(text);
        } catch {
          console.warn(`[football-proxy] ${attempt.name}: non-JSON response`);
          lastError = `${attempt.name}: non-JSON response`;
          continue;
        }

        // Check for errors
        if (json.errors && Object.keys(json.errors).length > 0) {
          lastError = Object.values(json.errors).join(", ");
          console.warn(`[football-proxy] ${attempt.name} API error:`, lastError);
          continue;
        }

        if (json.error) {
          lastError = typeof json.error === 'string' ? json.error : JSON.stringify(json.error);
          console.warn(`[football-proxy] ${attempt.name} error:`, lastError);
          continue;
        }

        // Success
        const remaining = res.headers.get("x-ratelimit-requests-remaining");
        const limit = res.headers.get("x-ratelimit-requests-limit");
        console.log(`[football-proxy] ✅ ${attempt.name} SUCCESS! ${endpoint} → results=${json.results ?? '?'} (quota: ${remaining}/${limit})`);

        return new Response(JSON.stringify(json), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (fetchErr) {
        lastError = fetchErr instanceof Error ? fetchErr.message : "Fetch failed";
        debugLog.push(`${attempt.name}: fetch error - ${lastError}`);
        console.warn(`[football-proxy] ${attempt.name} fetch error:`, lastError);
        continue;
      }
    }

    // All failed — return debug info
    console.error("[football-proxy] ALL attempts failed. Debug:", debugLog.join(" | "));
    return new Response(
      JSON.stringify({
        error: lastError || "All API endpoints failed",
        debug: debugLog,
        results: 0,
        response: [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[football-proxy] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
