/**
 * Team logo resolver — fetches real badges from TheSportsDB (free API)
 * and caches them in localStorage. Falls back to initials avatar.
 */

import { supabase } from '@/integrations/supabase/client';

const LOGO_CACHE_KEY = 'team-logo-cache-v3';
const CACHE_TTL = 15 * 24 * 60 * 60 * 1000; // 15 days

interface LogoCacheEntry {
  url: string;
  ts: number;
}

const memoryCache = new Map<string, string>();
const listeners = new Set<() => void>();

export function subscribeToLogoUpdates(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  listeners.forEach(fn => fn());
}

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

const pending = new Map<string, Promise<string>>();

function generateInitialsAvatar(teamName: string): string {
  const words = teamName.replace(/FC|SC|CF|AC|RC|CD|SD|SE|EC|CR|CA|CE|AA|AD|U20|U23|Women|Fem/gi, '').trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : teamName.slice(0, 2).toUpperCase();

  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
    <rect width="80" height="80" rx="20" fill="hsl(${hue}, 40%, 15%)"/>
    <text x="40" y="44" text-anchor="middle" dominant-baseline="central" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="28" fill="hsl(${hue}, 80%, 70%)">${initials}</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

async function fetchLogoFromAPI(teamName: string): Promise<string | null> {
  try {
    const variations = [
      teamName,
      teamName.replace(/FC|SC|CF|AC|RC|CD|SD|SE|EC|CR|CA|CE|AA|AD/gi, '').trim(),
      teamName.split(' ')[0]
    ].filter(n => n.length >= 3);

    for (const name of variations) {
      const { data, error } = await supabase.functions.invoke('football-proxy', {
        body: { mode: 'logo', teamName: name },
      });
      if (!error && data?.logoUrl) return data.logoUrl;
    }
    return null;
  } catch {
    return null;
  }
}

export async function resolveLogoAsync(teamName: string): Promise<string> {
  const key = teamName.toLowerCase().trim();
  if (memoryCache.has(key)) return memoryCache.get(key)!;

  const diskCache = loadCache();
  const cached = diskCache[key];
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    memoryCache.set(key, cached.url);
    return cached.url;
  }

  if (!pending.has(key)) {
    const promise = fetchLogoFromAPI(teamName).then(url => {
      const resolvedUrl = url || generateInitialsAvatar(teamName);
      memoryCache.set(key, resolvedUrl);
      const cache = loadCache();
      cache[key] = { url: resolvedUrl, ts: Date.now() };
      saveCache(cache);
      pending.delete(key);
      if (url) notifyListeners();
      return resolvedUrl;
    });
    pending.set(key, promise);
  }

  return pending.get(key)!;
}

export function getTeamLogo(teamName: string, currentLogo?: string): string {
  if (currentLogo && currentLogo !== '/placeholder.svg' && !currentLogo.includes('placeholder') && currentLogo.startsWith('http')) {
    return currentLogo;
  }

  const key = teamName.toLowerCase().trim();
  if (memoryCache.has(key)) return memoryCache.get(key)!;

  const diskCache = loadCache();
  const cached = diskCache[key];
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    memoryCache.set(key, cached.url);
    return cached.url;
  }

  resolveLogoAsync(teamName);
  return generateInitialsAvatar(teamName);
}

export async function preloadTeamLogos(teamNames: string[]): Promise<void> {
  const unique = [...new Set(teamNames.map(n => n.toLowerCase().trim()))];
  const uncached = unique.filter(name => !memoryCache.has(name));
  if (uncached.length === 0) return;
  const BATCH = 5;
  for (let i = 0; i < uncached.length; i += BATCH) {
    const batch = uncached.slice(i, i + BATCH);
    await Promise.allSettled(batch.map(name => resolveLogoAsync(name)));
  }
}