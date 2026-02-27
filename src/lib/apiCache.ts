type CacheRecord<T> = {
  payload: T;
  expiresAtMs: number;
  tags: string[];
  updatedAt: string;
};

const RAW_DEFAULT_CACHE_TTL = Number.parseInt(process.env.CACHE_TTL_SECONDS ?? "300", 10);
const DEFAULT_CACHE_TTL_SECONDS = Number.isFinite(RAW_DEFAULT_CACHE_TTL)
  ? Math.max(30, Math.min(RAW_DEFAULT_CACHE_TTL, 86400))
  : 300;

const inMemoryCache = new Map<string, CacheRecord<unknown>>();

function sanitizeCacheKey(value: string): string {
  return value.trim().slice(0, 512);
}

function clampTtl(ttlSeconds: number | undefined): number {
  if (typeof ttlSeconds !== "number" || !Number.isFinite(ttlSeconds)) {
    return DEFAULT_CACHE_TTL_SECONDS;
  }
  return Math.max(30, Math.min(Math.round(ttlSeconds), 86400));
}

function cleanupExpiredEntries(): void {
  const now = Date.now();
  inMemoryCache.forEach((record, key) => {
    if (record.expiresAtMs <= now) {
      inMemoryCache.delete(key);
    }
  });
}

export function getApiCacheStatus(): {
  configured: boolean;
  strategy: "memory";
  entries: number;
  defaultTtlSeconds: number;
} {
  cleanupExpiredEntries();
  return {
    configured: true,
    strategy: "memory",
    entries: inMemoryCache.size,
    defaultTtlSeconds: DEFAULT_CACHE_TTL_SECONDS,
  };
}

export async function getApiCache<T>(cacheKey: string): Promise<T | null> {
  cleanupExpiredEntries();
  const safeKey = sanitizeCacheKey(cacheKey);
  if (!safeKey) return null;

  const record = inMemoryCache.get(safeKey);
  if (!record) return null;

  if (record.expiresAtMs <= Date.now()) {
    inMemoryCache.delete(safeKey);
    return null;
  }

  return (record.payload as T) ?? null;
}

export async function setApiCache<T>(
  cacheKey: string,
  payload: T,
  ttlSeconds?: number,
  tags: string[] = []
): Promise<void> {
  const safeKey = sanitizeCacheKey(cacheKey);
  if (!safeKey) return;

  const safeTtl = clampTtl(ttlSeconds);
  const safeTags = tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0).slice(0, 10);

  inMemoryCache.set(safeKey, {
    payload,
    expiresAtMs: Date.now() + safeTtl * 1000,
    tags: safeTags,
    updatedAt: new Date().toISOString(),
  });
}

export async function pingApiCache(): Promise<{ ok: boolean; message: string }> {
  cleanupExpiredEntries();
  return { ok: true, message: "In-memory cache is available." };
}
