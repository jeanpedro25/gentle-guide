import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_KEY = "3ffd74d8f5b404975b2f3b24cb383a23";

const ENDPOINTS = [
  {
    url: "https://v3.football.api-sports.io",
    headers: { "x-apisports-key": API_KEY },
    name: "direct",
  },
  {
    url: "https://api-football-v1.p.rapidapi.com",
    headers: {
      "x-rapidapi-key": API_KEY,
      "x-rapidapi-host": "api-football-v1.p.rapidapi.com",
    },
    name: "rapidapi",
  },
];

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
      ? "?" + Object.entries(params).map(([k, v]) => `${k}=${v}`).join("&")
      : "";

    let lastError = "";

    for (const ep of ENDPOINTS) {
      const url = `${ep.url}${endpoint}${queryString}`;
      console.log(`[football-proxy] Trying ${ep.name}:`, url);

      try {
        const res = await fetch(url, { headers: ep.headers });
        const json = await res.json();

        if (json.errors && Object.keys(json.errors).length > 0) {
          lastError = Object.values(json.errors).join(", ");
          console.warn(`[football-proxy] ${ep.name} failed:`, lastError);
          continue;
        }

        const remaining = res.headers.get("x-ratelimit-requests-remaining");
        const limit = res.headers.get("x-ratelimit-requests-limit");
        console.log(`[football-proxy] ✅ ${ep.name} worked! ${endpoint} → ${json.results || 0} results (quota: ${remaining}/${limit})`);

        return new Response(JSON.stringify(json), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (fetchErr) {
        lastError = fetchErr instanceof Error ? fetchErr.message : "Fetch failed";
        console.warn(`[football-proxy] ${ep.name} fetch error:`, lastError);
        continue;
      }
    }

    console.error("[football-proxy] All endpoints failed:", lastError);
    return new Response(
      JSON.stringify({ error: lastError || "All API endpoints failed", results: 0, response: [] }),
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
