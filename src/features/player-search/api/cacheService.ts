import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const PUBG_PLAYER_CACHE_TABLE = "pubg_player_cache";
const PUBG_PLAYER_CACHE_TTL_MS = 30 * 60 * 1000;

interface PubgPlayerCacheRow {
  player_name: string | null;
  account_id: string | null;
  stats_data: unknown;
  updated_at: string | null;
}

export interface PubgPlayerCacheEntry<T = unknown> {
  playerName: string;
  accountId: string;
  statsData: T;
  updatedAt: string | null;
  isFresh: boolean;
}

function normalizePlayerName(playerName: string): string {
  return playerName.trim();
}

function isCacheFresh(updatedAt: string | null): boolean {
  if (!updatedAt) return false;
  const updatedAtMs = Date.parse(updatedAt);
  if (!Number.isFinite(updatedAtMs)) return false;
  return Date.now() - updatedAtMs <= PUBG_PLAYER_CACHE_TTL_MS;
}

export async function getPubgPlayerCache<T = unknown>(
  playerName: string
): Promise<PubgPlayerCacheEntry<T> | null> {
  const safePlayerName = normalizePlayerName(playerName);
  if (!safePlayerName) return null;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(PUBG_PLAYER_CACHE_TABLE)
    .select("player_name, account_id, stats_data, updated_at")
    .eq("player_name", safePlayerName)
    .maybeSingle<PubgPlayerCacheRow>();

  if (error) {
    console.warn(`[pubg-player-cache] read failed for "${safePlayerName}": ${error.message}`);
    return null;
  }

  if (!data) return null;

  const accountId = typeof data.account_id === "string" ? data.account_id.trim() : "";
  if (!accountId) return null;

  const cachedPlayerName =
    typeof data.player_name === "string" && data.player_name.trim().length > 0
      ? data.player_name.trim()
      : safePlayerName;

  return {
    playerName: cachedPlayerName,
    accountId,
    statsData: data.stats_data as T,
    updatedAt: data.updated_at,
    isFresh: isCacheFresh(data.updated_at),
  };
}

export async function upsertPubgPlayerCache<T>({
  playerName,
  accountId,
  statsData,
}: {
  playerName: string;
  accountId: string;
  statsData: T;
}): Promise<void> {
  const safePlayerName = normalizePlayerName(playerName);
  const safeAccountId = accountId.trim();
  if (!safePlayerName || !safeAccountId) return;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const { error } = await supabase.from(PUBG_PLAYER_CACHE_TABLE).upsert(
    {
      player_name: safePlayerName,
      account_id: safeAccountId,
      stats_data: statsData,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "player_name",
    }
  );

  if (error) {
    console.warn(`[pubg-player-cache] upsert failed for "${safePlayerName}": ${error.message}`);
  }
}
