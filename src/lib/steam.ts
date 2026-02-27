const STEAM_API_KEY = process.env.STEAM_API_KEY;
const STEAM_API_BASE = "https://api.steampowered.com";
const STEAM_PROFILE_CACHE_TTL_MS = 1000 * 60 * 10;

interface ResolveVanityResponse {
  response?: {
    success?: number;
    steamid?: string;
  };
}

interface PlayerSummary {
  steamid?: string;
  personaname?: string;
  profileurl?: string;
  avatarfull?: string;
  avatarmedium?: string;
  avatar?: string;
}

interface PlayerSummariesResponse {
  response?: {
    players?: PlayerSummary[];
  };
}

export interface SteamProfile {
  steamId: string;
  personaName: string;
  profileUrl: string;
  avatarUrl: string | null;
}

const steamProfileCache = new Map<string, { expiresAt: number; value: SteamProfile | null }>();
const steamProfilePending = new Map<string, Promise<SteamProfile | null>>();

export function isSteamApiConfigured(): boolean {
  return Boolean(STEAM_API_KEY);
}

export function getSteamApiKeyStatus(): { configured: boolean } {
  return {
    configured: isSteamApiConfigured(),
  };
}

function isSteamId64(value: string): boolean {
  return /^[0-9]{17}$/.test(value);
}

async function fetchSteamJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    console.error("Failed to call Steam API:", error);
    return null;
  }
}

async function resolveSteamId(identifier: string): Promise<string | null> {
  if (!STEAM_API_KEY) return null;
  if (isSteamId64(identifier)) return identifier;

  const response = await fetchSteamJson<ResolveVanityResponse>(
    `${STEAM_API_BASE}/ISteamUser/ResolveVanityURL/v0001/?key=${encodeURIComponent(
      STEAM_API_KEY
    )}&vanityurl=${encodeURIComponent(identifier)}`
  );

  const success = response?.response?.success;
  const steamId = response?.response?.steamid;
  if (success === 1 && typeof steamId === "string" && steamId.length > 0) return steamId;
  return null;
}

async function fetchSteamProfileById(steamId: string): Promise<SteamProfile | null> {
  if (!STEAM_API_KEY) return null;

  const response = await fetchSteamJson<PlayerSummariesResponse>(
    `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v0002/?key=${encodeURIComponent(
      STEAM_API_KEY
    )}&steamids=${encodeURIComponent(steamId)}`
  );

  const player = response?.response?.players?.[0];
  if (!player?.steamid) return null;

  return {
    steamId: player.steamid,
    personaName: player.personaname?.trim() || player.steamid,
    profileUrl: player.profileurl?.trim() || `https://steamcommunity.com/profiles/${player.steamid}`,
    avatarUrl: player.avatarfull ?? player.avatarmedium ?? player.avatar ?? null,
  };
}

async function buildSteamProfile(identifier: string): Promise<SteamProfile | null> {
  if (!STEAM_API_KEY) return null;
  const safeIdentifier = identifier.trim();
  if (!safeIdentifier) return null;

  const steamId = await resolveSteamId(safeIdentifier);
  if (!steamId) return null;

  return fetchSteamProfileById(steamId);
}

export async function getSteamProfile(identifier: string): Promise<SteamProfile | null> {
  const safeIdentifier = identifier.trim().toLowerCase();
  if (!safeIdentifier) return null;

  const cached = steamProfileCache.get(safeIdentifier);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const pending = steamProfilePending.get(safeIdentifier);
  if (pending) return pending;

  const promise = buildSteamProfile(identifier)
    .then((result) => {
      steamProfileCache.set(safeIdentifier, {
        expiresAt: Date.now() + STEAM_PROFILE_CACHE_TTL_MS,
        value: result,
      });
      return result;
    })
    .finally(() => {
      steamProfilePending.delete(safeIdentifier);
    });

  steamProfilePending.set(safeIdentifier, promise);
  return promise;
}
