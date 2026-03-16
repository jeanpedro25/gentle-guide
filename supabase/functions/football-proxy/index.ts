import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "http://api.isportsapi.com";
const FALLBACK_URL = "http://api2.isportsapi.com";
const THESPORTSDB_URL = "https://www.thesportsdb.com/api/v1/json/3";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { mode } = body;

    // ── Logo mode: fetch from TheSportsDB ──
    if (mode === "logo") {
      return await handleLogoRequest(body.teamName);
    }

    // ── Default: iSports proxy ──
    return await handleISportsRequest(body);
  } catch (e) {
    console.error("[football-proxy] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleLogoRequest(teamName: string): Promise<Response> {
  if (!teamName) {
    return new Response(
      JSON.stringify({ error: "Missing teamName" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Search TheSportsDB for team
    const searchUrl = `${THESPORTSDB_URL}/searchteams.php?t=${encodeURIComponent(teamName)}`;
    const res = await fetch(searchUrl);
    const json = await res.json();

    if (json.teams && json.teams.length > 0) {
      const team = json.teams[0];
      const logoUrl = team.strBadge || team.strTeamBadge || team.strTeamLogo || null;

      if (logoUrl) {
        console.log(`[football-proxy] Logo found for "${teamName}": ${logoUrl}`);
        return new Response(
          JSON.stringify({ logoUrl }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Try alternative search with simplified name
    const simplified = teamName
      .replace(/FC|SC|CF|AC|RC|CD|SD|SE|EC|CR|CA|CE|AA|AD/gi, '')
      .trim();

    if (simplified !== teamName) {
      const altUrl = `${THESPORTSDB_URL}/searchteams.php?t=${encodeURIComponent(simplified)}`;
      const altRes = await fetch(altUrl);
      const altJson = await altRes.json();

      if (altJson.teams && altJson.teams.length > 0) {
        const team = altJson.teams[0];
        const logoUrl = team.strBadge || team.strTeamBadge || team.strTeamLogo || null;
        if (logoUrl) {
          console.log(`[football-proxy] Logo found (alt) for "${simplified}": ${logoUrl}`);
          return new Response(
            JSON.stringify({ logoUrl }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    console.log(`[football-proxy] No logo found for "${teamName}"`);
    return new Response(
      JSON.stringify({ logoUrl: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(`[football-proxy] Logo fetch error for "${teamName}":`, e);
    return new Response(
      JSON.stringify({ logoUrl: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

async function handleISportsRequest(body: { path?: string; params?: Record<string, string> }): Promise<Response> {
  const apiKey = Deno.env.get("ISPORTS_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ISPORTS_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { path, params } = body;

  if (!path) {
    return new Response(
      JSON.stringify({ error: "Missing path parameter" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const queryParams = new URLSearchParams({ api_key: apiKey, ...(params || {}) });
  const url = `${BASE_URL}${path}?${queryParams.toString()}`;
  console.log(`[football-proxy] iSports → ${path}`);

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    const fallbackUrl = `${FALLBACK_URL}${path}?${queryParams.toString()}`;
    console.log(`[football-proxy] Fallback → ${fallbackUrl}`);
    res = await fetch(fallbackUrl);
  }

  const json = await res.json();
  console.log(`[football-proxy] ✅ ${path} → code: ${json.code}, items: ${json.data?.length ?? 0}`);

  return new Response(JSON.stringify(json), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
