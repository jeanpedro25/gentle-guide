import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "http://api.isportsapi.com";
const FALLBACK_URL = "http://api2.isportsapi.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ISPORTS_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ISPORTS_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { path, params } = await req.json();

    if (!path) {
      return new Response(
        JSON.stringify({ error: "Missing path parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query string
    const queryParams = new URLSearchParams({ api_key: apiKey, ...(params || {}) });
    const url = `${BASE_URL}${path}?${queryParams.toString()}`;
    console.log(`[football-proxy] iSports → ${path}`);

    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      // Fallback to api2
      const fallbackUrl = `${FALLBACK_URL}${path}?${queryParams.toString()}`;
      console.log(`[football-proxy] Fallback → ${fallbackUrl}`);
      res = await fetch(fallbackUrl);
    }

    const json = await res.json();
    console.log(`[football-proxy] ✅ ${path} → code: ${json.code}, items: ${json.data?.length ?? 0}`);

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
