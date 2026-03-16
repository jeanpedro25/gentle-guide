/**
 * Team logo resolver — fetches real badges from TheSportsDB (free API)
 * and caches them in localStorage. Falls back to initials avatar.
 */

import { supabase } from '@/integrations/supabase/client';

const LOGO_CACHE_KEY = 'team-logo-cache';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface LogoCacheEntry {
  url: string;
  ts: number;
}

// In-memory cache for current session
const memoryCache = new Map<string, string>();

// Load persisted cache
function loadCache(): Record<string, LogoCacheEntry> {
  try {
    return JSON.parse(localStorage.getItem(LOGO_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, LogoCacheEntry>) {
  try {
    localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(cache));
  } catch { /* quota exceeded */ }
}

// Pending fetches to avoid duplicate requests
const pending = new Map<string, Promise<string>>();

/**
 * Generate a team initials avatar as a data URI SVG (fallback)
 */
function generateInitialsAvatar(teamName: string): string {
  const words = teamName.replace(/FC|SC|CF|AC|RC|CD|SD|SE|EC|CR|CA|CE|AA|AD/gi, '').trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : teamName.slice(0, 2).toUpperCase();

  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
    <rect width="80" height="80" rx="16" fill="hsl(${hue}, 60%, 25%)"/>
    <text x="40" y="44" text-anchor="middle" dominant-baseline="central" font-family="system-ui, sans-serif" font-weight="700" font-size="28" fill="hsl(${hue}, 70%, 75%)">${initials}</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Fetch real logo from TheSportsDB via proxy
 */
async function fetchLogoFromAPI(teamName: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('football-proxy', {
      body: { mode: 'logo', teamName },
    });

    if (error || !data?.logoUrl) return null;
    return data.logoUrl;
  } catch {
    return null;
  }
}

/**
 * Resolve and cache a team logo. Returns immediately with best available.
 */
async function resolveLogoAsync(teamName: string): Promise<string> {
  const key = teamName.toLowerCase().trim();

  // Check memory cache
  const mem = memoryCache.get(key);
  if (mem) return mem;

  // Check localStorage cache
  const diskCache = loadCache();
  const cached = diskCache[key];
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    memoryCache.set(key, cached.url);
    return cached.url;
  }

  // Fetch from API (deduplicate)
  if (!pending.has(key)) {
    const promise = fetchLogoFromAPI(teamName).then(url => {
      const resolvedUrl = url || generateInitialsAvatar(teamName);
      memoryCache.set(key, resolvedUrl);

      // Persist
      const cache = loadCache();
      cache[key] = { url: resolvedUrl, ts: Date.now() };
      saveCache(cache);

      pending.delete(key);
      return resolvedUrl;
    });
    pending.set(key, promise);
  }

  return pending.get(key)!;
}

// Track elements waiting for logos to trigger re-render
const logoListeners = new Map<string, Set<(url: string) => void>>();

/**
 * Get team logo synchronously (returns fallback immediately, fetches real one in background).
 * Use onLogoReady callback to update when real logo arrives.
 */
export function getTeamLogo(teamName: string, currentLogo?: string): string {
  // If we already have a real logo URL (not placeholder), use it
  if (currentLogo && currentLogo !== '/placeholder.svg' && !currentLogo.includes('placeholder')) {
    return currentLogo;
  }

  const key = teamName.toLowerCase().trim();

  // Check memory cache first (instant)
  const mem = memoryCache.get(key);
  if (mem) return mem;

  // Check localStorage
  const diskCache = loadCache();
  const cached = diskCache[key];
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    memoryCache.set(key, cached.url);
    return cached.url;
  }

  // Start async fetch in background
  resolveLogoAsync(teamName);

  // Return initials avatar immediately
  return generateInitialsAvatar(teamName);
}

/**
 * Preload logos for a list of team names (call on page load).
 * Returns a promise that resolves when all logos are cached.
 */
export async function preloadTeamLogos(teamNames: string[]): Promise<void> {
  const unique = [...new Set(teamNames.map(n => n.toLowerCase().trim()))];
  const uncached = unique.filter(name => {
    if (memoryCache.has(name)) return false;
    const cache = loadCache();
    const entry = cache[name];
    return !entry || Date.now() - entry.ts >= CACHE_TTL;
  });

  if (uncached.length === 0) return;

  // Batch fetch — max 5 concurrent
  const BATCH = 5;
  for (let i = 0; i < uncached.length; i += BATCH) {
    const batch = uncached.slice(i, i + BATCH);
    await Promise.allSettled(batch.map(name => resolveLogoAsync(name)));
  }
}
