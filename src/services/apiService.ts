import { supabase } from '@/integrations/supabase/client';

// ── Cache TTLs by data type — optimized to minimize API-Football requests ──
const CACHE_TTLS: Record<CacheDataType, number> = {
  jogos:       5 * 60 * 1000,             // 5 minutes (was 30min, jogos mudam status)
  livescores:  90 * 1000,                 // 90 seconds (ao vivo)
  odds:        10 * 60 * 1000,            // 10 minutes
  resultado:   Infinity,                  // Permanent (resultado não muda)
  liga:        7 * 24 * 60 * 60 * 1000,  // 7 days
  time:        7 * 24 * 60 * 60 * 1000,  // 7 days
  estatistica: 6 * 60 * 60 * 1000,       // 6 hours (era 24h, ajustado)
};

export type CacheDataType = 'jogos' | 'odds' | 'resultado' | 'liga' | 'time' | 'estatistica' | 'livescores';

// ── Priority Queue ──
type Priority = 'high' | 'medium' | 'low' | 'minimum';
const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2, minimum: 3 };
const MAX_CONCURRENT = 2;

interface QueueItem {
  priority: Priority;
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

const queue: QueueItem[] = [];
let running = 0;

function processQueue() {
  while (running < MAX_CONCURRENT && queue.length > 0) {
    // Sort by priority
    queue.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    const item = queue.shift()!;
    running++;
    item.execute()
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => {
        running--;
        processQueue();
      });
  }
}

function enqueue<T>(priority: Priority, fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({ priority, execute: fn, resolve, reject });
    processQueue();
  });
}

// ── Deduplication Map ──
const pending = new Map<string, Promise<any>>();

async function fetchWithDedup<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  if (pending.has(key)) return pending.get(key) as Promise<T>;
  const promise = fetchFn().finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}

// ── In-memory cache layer (fast, per-session) ──
interface MemoryCacheEntry {
  data: any;
  ts: number;
  ttl: number;
}
const memoryCache = new Map<string, MemoryCacheEntry>();

function getMemoryCache(key: string): any | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setMemoryCache(key: string, data: any, ttl: number) {
  memoryCache.set(key, { data, ts: Date.now(), ttl });
}

// ── localStorage cache layer (survives reloads, shared within device) ──
const LS_PREFIX = 'profeta_apicache_';

export function getLsCache(key: string): any | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + btoa(key).slice(0, 60));
    if (!raw) return null;
    const entry: { data: any; exp: number } = JSON.parse(raw);
    if (Date.now() > entry.exp) {
      // Don't delete expired entries — keep as stale fallback
      return null; // returns null for fresh check, but stale is accessible via getStaleLsCache
    }
    return entry.data;
  } catch { return null; }
}

/**
 * Returns stale (expired) localStorage data as fallback when API is unavailable.
 * This is the KEY function for rate-limit protection.
 */
export function getStaleLsCache(key: string): any | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + btoa(key).slice(0, 60));
    if (!raw) return null;
    const entry: { data: any; exp: number } = JSON.parse(raw);
    return entry.data ?? null; // return even if expired
  } catch { return null; }
}

export function setLsCache(key: string, data: any, ttl: number) {
  if (ttl === Infinity) ttl = 7 * 24 * 60 * 60 * 1000;
  try {
    localStorage.setItem(
      LS_PREFIX + btoa(key).slice(0, 60),
      JSON.stringify({ data, exp: Date.now() + ttl })
    );
  } catch { /* quota exceeded — ignore */ }
}

// ── API Request Counter (track daily usage) ──
const COUNTER_KEY = 'profeta_api_requests_';

export function getApiRequestCount(): { today: number; date: string } {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(COUNTER_KEY + today);
    return { today: raw ? parseInt(raw, 10) : 0, date: today };
  } catch { return { today: 0, date: today }; }
}

function incrementApiCounter() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const key = COUNTER_KEY + today;
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    localStorage.setItem(key, String(current + 1));
    console.log(`[apiService] 📊 Requests hoje: ${current + 1}/100`);
  } catch {}
}

// ── Supabase cache operations ──

async function getSupabaseCache(chave: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('api_cache')
      .select('dados, expira_em, total_hits')
      .eq('chave', chave)
      .maybeSingle();

    if (error || !data) return null;

    const expiresAt = new Date(data.expira_em).getTime();
    const isExpired = Date.now() > expiresAt;

    if (!isExpired) {
      // Increment hit counter (fire-and-forget)
      supabase
        .from('api_cache')
        .update({ total_hits: (data.total_hits ?? 0) + 1 } as any)
        .eq('chave', chave)
        .then(() => {});

      return data.dados;
    }

    return null;
  } catch {
    return null;
  }
}

async function getStaleSupabaseCache(chave: string): Promise<any | null> {
  try {
    const { data } = await supabase
      .from('api_cache')
      .select('dados')
      .eq('chave', chave)
      .maybeSingle();

    return data?.dados ?? null;
  } catch {
    return null;
  }
}

async function setSupabaseCache(chave: string, dados: any, tipo: CacheDataType): Promise<void> {
  const ttl = CACHE_TTLS[tipo];
  const expiraEm = ttl === Infinity
    ? new Date('2099-12-31T23:59:59Z').toISOString()
    : new Date(Date.now() + ttl).toISOString();

  try {
    await supabase
      .from('api_cache')
      .upsert({
        chave,
        dados,
        tipo,
        expira_em: expiraEm,
        total_hits: 0,
      } as any, { onConflict: 'chave' });
  } catch (e) {
    console.warn('[apiService] Cache write failed:', e);
  }
}

// ── Main API Service ──

export interface FetchOptions {
  /** Cache key — must be unique per request */
  cacheKey: string;
  /** Type of data for TTL calculation */
  tipo: CacheDataType;
  /** Priority in the queue */
  priority?: Priority;
  /** The actual fetch function to call if cache misses */
  fetchFn: () => Promise<any>;
}

/**
 * Central API service. ALL API calls must go through this.
 * Flow: memory → localStorage → Supabase cache → API call → save everywhere
 */
export async function cachedFetch<T = any>(options: FetchOptions): Promise<T> {
  const { cacheKey, tipo, priority = 'medium', fetchFn } = options;
  const ttl = CACHE_TTLS[tipo];

  // 1. Memory cache (instant, per-session)
  const memCached = getMemoryCache(cacheKey);
  if (memCached !== null) {
    return memCached as T;
  }

  // 2. localStorage cache (survives reloads, shared within device)
  const lsCached = getLsCache(cacheKey);
  if (lsCached !== null) {
    setMemoryCache(cacheKey, lsCached, ttl === Infinity ? 24 * 60 * 60 * 1000 : ttl);
    return lsCached as T;
  }

  // 3. Supabase cache (shared across ALL users — KEY for multi-user efficiency)
  const dbCached = await getSupabaseCache(cacheKey);
  if (dbCached !== null) {
    setMemoryCache(cacheKey, dbCached, ttl === Infinity ? 24 * 60 * 60 * 1000 : ttl);
    setLsCache(cacheKey, dbCached, ttl);
    return dbCached as T;
  }

  // 4. Real API call — only when all caches miss (counted against daily limit)
  return fetchWithDedup(cacheKey, () =>
    enqueue(priority, async () => {
      try {
        incrementApiCounter(); // ← conta apenas chamadas reais à API
        const result = await fetchFn();

        // Save to ALL cache layers
        setMemoryCache(cacheKey, result, ttl === Infinity ? 24 * 60 * 60 * 1000 : ttl);
        setLsCache(cacheKey, result, ttl);
        await setSupabaseCache(cacheKey, result, tipo);

        return result as T;
      } catch (error) {
        // ─── CRITICAL: Rate limit / API failure fallback ───────────────
        // Try stale data in order: Supabase stale → localStorage stale
        // This ensures users always see data even when API quota is exceeded
        console.warn(`[apiService] ⚠️ API falhou para "${cacheKey.split('|')[1]}". Tentando cache obsoleto...`);
        const stale = await getStaleSupabaseCache(cacheKey) ?? getStaleLsCache(cacheKey);
        if (stale !== null) {
          console.info(`[apiService] ✅ Cache obsoleto encontrado e servido (dados podem ter até 24h).`);
          setMemoryCache(cacheKey, stale, 3 * 60 * 1000); // cache stale por 3 min
          return stale as T;
        }
        // No cache at all — re-throw so caller can handle gracefully
        throw error;
      }
    })
  );
}

/**
 * Clear all caches (memory + optionally Supabase)
 */
export function clearApiCache(keyIncludes?: string) {
  if (keyIncludes) {
    for (const key of memoryCache.keys()) {
      if (key.includes(keyIncludes)) memoryCache.delete(key);
    }
  } else {
    memoryCache.clear();
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  totalHits: number;
  memoryCacheSize: number;
}> {
  const { data } = await supabase
    .from('api_cache')
    .select('total_hits');

  const totalHits = (data ?? []).reduce((sum: number, row: any) => sum + (row.total_hits ?? 0), 0);

  return {
    totalEntries: data?.length ?? 0,
    totalHits,
    memoryCacheSize: memoryCache.size,
  };
}
