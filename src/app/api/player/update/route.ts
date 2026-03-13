import { NextRequest, NextResponse } from "next/server";
import {
  getMatches,
  getPlayer,
  getPlayerStats,
  getPlayerWeaponMasteryProfile,
  getRankedStats,
  getSeasonOptions,
  isPubgApiConfigured,
  isPubgApiKeyMissingError,
  isPubgApiQuotaExceededError,
  sanitizePlatformShard,
} from "@/lib/pubg";
import type {
  CurrentSeasonInfo,
  PlayerData,
  PubgPlatformShard,
  PubgStats,
  RankedStats,
  SeasonOption,
  WeaponMasteryProfile,
} from "@/lib/pubg";
import { getSteamProfile } from "@/lib/steam";
import {
  isValidPlayerSearchInput,
  sanitizePlayerSearchInput,
} from "@/lib/requestValidation";
import { upsertPubgPlayerCacheWithResult } from "@/features/player-search/api/cacheService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface CachedProfileSnapshot {
  version: 1;
  platform: PubgPlatformShard;
  player: PlayerData;
  matches: Awaited<ReturnType<typeof getMatches>>;
  mainWeapon: string | null;
  weaponMasteryProfile: WeaponMasteryProfile | null;
  playerStats: PubgStats | null;
  rankedStats: RankedStats | null;
  seasonOptions: SeasonOption[];
  currentSeason: CurrentSeasonInfo | null;
  seasonId: string | null;
  steamProfile: Awaited<ReturnType<typeof getSteamProfile>>;
  fetchedAt: string;
}

function buildCurrentSeason(seasonOptions: SeasonOption[]): CurrentSeasonInfo | null {
  const season = seasonOptions.find((item) => item.isCurrent) ?? seasonOptions[0] ?? null;
  if (!season) return null;

  return {
    seasonId: season.seasonId,
    seasonNumber: season.seasonNumber,
    label: season.label,
  };
}

function buildCachedProfileSnapshot(params: {
  platform: PubgPlatformShard;
  player: PlayerData;
  matches: Awaited<ReturnType<typeof getMatches>>;
  mainWeapon: string | null;
  weaponMasteryProfile: WeaponMasteryProfile | null;
  playerStats: PubgStats | null;
  rankedStats: RankedStats | null;
  seasonOptions: SeasonOption[];
  currentSeason: CurrentSeasonInfo | null;
  seasonId: string | null;
  steamProfile: Awaited<ReturnType<typeof getSteamProfile>>;
}): CachedProfileSnapshot {
  return {
    version: 1,
    platform: params.platform,
    player: params.player,
    matches: params.matches,
    mainWeapon: params.mainWeapon,
    weaponMasteryProfile: params.weaponMasteryProfile,
    playerStats: params.playerStats,
    rankedStats: params.rankedStats,
    seasonOptions: params.seasonOptions,
    currentSeason: params.currentSeason,
    seasonId: params.seasonId,
    steamProfile: params.steamProfile,
    fetchedAt: new Date().toISOString(),
  };
}

async function handleUpdate(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawUsername = searchParams.get("username") ?? "";
  const username = sanitizePlayerSearchInput(rawUsername);
  const platform = sanitizePlatformShard(searchParams.get("platform"));

  if (!rawUsername.trim().length || !username || !isValidPlayerSearchInput(rawUsername)) {
    return NextResponse.json({ error: "Invalid username format" }, { status: 400 });
  }

  if (!isPubgApiConfigured(platform)) {
    return NextResponse.json({ error: "API Key Missing" }, { status: 500 });
  }

  try {
    const player = await getPlayer(username, platform, true);
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const seasonOptions = await getSeasonOptions(platform, true);
    const currentSeason = buildCurrentSeason(seasonOptions);
    const seasonId = currentSeason?.seasonId ?? null;

    const [matches, playerStats, rankedStats, weaponMasteryProfile, steamProfile] = await Promise.all([
      getMatches(player.id, player.matchIds, 50, "all", platform, true, seasonId ?? undefined),
      getPlayerStats(player.id, platform, true, seasonId ?? undefined),
      getRankedStats(player.id, platform, true, seasonId ?? undefined),
      getPlayerWeaponMasteryProfile(player.id, platform, true),
      platform === "steam" ? getSteamProfile(player.name) : Promise.resolve(null),
    ]);

    const upsertResult = await upsertPubgPlayerCacheWithResult({
      playerName: player.name,
      accountId: player.id,
      statsData: buildCachedProfileSnapshot({
        platform,
        player,
        matches,
        mainWeapon: weaponMasteryProfile?.mainWeapon ?? null,
        weaponMasteryProfile,
        playerStats,
        rankedStats,
        seasonOptions,
        currentSeason,
        seasonId,
        steamProfile,
      }),
    });

    if (!upsertResult.ok) {
      console.error("DB 저장 실패:", upsertResult.error);
      return NextResponse.json({ error: "DB save failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      playerId: player.id,
      username: player.name,
      platform,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (isPubgApiQuotaExceededError(error)) {
      return NextResponse.json({ error: "API 할당량 오류" }, { status: 429 });
    }
    if (isPubgApiKeyMissingError(error)) {
      return NextResponse.json({ error: "API Key Missing" }, { status: 500 });
    }

    console.error("Player update API failed:", error);
    return NextResponse.json({ error: "갱신 실패" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  return handleUpdate(request);
}

export async function GET(request: NextRequest) {
  return handleUpdate(request);
}
