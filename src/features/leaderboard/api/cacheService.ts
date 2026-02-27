import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const PUBG_LEADERBOARD_CACHE_TABLE = "pubg_leaderboard_cache";
const PUBG_LEADERBOARD_CACHE_TTL_MS = 60 * 60 * 1000;

interface PubgLeaderboardCacheRow {
  cache_key: string | null;
  payload: unknown;
  updated_at: string | null;
}

export interface PubgLeaderboardCacheEntry<T = unknown> {
  cacheKey: string;
  payload: T;
  updatedAt: string | null;
  isFresh: boolean;
}

function normalizeCacheKey(cacheKey: string): string {
  return cacheKey.trim().slice(0, 512);
}

function isCacheFresh(updatedAt: string | null): boolean {
  if (!updatedAt) return false;
  const updatedAtMs = Date.parse(updatedAt);
  if (!Number.isFinite(updatedAtMs)) return false;
  return Date.now() - updatedAtMs <= PUBG_LEADERBOARD_CACHE_TTL_MS;
}

export async function getPubgLeaderboardCache<T = unknown>(
  cacheKey: string
): Promise<PubgLeaderboardCacheEntry<T> | null> {
  const safeCacheKey = normalizeCacheKey(cacheKey);
  if (!safeCacheKey) return null;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(PUBG_LEADERBOARD_CACHE_TABLE)
    .select("cache_key, payload, updated_at")
    .eq("cache_key", safeCacheKey)
    .maybeSingle<PubgLeaderboardCacheRow>();

  if (error) {
    console.warn(`[pubg-leaderboard-cache] read failed for "${safeCacheKey}": ${error.message}`);
    return null;
  }

  if (!data) return null;

  return {
    cacheKey:
      typeof data.cache_key === "string" && data.cache_key.trim().length > 0
        ? data.cache_key.trim()
        : safeCacheKey,
    payload: data.payload as T,
    updatedAt: data.updated_at,
    isFresh: isCacheFresh(data.updated_at),
  };
}

export async function upsertPubgLeaderboardCache<T>({
  cacheKey,
  payload,
}: {
  cacheKey: string;
  payload: T;
}): Promise<void> {
  const safeCacheKey = normalizeCacheKey(cacheKey);
  if (!safeCacheKey) return;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const { error } = await supabase.from(PUBG_LEADERBOARD_CACHE_TABLE).upsert(
    {
      cache_key: safeCacheKey,
      payload,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "cache_key",
    }
  );

  if (error) {
    console.warn(`[pubg-leaderboard-cache] upsert failed for "${safeCacheKey}": ${error.message}`);
  }
}

