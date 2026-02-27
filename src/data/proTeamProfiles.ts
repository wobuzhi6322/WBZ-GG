export interface ProTeamProfile {
  tag: string;
  displayName: string;
  primaryColor: string;
  secondaryColor: string;
  iconUrl: string;
  region: ProTeamRegion;
}

export type ProTeamRegion = "korea" | "china" | "sea" | "other";

export const PRO_TEAM_REGION_LABELS: Record<ProTeamRegion, string> = {
  korea: "한국",
  china: "중국",
  sea: "동남아",
  other: "기타",
};

const TEAM_NAME_MAP: Record<string, string> = {
  "17": "17 Gaming",
  "4AM": "Four Angry Men",
  AL: "All Gamers",
  BAF: "BAF Esports",
  BABY: "BABY Esports",
  BFE: "BFE Team",
  DNF: "DN FREECS",
  DK: "Dplus KIA",
  EA: "EArena",
  FDT: "FDT Esports",
  FL: "Four Lucky",
  FS: "Freecs Squad",
  GENG: "Gen.G",
  GNL: "GNL Esports",
  GDMR: "GDMR",
  HIHI: "HiHi Esports",
  KDF: "KWANGDONG FREECS",
  MITH: "MiTH",
  NH: "NewHappy",
  PERO: "Petrichor Road",
  T1: "T1",
  TE: "The Expendables",
  TIAN: "Tianba",
  TYL: "TYLOO",
  UNC: "UNC Esports",
  WHY: "WhY Esports",
};

const TEAM_COLOR_MAP: Record<string, { primary: string; secondary: string }> = {
  "17": { primary: "#ef4444", secondary: "#7f1d1d" },
  "4AM": { primary: "#f43f5e", secondary: "#7e1d3a" },
  AL: { primary: "#22d3ee", secondary: "#0e7490" },
  BAF: { primary: "#f59e0b", secondary: "#92400e" },
  BABY: { primary: "#fb7185", secondary: "#7f1d1d" },
  BFE: { primary: "#34d399", secondary: "#065f46" },
  DNF: { primary: "#f97316", secondary: "#9a3412" },
  DK: { primary: "#6366f1", secondary: "#312e81" },
  EA: { primary: "#10b981", secondary: "#064e3b" },
  FDT: { primary: "#60a5fa", secondary: "#1e3a8a" },
  FL: { primary: "#a78bfa", secondary: "#4c1d95" },
  FS: { primary: "#2dd4bf", secondary: "#134e4a" },
  GENG: { primary: "#facc15", secondary: "#78350f" },
  GNL: { primary: "#38bdf8", secondary: "#0c4a6e" },
  GDMR: { primary: "#f472b6", secondary: "#831843" },
  HIHI: { primary: "#22c55e", secondary: "#14532d" },
  KDF: { primary: "#14b8a6", secondary: "#115e59" },
  MITH: { primary: "#8b5cf6", secondary: "#4c1d95" },
  NH: { primary: "#f87171", secondary: "#7f1d1d" },
  PERO: { primary: "#eab308", secondary: "#713f12" },
  T1: { primary: "#ef4444", secondary: "#7f1d1d" },
  TE: { primary: "#f97316", secondary: "#7c2d12" },
  TIAN: { primary: "#06b6d4", secondary: "#164e63" },
  TYL: { primary: "#fb7185", secondary: "#881337" },
  UNC: { primary: "#60a5fa", secondary: "#1e3a8a" },
  WHY: { primary: "#22d3ee", secondary: "#164e63" },
};

const TEAM_REGION_MAP: Record<string, ProTeamRegion> = {
  DNF: "korea",
  DK: "korea",
  KDF: "korea",
  GENG: "korea",
  T1: "korea",

  "17": "china",
  "4AM": "china",
  AL: "china",
  NH: "china",
  PERO: "china",
  TIAN: "china",
  TYL: "china",

  TE: "sea",
  MITH: "sea",
  EA: "sea",
  FDT: "sea",
  BAF: "sea",
  BABY: "sea",
  BFE: "sea",
  FS: "sea",
  WHY: "sea",
  HIHI: "sea",
  UNC: "sea",
  FL: "sea",
  GDMR: "sea",
};

function normalizeTag(rawTag: string): string {
  return rawTag.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function createTeamIconDataUri(tag: string, primary: string, secondary: string): string {
  const safeTag = tag.slice(0, 4);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primary}" />
      <stop offset="100%" stop-color="${secondary}" />
    </linearGradient>
  </defs>
  <rect x="6" y="6" width="108" height="108" rx="28" fill="url(#g)" />
  <rect x="12" y="12" width="96" height="96" rx="24" fill="none" stroke="rgba(255,255,255,0.24)" stroke-width="2" />
  <text x="60" y="70" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="white">${safeTag}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getProTeamProfile(tagInput: string): ProTeamProfile {
  const normalized = normalizeTag(tagInput || "TEAM");
  const fallbackTag = normalized.length > 0 ? normalized : "TEAM";
  const displayName = TEAM_NAME_MAP[fallbackTag] ?? fallbackTag;
  const palette = TEAM_COLOR_MAP[fallbackTag] ?? { primary: "#22d3ee", secondary: "#0f172a" };
  const iconUrl = createTeamIconDataUri(fallbackTag, palette.primary, palette.secondary);
  const region = TEAM_REGION_MAP[fallbackTag] ?? "other";

  return {
    tag: fallbackTag,
    displayName,
    primaryColor: palette.primary,
    secondaryColor: palette.secondary,
    iconUrl,
    region,
  };
}

