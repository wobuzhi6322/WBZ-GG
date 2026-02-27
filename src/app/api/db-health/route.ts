import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/authOptions";
import { getApiCacheStatus, pingApiCache } from "@/lib/apiCache";
import { getSupabaseAdminStatus, pingSupabaseConnection, pingSupabaseTable } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return unauthorized();

  const cacheStatus = getApiCacheStatus();
  const cachePing = await pingApiCache();

  const supabaseStatus = getSupabaseAdminStatus();
  const supabasePing = await pingSupabaseConnection();
  const [userProfiles, authEvents, playerCache, leaderboardCache] = await Promise.all([
    pingSupabaseTable("user_profiles"),
    pingSupabaseTable("auth_events"),
    pingSupabaseTable("pubg_player_cache"),
    pingSupabaseTable("pubg_leaderboard_cache"),
  ]);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    cache: {
      ...cacheStatus,
      connected: cachePing.ok,
      message: cachePing.message,
    },
    supabase: {
      ...supabaseStatus,
      connected: supabasePing.ok,
      message: supabasePing.message,
      tables: {
        user_profiles: userProfiles,
        auth_events: authEvents,
        pubg_player_cache: playerCache,
        pubg_leaderboard_cache: leaderboardCache,
      },
    },
  });
}
