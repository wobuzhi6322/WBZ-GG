const DEFAULT_ADMIN_EMAILS = ["wobuzhi@gmail.com"];

function normalizeEmailList(value: string | undefined | null): string[] {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function getConfiguredAdminEmails(): string[] {
  const configured =
    process.env.ADMIN_EMAILS ??
    process.env.NEXTAUTH_ADMIN_EMAILS ??
    process.env.NEXT_PUBLIC_ADMIN_EMAILS;

  const emails = normalizeEmailList(configured);
  return emails.length > 0 ? emails : DEFAULT_ADMIN_EMAILS;
}

export function getPublicAdminEmails(): string[] {
  const emails = normalizeEmailList(process.env.NEXT_PUBLIC_ADMIN_EMAILS);
  return emails.length > 0 ? emails : DEFAULT_ADMIN_EMAILS;
}

export function isAdminEmail(
  email: string | null | undefined,
  adminEmails: readonly string[] = DEFAULT_ADMIN_EMAILS,
): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return adminEmails.includes(normalized);
}
