const CONTROL_CHARS_REGEX = /[\u0000-\u001f\u007f]/g;
const MULTI_SPACE_REGEX = /\s{2,}/g;

const PLAYER_NAME_BLOCKED_CHARS_REGEX = /[<>"'`\\]/;
const ACCOUNT_ID_REGEX = /^[A-Za-z0-9._-]{5,80}$/;
const MATCH_ID_REGEX = /^[A-Za-z0-9._:-]{8,120}$/;
const SEASON_ID_REGEX = /^[A-Za-z0-9._-]{3,80}$/;

function stripControlChars(value: string): string {
  return value.replace(CONTROL_CHARS_REGEX, "");
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(MULTI_SPACE_REGEX, " ");
}

export function sanitizeTextInput(value: string, maxLength = 120): string {
  if (typeof value !== "string") return "";
  const safeMax = Number.isFinite(maxLength) ? Math.max(1, Math.floor(maxLength)) : 120;
  return normalizeWhitespace(stripControlChars(value)).slice(0, safeMax);
}

export function sanitizePlayerSearchInput(value: string): string {
  return sanitizeTextInput(value, 32);
}

export function isValidPlayerSearchInput(value: string): boolean {
  const normalized = sanitizePlayerSearchInput(value);
  if (normalized.length < 2 || normalized.length > 32) return false;
  return !PLAYER_NAME_BLOCKED_CHARS_REGEX.test(normalized);
}

export function sanitizeAccountId(value: string): string | null {
  const normalized = sanitizeTextInput(value, 80);
  if (!normalized) return null;
  return ACCOUNT_ID_REGEX.test(normalized) ? normalized : null;
}

export function sanitizeMatchId(value: string): string | null {
  const normalized = sanitizeTextInput(value, 120);
  if (!normalized) return null;
  return MATCH_ID_REGEX.test(normalized) ? normalized : null;
}

export function sanitizeSeasonId(value: string): string | null {
  const normalized = sanitizeTextInput(value, 80);
  if (!normalized) return null;
  return SEASON_ID_REGEX.test(normalized) ? normalized : null;
}

export function clampInteger(
  value: string | null | undefined,
  options: { min: number; max: number; fallback: number }
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  const base = Number.isFinite(parsed) ? parsed : options.fallback;
  return Math.min(options.max, Math.max(options.min, base));
}

export function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
