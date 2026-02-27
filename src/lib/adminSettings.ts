export interface AdminSettings {
  maintenanceMode: boolean;
  hideCommunity: boolean;
  disableGacha: boolean;
  showDebugOverlay: boolean;
  siteNotice: string;
  leaderboardRefreshSeconds: number;
  updatesRefreshSeconds: number;
  mapIntelRefreshSeconds: number;
}

interface AdminSettingsStore {
  settings: AdminSettings;
  updatedAt: string;
}

const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  maintenanceMode: false,
  hideCommunity: false,
  disableGacha: false,
  showDebugOverlay: false,
  siteNotice: "",
  leaderboardRefreshSeconds: 120,
  updatesRefreshSeconds: 180,
  mapIntelRefreshSeconds: 300,
};

const GLOBAL_KEY = "__WBZ_ADMIN_SETTINGS_STORE__";

function clampSeconds(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(30, Math.min(Math.round(value), 3600));
}

function clampNotice(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 200);
}

function sanitizePatch(patch: Partial<AdminSettings>): Partial<AdminSettings> {
  return {
    maintenanceMode: typeof patch.maintenanceMode === "boolean" ? patch.maintenanceMode : undefined,
    hideCommunity: typeof patch.hideCommunity === "boolean" ? patch.hideCommunity : undefined,
    disableGacha: typeof patch.disableGacha === "boolean" ? patch.disableGacha : undefined,
    showDebugOverlay: typeof patch.showDebugOverlay === "boolean" ? patch.showDebugOverlay : undefined,
    siteNotice: patch.siteNotice === undefined ? undefined : clampNotice(patch.siteNotice),
    leaderboardRefreshSeconds:
      patch.leaderboardRefreshSeconds === undefined
        ? undefined
        : clampSeconds(patch.leaderboardRefreshSeconds, DEFAULT_ADMIN_SETTINGS.leaderboardRefreshSeconds),
    updatesRefreshSeconds:
      patch.updatesRefreshSeconds === undefined
        ? undefined
        : clampSeconds(patch.updatesRefreshSeconds, DEFAULT_ADMIN_SETTINGS.updatesRefreshSeconds),
    mapIntelRefreshSeconds:
      patch.mapIntelRefreshSeconds === undefined
        ? undefined
        : clampSeconds(patch.mapIntelRefreshSeconds, DEFAULT_ADMIN_SETTINGS.mapIntelRefreshSeconds),
  };
}

function getGlobalStore(): AdminSettingsStore {
  const runtimeGlobal = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: AdminSettingsStore;
  };

  if (!runtimeGlobal[GLOBAL_KEY]) {
    runtimeGlobal[GLOBAL_KEY] = {
      settings: { ...DEFAULT_ADMIN_SETTINGS },
      updatedAt: new Date().toISOString(),
    };
  }

  return runtimeGlobal[GLOBAL_KEY] as AdminSettingsStore;
}

export function getDefaultAdminSettings(): AdminSettings {
  return { ...DEFAULT_ADMIN_SETTINGS };
}

export function getAdminSettings(): AdminSettingsStore {
  const store = getGlobalStore();
  return {
    settings: { ...store.settings },
    updatedAt: store.updatedAt,
  };
}

export function updateAdminSettings(patch: Partial<AdminSettings>): AdminSettingsStore {
  const store = getGlobalStore();
  const safePatch = sanitizePatch(patch);

  store.settings = {
    ...store.settings,
    ...Object.fromEntries(Object.entries(safePatch).filter(([, value]) => value !== undefined)),
  };
  store.updatedAt = new Date().toISOString();

  return {
    settings: { ...store.settings },
    updatedAt: store.updatedAt,
  };
}
