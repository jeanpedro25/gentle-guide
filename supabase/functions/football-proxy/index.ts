import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_FOOTBALL_URL = "https://v3.football.api-sports.io";
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

    // ── Default: API-Football v3 proxy ──
    return await handleApiFootballRequest(body);
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

    // Try simplified name
    const simplified = teamName
      .replace(/FC|SC|CF|AC|RC|CD|SD|SE|EC|CR|CA|CE|AA|AD/gi, '')
      .trim();

    if (simplified !== teamName && simplified.length >= 3) {
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

async function handleApiFootballRequest(body: {
  endpoint?: string;
  params?: Record<string, string>;
  // Legacy support: path field maps to endpoint
  path?: string;
}): Promise<Response> {
  const apiKeysEnv = Deno.env.get("FOOTBALL_API_KEYS");
  const apiKeys = [
    ...(apiKeysEnv ? apiKeysEnv.split(',') : []),
    Deno.env.get("FOOTBALL_API_KEY"),
    Deno.env.get("FOOTBALL_API_KEY_SECONDARY"),
  ]
    .map(key => (key || '').trim())
    .filter((key, index, all) => Boolean(key) && all.indexOf(key) === index);

  if (apiKeys.length === 0) {
    return new Response(
      JSON.stringify({ error: "FOOTBALL_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const endpoint = body.endpoint || body.path;
  if (!endpoint) {
    return new Response(
      JSON.stringify({ error: "Missing endpoint parameter" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Clean endpoint: remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const queryParams = new URLSearchParams(body.params || {});
  const url = `${API_FOOTBALL_URL}/${cleanEndpoint}?${queryParams.toString()}`;

  console.log(`[football-proxy] API-Football → ${cleanEndpoint} params:`, body.params || {});

  for (let i = 0; i < apiKeys.length; i += 1) {
    const apiKey = apiKeys[i];
    const res = await fetch(url, {
      headers: {
        "x-apisports-key": apiKey,
      },
    });

    const json = await res.json();
    const errors = json?.errors;
    const errorMessages = Array.isArray(errors)
      ? errors.join(' | ')
      : Object.values(errors || {}).join(' | ');

    const hasErrors = Boolean(errorMessages);
    const isRateLimit = res.status === 429 || /limit|too many|quota|rate/i.test(errorMessages);
    const isAuthError = res.status === 401 || res.status === 403 || /apikey|key|unauthorized|access/i.test(errorMessages);

    if (hasErrors) {
      console.error(`[football-proxy] API errors:`, errors);
    }

    if ((isRateLimit || isAuthError) && i < apiKeys.length - 1) {
      console.warn(`[football-proxy] Retrying with backup key for ${cleanEndpoint}`);
      continue;
    }

    console.log(`[football-proxy] ✅ ${cleanEndpoint} → results: ${json.results ?? 0}`);

    return new Response(JSON.stringify(json), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ error: "All API keys failed" }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
