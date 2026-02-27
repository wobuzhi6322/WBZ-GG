export type BackendRegion = "pc-as" | "pc-sea" | "pc-kakao" | "pc-na" | "pc-eu" | "pc-oc" | "pc-sa";
export type BackendPlatform = "steam" | "kakao";
export type BackendPerspective = "tpp" | "fpp";
export type BackendRankedMode = "solo" | "duo" | "squad";

export interface BackendPlayerRead {
  id: number;
  username: string;
  platform: BackendPlatform;
  region: BackendRegion;
  perspective: BackendPerspective;
  ranked_mode: BackendRankedMode;
  rank_points: number;
  wins: number;
  kills: number;
  games: number;
  win_rate: number;
  created_at: string;
  updated_at: string;
}

export interface BackendPlayerCreate {
  username: string;
  platform?: BackendPlatform;
  region?: BackendRegion;
  perspective?: BackendPerspective;
  ranked_mode?: BackendRankedMode;
  rank_points?: number;
  wins?: number;
  kills?: number;
  games?: number;
}

export interface BackendLeaderboardEntry {
  rank: number;
  username: string;
  rank_points: number;
  kills: number;
  wins: number;
  games: number;
  win_rate: number;
}

export interface BackendRegionalHighlight {
  region: BackendRegion;
  top_win_rate: BackendLeaderboardEntry | null;
  top_kills: BackendLeaderboardEntry | null;
}

export interface BackendLeaderboardResponse {
  region: BackendRegion;
  entries: BackendLeaderboardEntry[];
  highlights: BackendRegionalHighlight[];
}

