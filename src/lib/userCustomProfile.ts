export interface UserCustomProfile {
  displayName: string;
  bio: string;
  preferredMode: string;
  favoriteMap: string;
  mainWeapon: string;
  playStyle: string;
  accentColor: string;
  bannerImageUrl: string;
  socialLink: string;
}

export interface UserProfileRecord extends UserCustomProfile {
  email: string;
  avatarUrl: string | null;
  provider: string | null;
  loginCount: number;
  lastLoginAt: string | null;
  lastLogoutAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const DEFAULT_PROFILE_BASE: UserCustomProfile = {
  displayName: "",
  bio: "",
  preferredMode: "스쿼드 FPP",
  favoriteMap: "에란겔",
  mainWeapon: "M416",
  playStyle: "밸런스형",
  accentColor: "#f2a900",
  bannerImageUrl: "",
  socialLink: "",
};

export function getDefaultUserCustomProfile(name?: string | null): UserCustomProfile {
  return {
    ...DEFAULT_PROFILE_BASE,
    displayName: name?.trim() || "",
  };
}

function clampText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function normalizeAccentColor(value: unknown): string {
  const text = clampText(value, 16);
  if (!text) return DEFAULT_PROFILE_BASE.accentColor;

  const withHash = text.startsWith("#") ? text : `#${text}`;
  const isHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(withHash);
  return isHex ? withHash : DEFAULT_PROFILE_BASE.accentColor;
}

export function sanitizeUserCustomProfileInput(input: Partial<UserCustomProfile>): UserCustomProfile {
  const fallback = getDefaultUserCustomProfile();

  return {
    displayName: clampText(input.displayName, 32) || fallback.displayName,
    bio: clampText(input.bio, 240),
    preferredMode: clampText(input.preferredMode, 24) || fallback.preferredMode,
    favoriteMap: clampText(input.favoriteMap, 24) || fallback.favoriteMap,
    mainWeapon: clampText(input.mainWeapon, 32) || fallback.mainWeapon,
    playStyle: clampText(input.playStyle, 24) || fallback.playStyle,
    accentColor: normalizeAccentColor(input.accentColor),
    bannerImageUrl: clampText(input.bannerImageUrl, 512),
    socialLink: clampText(input.socialLink, 512),
  };
}
