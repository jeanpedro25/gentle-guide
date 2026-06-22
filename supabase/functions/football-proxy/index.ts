import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── odds-api.io base URL (correct base, NOT the-odds-api.com) ──
const ODDS_API_URL = "https://api.odds-api.io/v3";
const THESPORTSDB_URL = "https://www.thesportsdb.com/api/v1/json/3";

// Fallback key (user provided publicly). Prefer the FOOTBALL_API_KEY secret.
const FALLBACK_KEY = "86421190b25cd4ddcd20578c4ecde65314885203c1cbe263e3770ba02c1a22bc";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { mode } = body;

    if (mode === "logo") {
      return await handleLogoRequest(body.teamName);
    }

    return await handleFixturesRequest(body);
  } catch (e) {
    console.error("[football-proxy] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getApiKeys(): string[] {
  return [
    (Deno.env.get("FOOTBALL_API_KEY") || "").trim(),
    (Deno.env.get("ODDS_API_KEY") || "").trim(),
    FALLBACK_KEY,
  ].filter((k, i, all) => Boolean(k) && all.indexOf(k) === i);
}

// Map odds-api.io status → API-Football short/long status
function mapStatus(status: string): { short: string; long: string } {
  switch ((status || "").toLowerCase()) {
    case "settled":
      return { short: "FT", long: "Match Finished" };
    case "live":
    case "inplay":
      return { short: "LIVE", long: "In Play" };
    case "cancelled":
    case "canceled":
      return { short: "CANC", long: "Match Cancelled" };
    case "postponed":
      return { short: "PST", long: "Match Postponed" };
    case "pending":
    default:
      return { short: "NS", long: "Not Started" };
  }
}

interface OddsEvent {
  id: number;
  home: string;
  away: string;
  homeId?: number;
  awayId?: number;
  date: string;
  sport?: { name?: string; slug?: string };
  league?: { name?: string; slug?: string };
  status?: string;
  scores?: { home?: number | null; away?: number | null };
}

// Reshape one odds-api.io event into API-Football fixture format
function toApiFootballFixture(e: OddsEvent) {
  const status = mapStatus(e.status || "pending");
  const ts = Math.floor(new Date(e.date).getTime() / 1000);
  const homeScore = e.scores?.home ?? null;
  const awayScore = e.scores?.away ?? null;

  let homeWinner: boolean | null = null;
  let awayWinner: boolean | null = null;
  if (status.short === "FT" && homeScore !== null && awayScore !== null) {
    homeWinner = homeScore > awayScore ? true : homeScore < awayScore ? false : null;
    awayWinner = awayScore > homeScore ? true : awayScore < homeScore ? false : null;
  }

  return {
    fixture: {
      id: e.id,
      date: e.date,
      timestamp: ts,
      status: { short: status.short, long: status.long },
    },
    league: {
      id: 0,
      name: e.league?.name || "—",
      country: (e.league?.name || "").split(" - ")[0] || "",
      logo: "",
      round: "",
    },
    teams: {
      home: { id: e.homeId ?? 0, name: e.home, logo: "/placeholder.svg", winner: homeWinner },
      away: { id: e.awayId ?? 0, name: e.away, logo: "/placeholder.svg", winner: awayWinner },
    },
    goals: { home: homeScore, away: awayScore },
  };
}

// Best-effort map: API-Football league id → odds-api.io league slug fragment
const LEAGUE_SLUG_HINTS: Record<string, string[]> = {
  "39": ["england-premier-league"],
  "140": ["spain-laliga", "spain-la-liga"],
  "135": ["italy-serie-a"],
  "78": ["germany-bundesliga"],
  "61": ["france-ligue-1"],
  "2": ["champions-league"],
  "3": ["europa-league"],
  "71": ["brazil-brasileiro-serie-a", "brazil-serie-a"],
  "72": ["brazil-brasileiro-serie-b"],
  "73": ["brazil-copa-do-brasil"],
  "128": ["argentina-primera-division", "argentina-liga-profesional"],
  "253": ["usa-mls"],
  "262": ["mexico-liga-mx", "mexico-primera"],
  "13": ["libertadores"],
  "11": ["sudamericana", "sul-americana"],
};

async function handleFixturesRequest(body: {
  endpoint?: string;
  params?: Record<string, string>;
  path?: string;
}): Promise<Response> {
  const apiKey = getApiKey();
  const params = body.params || {};

  const url = `${ODDS_API_URL}/events?sport=football&apiKey=${encodeURIComponent(apiKey)}`;
  console.log(`[football-proxy] odds-api.io → events params:`, params);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    console.error("[football-proxy] odds-api.io error:", res.status, text.slice(0, 200));
    return new Response(
      JSON.stringify({ errors: [`odds-api.io ${res.status}`], results: 0, response: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let events: OddsEvent[] = await res.json();
  if (!Array.isArray(events)) events = [];

  // ── Filter according to API-Football style params ──
  if (params.id) {
    const id = String(params.id);
    events = events.filter((e) => String(e.id) === id);
  }

  if (params.live === "all") {
    events = events.filter((e) => ["live", "inplay"].includes((e.status || "").toLowerCase()));
  }

  if (params.date) {
    events = events.filter((e) => (e.date || "").slice(0, 10) === params.date);
  }

  if (params.from && params.to) {
    events = events.filter((e) => {
      const d = (e.date || "").slice(0, 10);
      return d >= params.from! && d <= params.to!;
    });
  }

  if (params.league) {
    const hints = LEAGUE_SLUG_HINTS[String(params.league)];
    if (hints && hints.length > 0) {
      events = events.filter((e) => {
        const slug = (e.league?.slug || "").toLowerCase();
        return hints.some((h) => slug.includes(h));
      });
    }
  }

  const response = events.map(toApiFootballFixture);

  console.log(`[football-proxy] ✅ events → results: ${response.length}`);

  return new Response(
    JSON.stringify({
      get: "fixtures",
      parameters: params,
      errors: [],
      results: response.length,
      paging: { current: 1, total: 1 },
      response,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

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
        return new Response(
          JSON.stringify({ logoUrl }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const simplified = teamName.replace(/FC|SC|CF|AC|RC|CD|SD|SE|EC|CR|CA|CE|AA|AD/gi, "").trim();
    if (simplified !== teamName && simplified.length >= 3) {
      const altUrl = `${THESPORTSDB_URL}/searchteams.php?t=${encodeURIComponent(simplified)}`;
      const altRes = await fetch(altUrl);
      const altJson = await altRes.json();
      if (altJson.teams && altJson.teams.length > 0) {
        const team = altJson.teams[0];
        const logoUrl = team.strBadge || team.strTeamBadge || team.strTeamLogo || null;
        if (logoUrl) {
          return new Response(
            JSON.stringify({ logoUrl }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

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
