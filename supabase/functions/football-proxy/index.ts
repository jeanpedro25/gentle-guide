import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://v3.football.api-sports.io";
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
      ? "?" + Object.entries(params).map(([k, v]) => `${k}=${v}`).join("&")
      : "";

    const url = `${BASE_URL}${endpoint}${queryString}`;
    console.log("[football-proxy] Fetching:", url);

    const res = await fetch(url, {
      headers: { "x-apisports-key": API_KEY },
    });

    const json = await res.json();

    // Log quota info from headers
    const remaining = res.headers.get("x-ratelimit-requests-remaining");
    const limit = res.headers.get("x-ratelimit-requests-limit");
    console.log(`[football-proxy] Quota: ${remaining}/${limit} remaining`);

    if (json.errors && Object.keys(json.errors).length > 0) {
      console.error("[football-proxy] API errors:", JSON.stringify(json.errors));
      return new Response(
        JSON.stringify({
          error: Object.values(json.errors).join(", "),
          results: 0,
          response: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[football-proxy] ${endpoint} → ${json.results || 0} results`);

    return new Response(JSON.stringify(json), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[football-proxy] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
