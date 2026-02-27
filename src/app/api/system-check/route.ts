import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/authOptions";
import { MAP_INTEL_MAPS } from "@/data/mapIntelMaps";
import { getLeaderboardSnapshot, getPubgApiKeyStatus, isPubgApiConfigured } from "@/lib/pubg";
import { getPubgWeaponSkins } from "@/lib/pubgWeaponSkins";
import { getPubgWeapons } from "@/lib/pubgWeapons";
import { getPubgPcOfficialUpdates } from "@/lib/pubgUpdates";
import { getApiCacheStatus, pingApiCache } from "@/lib/apiCache";
import { getSupabaseAdminStatus, pingSupabaseConnection, pingSupabaseTable } from "@/lib/supabaseAdmin";
import { getSteamApiKeyStatus } from "@/lib/steam";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ModuleStatus = "ok" | "warn" | "error";

interface ModuleCheck {
  key: string;
  name: string;
  status: ModuleStatus;
  message: string;
  latencyMs: number;
  meta?: Record<string, unknown>;
}

interface CheckResult {
  status: ModuleStatus;
  message: string;
  meta?: Record<string, unknown>;
}

function statusWeight(status: ModuleStatus): number {
  if (status === "ok") return 100;
  if (status === "warn") return 65;
  return 30;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Unknown error";
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  try {
    return (await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timeout (${timeoutMs}ms)`)), timeoutMs);
      }),
    ])) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function runModuleCheck(
  key: string,
  name: string,
  task: () => Promise<CheckResult>
): Promise<ModuleCheck> {
  const startedAt = Date.now();
  try {
    const result = await task();
    return {
      key,
      name,
      status: result.status,
      message: result.message,
      latencyMs: Date.now() - startedAt,
      meta: result.meta,
    };
  } catch (error) {
    return {
      key,
      name,
      status: "error",
      message: toErrorMessage(error),
      latencyMs: Date.now() - startedAt,
    };
  }
}

function buildNextActions(modules: ModuleCheck[]): string[] {
  const actions: string[] = [];

  const pubgKey = modules.find((module) => module.key === "pubg_api_key");
  if (pubgKey?.status !== "ok") {
    actions.push("PUBG_API_KEY(steam)와 PUBG_API_KEY_KAKAO(kakao)를 .env.local에 설정하고 서버를 재시작하세요.");
  }

  const steamKey = modules.find((module) => module.key === "steam_api_key");
  if (steamKey?.status !== "ok") {
    actions.push("Steam 프로필 아이콘 동기화가 필요하면 STEAM_API_KEY를 .env.local에 설정하세요.");
  }

  const cache = modules.find((module) => module.key === "server_cache");
  if (cache?.status !== "ok") {
    actions.push("서버 캐시 상태를 확인하고 필요한 경우 TTL 값을 조정하세요.");
  }

  const supabase = modules.find((module) => module.key === "supabase_auth_store");
  if (supabase?.status !== "ok") {
    actions.push("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인하고 user_profiles/auth_events 테이블을 생성하세요.");
  }

  const leaderboard = modules.find((module) => module.key === "leaderboard");
  if (leaderboard?.status !== "ok") {
    actions.push("리더보드 API는 429/빈 응답이 발생할 수 있으므로 캐시 TTL을 유지하고 fallback을 점검하세요.");
  }

  const updates = modules.find((module) => module.key === "updates_feed");
  if (updates?.status !== "ok") {
    actions.push("업데이트 피드 파서 실패 시 fallback 소스 노출 여부를 확인하세요.");
  }

  const weapons = modules.find((module) => module.key === "weapons_feed");
  if (weapons?.status !== "ok") {
    actions.push("무기 데이터 수집 실패 시 백업 데이터/캐시를 점검하세요.");
  }

  const skins = modules.find((module) => module.key === "weapon_skins_feed");
  if (skins?.status !== "ok") {
    actions.push("스킨 수집 소스 변경에 대비해 파서와 캐시를 점검하세요.");
  }

  if (actions.length === 0) {
    actions.push("핵심 모듈 상태가 정상입니다. 스케줄 캐시 갱신만 유지하면 됩니다.");
  }

  return actions;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checks = await Promise.all([
    runModuleCheck("pubg_api_key", "PUBG API Key", async () => {
      const { configured } = getPubgApiKeyStatus();
      return configured
        ? { status: "ok", message: "API key configured." }
        : { status: "warn", message: "PUBG API key is missing. (PUBG_API_KEY or PUBG_API_KEY_KAKAO)" };
    }),

    runModuleCheck("steam_api_key", "Steam API Key", async () => {
      const { configured } = getSteamApiKeyStatus();
      return configured
        ? { status: "ok", message: "API key configured." }
        : { status: "warn", message: "STEAM_API_KEY is missing. Steam avatar sync is disabled." };
    }),

    runModuleCheck("server_cache", "Server Cache", async () => {
      const status = getApiCacheStatus();
      const ping = await withTimeout(pingApiCache(), 3000, "Server cache check");
      return ping.ok
        ? {
            status: "ok",
            message: ping.message,
            meta: {
              strategy: status.strategy,
              entries: status.entries,
              defaultTtlSeconds: status.defaultTtlSeconds,
            },
          }
        : {
            status: "warn",
            message: ping.message,
          };
    }),

    runModuleCheck("supabase_auth_store", "Supabase Auth Store", async () => {
      const status = getSupabaseAdminStatus();
      if (!status.configured) {
        return {
          status: "warn",
          message: "Supabase env is not configured.",
          meta: {
            hasUrl: status.hasUrl,
            hasServiceRoleKey: status.hasServiceRoleKey,
          },
        };
      }

      const ping = await withTimeout(pingSupabaseConnection(), 8000, "Supabase connection check");
      const [profiles, events] = await Promise.all([
        withTimeout(pingSupabaseTable("user_profiles"), 8000, "Supabase table check: user_profiles"),
        withTimeout(pingSupabaseTable("auth_events"), 8000, "Supabase table check: auth_events"),
      ]);

      if (!ping.ok || !profiles.ok || !events.ok) {
        return {
          status: "warn",
          message: ping.ok ? "Supabase connected but required tables are not ready." : ping.message,
          meta: {
            user_profiles: profiles.message,
            auth_events: events.message,
          },
        };
      }

      return {
        status: "ok",
        message: "Supabase auth tables are reachable.",
      };
    }),

    runModuleCheck("leaderboard", "Official Leaderboard", async () => {
      if (!isPubgApiConfigured()) {
        return {
          status: "warn",
          message: "Skipped: PUBG API key missing.",
        };
      }

      const snapshot = await withTimeout(getLeaderboardSnapshot("squad-fpp", 20), 10000, "Leaderboard check");
      if (snapshot.entries.length > 0) {
        return {
          status: "ok",
          message: `Live entries: ${snapshot.entries.length}`,
          meta: {
            sourceShard: snapshot.sourceShard,
            seasonId: snapshot.seasonId,
          },
        };
      }

      return {
        status: "warn",
        message: snapshot.warning ?? "No leaderboard entries returned.",
      };
    }),

    runModuleCheck("updates_feed", "Official Updates Feed", async () => {
      const updates = await withTimeout(getPubgPcOfficialUpdates(2, "ko"), 10000, "Updates feed check");
      if (updates.length > 0) {
        return {
          status: "ok",
          message: `Fetched ${updates.length} update posts.`,
        };
      }
      return { status: "warn", message: "No update posts fetched." };
    }),

    runModuleCheck("weapons_feed", "Weapons Feed", async () => {
      const payload = await withTimeout(getPubgWeapons("ko"), 12000, "Weapons feed check");
      const weaponCount = payload.categories.reduce((sum, category) => sum + category.weapons.length, 0);
      if (weaponCount > 0) {
        return {
          status: "ok",
          message: `Fetched ${weaponCount} weapons.`,
          meta: {
            categories: payload.categories.length,
          },
        };
      }
      return { status: "warn", message: "Weapon payload is empty." };
    }),

    runModuleCheck("weapon_skins_feed", "Weapon Skins Feed", async () => {
      const payload = await withTimeout(getPubgWeaponSkins("ko"), 12000, "Weapon skin feed check");
      if (payload.items.length > 0) {
        return {
          status: "ok",
          message: `Fetched ${payload.items.length} skins.`,
          meta: {
            categories: payload.categories.length,
          },
        };
      }
      return { status: "warn", message: "Weapon skin payload is empty." };
    }),

    runModuleCheck("map_dataset", "Map Intel Dataset", async () => {
      const mapCount = MAP_INTEL_MAPS.length;
      if (mapCount >= 5) {
        return {
          status: "ok",
          message: `Map definitions: ${mapCount}`,
        };
      }
      return {
        status: "warn",
        message: `Map definitions too low: ${mapCount}`,
      };
    }),
  ]);

  const summary = checks.reduce(
    (acc, module) => {
      if (module.status === "ok") acc.ok += 1;
      if (module.status === "warn") acc.warn += 1;
      if (module.status === "error") acc.error += 1;
      return acc;
    },
    { ok: 0, warn: 0, error: 0 }
  );

  const healthScore = Math.round(
    checks.reduce((sum, module) => sum + statusWeight(module.status), 0) / checks.length
  );

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    healthScore,
    summary,
    modules: checks,
    nextActions: buildNextActions(checks),
  });
}


