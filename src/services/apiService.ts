import { supabase } from '@/integrations/supabase/client';

// ── Cache TTLs by data type (in milliseconds) ──
const CACHE_TTLS: Record<CacheDataType, number> = {
  jogos: 30 * 60 * 1000,           // 30 minutes
  odds: 5 * 60 * 1000,             // 5 minutes
  resultado: Infinity,              // Permanent
  liga: 7 * 24 * 60 * 60 * 1000,   // 7 days
  time: 7 * 24 * 60 * 60 * 1000,   // 7 days
  estatistica: 24 * 60 * 60 * 1000, // 24 hours
  livescores: 60 * 1000,            // 60 seconds
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
 * Flow: memory cache → Supabase cache → API call → save to both caches
 */
export async function cachedFetch<T = any>(options: FetchOptions): Promise<T> {
  const { cacheKey, tipo, priority = 'medium', fetchFn } = options;
  const ttl = CACHE_TTLS[tipo];

  // 1. Memory cache (instant)
  const memCached = getMemoryCache(cacheKey);
  if (memCached !== null) {
    return memCached as T;
  }

  // 2. Supabase cache (shared across users)
  const dbCached = await getSupabaseCache(cacheKey);
  if (dbCached !== null) {
    setMemoryCache(cacheKey, dbCached, ttl === Infinity ? 24 * 60 * 60 * 1000 : ttl);
    return dbCached as T;
  }

  // 3. Deduplicated API call through priority queue
  return fetchWithDedup(cacheKey, () =>
    enqueue(priority, async () => {
      try {
        const result = await fetchFn();

        // Save to both caches
        setMemoryCache(cacheKey, result, ttl === Infinity ? 24 * 60 * 60 * 1000 : ttl);
        await setSupabaseCache(cacheKey, result, tipo);

        return result as T;
      } catch (error) {
        // Fallback: try stale cache
        const stale = await getStaleSupabaseCache(cacheKey);
        if (stale !== null) {
          console.warn(`[apiService] Using stale cache for ${cacheKey}`);
          setMemoryCache(cacheKey, stale, 60 * 1000); // Keep stale for 1 min
          return stale as T;
        }
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
