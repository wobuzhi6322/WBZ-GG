import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  getDefaultUserCustomProfile,
  sanitizeUserCustomProfileInput,
  type UserCustomProfile,
  type UserProfileRecord,
} from "@/lib/userCustomProfile";

interface UserProfileRow {
  email: string;
  display_name: string | null;
  bio: string | null;
  preferred_mode: string | null;
  favorite_map: string | null;
  main_weapon: string | null;
  play_style: string | null;
  accent_color: string | null;
  banner_image_url: string | null;
  social_link: string | null;
  avatar_url: string | null;
  provider: string | null;
  login_count: number | null;
  last_login_at: string | null;
  last_logout_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

type AuthEventType = "login" | "logout";

function toNullableString(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function mapRowToProfile(row: UserProfileRow): UserProfileRecord {
  const safe = sanitizeUserCustomProfileInput({
    displayName: row.display_name ?? "",
    bio: row.bio ?? "",
    preferredMode: row.preferred_mode ?? "",
    favoriteMap: row.favorite_map ?? "",
    mainWeapon: row.main_weapon ?? "",
    playStyle: row.play_style ?? "",
    accentColor: row.accent_color ?? "",
    bannerImageUrl: row.banner_image_url ?? "",
    socialLink: row.social_link ?? "",
  });

  return {
    ...safe,
    email: row.email,
    avatarUrl: row.avatar_url ?? null,
    provider: row.provider ?? null,
    loginCount: row.login_count ?? 0,
    lastLoginAt: row.last_login_at ?? null,
    lastLogoutAt: row.last_logout_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

async function createAuthEvent(
  email: string,
  eventType: AuthEventType,
  provider: string | null,
  eventMeta: Record<string, unknown> = {}
): Promise<void> {
  const client = getSupabaseAdminClient();
  if (!client) return;

  const { error } = await client.from("auth_events").insert({
    email,
    event_type: eventType,
    provider,
    event_meta: eventMeta,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.warn("Failed to insert auth event:", error.message);
  }
}

export async function trackUserSignIn(params: {
  email: string;
  name: string | null;
  avatarUrl: string | null;
  provider: string | null;
}): Promise<void> {
  const client = getSupabaseAdminClient();
  if (!client) return;

  const email = params.email.trim().toLowerCase();
  if (!email) return;

  const now = new Date().toISOString();

  const { data: existing, error: readError } = await client
    .from("user_profiles")
    .select("login_count, display_name, created_at")
    .eq("email", email)
    .maybeSingle<{ login_count: number | null; display_name: string | null; created_at: string | null }>();

  if (readError) {
    console.warn("Failed to read user_profiles on sign-in:", readError.message);
    return;
  }

  const safeProfile = getDefaultUserCustomProfile(params.name);
  const nextLoginCount = (existing?.login_count ?? 0) + 1;

  const { error: upsertError } = await client.from("user_profiles").upsert(
    {
      email,
      display_name: toNullableString(existing?.display_name ?? safeProfile.displayName),
      bio: null,
      preferred_mode: safeProfile.preferredMode,
      favorite_map: safeProfile.favoriteMap,
      main_weapon: safeProfile.mainWeapon,
      play_style: safeProfile.playStyle,
      accent_color: safeProfile.accentColor,
      banner_image_url: null,
      social_link: null,
      avatar_url: toNullableString(params.avatarUrl),
      provider: toNullableString(params.provider),
      login_count: nextLoginCount,
      last_login_at: now,
      updated_at: now,
      created_at: existing?.created_at ?? now,
    },
    { onConflict: "email" }
  );

  if (upsertError) {
    console.warn("Failed to upsert user_profiles on sign-in:", upsertError.message);
    return;
  }

  await createAuthEvent(email, "login", toNullableString(params.provider), { name: params.name });
}

export async function trackUserSignOut(emailInput: string): Promise<void> {
  const client = getSupabaseAdminClient();
  if (!client) return;

  const email = emailInput.trim().toLowerCase();
  if (!email) return;

  const now = new Date().toISOString();
  const { error } = await client.from("user_profiles").update({ last_logout_at: now, updated_at: now }).eq("email", email);
  if (error) {
    console.warn("Failed to update sign-out timestamp:", error.message);
  }

  await createAuthEvent(email, "logout", null);
}

export async function getUserProfileByEmail(emailInput: string, fallbackName?: string | null): Promise<UserProfileRecord | null> {
  const client = getSupabaseAdminClient();
  if (!client) return null;

  const email = emailInput.trim().toLowerCase();
  if (!email) return null;

  const { data, error } = await client
    .from("user_profiles")
    .select(
      "email, display_name, bio, preferred_mode, favorite_map, main_weapon, play_style, accent_color, banner_image_url, social_link, avatar_url, provider, login_count, last_login_at, last_logout_at, created_at, updated_at"
    )
    .eq("email", email)
    .maybeSingle<UserProfileRow>();

  if (error) {
    console.warn("Failed to fetch user profile:", error.message);
    return null;
  }

  if (!data) {
    const safe = getDefaultUserCustomProfile(fallbackName ?? null);
    return {
      ...safe,
      email,
      avatarUrl: null,
      provider: null,
      loginCount: 0,
      lastLoginAt: null,
      lastLogoutAt: null,
      createdAt: null,
      updatedAt: null,
    };
  }

  return mapRowToProfile(data);
}

export async function updateUserProfileByEmail(
  emailInput: string,
  input: Partial<UserCustomProfile>,
  fallbackName?: string | null
): Promise<UserProfileRecord | null> {
  const client = getSupabaseAdminClient();
  if (!client) return null;

  const email = emailInput.trim().toLowerCase();
  if (!email) return null;

  const current = await getUserProfileByEmail(email, fallbackName);
  if (!current) return null;

  const merged = sanitizeUserCustomProfileInput({
    displayName: input.displayName ?? current.displayName,
    bio: input.bio ?? current.bio,
    preferredMode: input.preferredMode ?? current.preferredMode,
    favoriteMap: input.favoriteMap ?? current.favoriteMap,
    mainWeapon: input.mainWeapon ?? current.mainWeapon,
    playStyle: input.playStyle ?? current.playStyle,
    accentColor: input.accentColor ?? current.accentColor,
    bannerImageUrl: input.bannerImageUrl ?? current.bannerImageUrl,
    socialLink: input.socialLink ?? current.socialLink,
  });

  const now = new Date().toISOString();
  const { error } = await client.from("user_profiles").upsert(
    {
      email,
      display_name: toNullableString(merged.displayName),
      bio: toNullableString(merged.bio),
      preferred_mode: toNullableString(merged.preferredMode),
      favorite_map: toNullableString(merged.favoriteMap),
      main_weapon: toNullableString(merged.mainWeapon),
      play_style: toNullableString(merged.playStyle),
      accent_color: toNullableString(merged.accentColor),
      banner_image_url: toNullableString(merged.bannerImageUrl),
      social_link: toNullableString(merged.socialLink),
      avatar_url: toNullableString(current.avatarUrl),
      provider: toNullableString(current.provider),
      login_count: current.loginCount,
      last_login_at: current.lastLoginAt,
      last_logout_at: current.lastLogoutAt,
      created_at: current.createdAt ?? now,
      updated_at: now,
    },
    { onConflict: "email" }
  );

  if (error) {
    console.warn("Failed to update user profile:", error.message);
    return null;
  }

  return {
    ...merged,
    email,
    avatarUrl: current.avatarUrl,
    provider: current.provider,
    loginCount: current.loginCount,
    lastLoginAt: current.lastLoginAt,
    lastLogoutAt: current.lastLogoutAt,
    createdAt: current.createdAt ?? now,
    updatedAt: now,
  };
}
