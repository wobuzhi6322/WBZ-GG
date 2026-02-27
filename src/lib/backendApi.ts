import type {
  BackendLeaderboardResponse,
  BackendPlayerCreate,
  BackendPlayerRead,
  BackendRegion,
} from "@/types/backend";

const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://127.0.0.1:8000/api/v1";

async function backendFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BACKEND_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backend API failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as T;
}

export function getBackendPlayers(limit = 100, offset = 0): Promise<BackendPlayerRead[]> {
  return backendFetch<BackendPlayerRead[]>(`/players?limit=${limit}&offset=${offset}`);
}

export function createBackendPlayer(payload: BackendPlayerCreate): Promise<BackendPlayerRead> {
  return backendFetch<BackendPlayerRead>("/players", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getBackendLeaderboard(region: BackendRegion = "pc-as", limit = 50): Promise<BackendLeaderboardResponse> {
  return backendFetch<BackendLeaderboardResponse>(`/players/leaderboard/current?region=${region}&limit=${limit}`);
}

