import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_DISABLED = (process.env.SUPABASE_DISABLED ?? "").toLowerCase() === "true";

let clientInstance: SupabaseClient | null = null;

export function getSupabaseAdminStatus(): {
  configured: boolean;
  disabled: boolean;
  hasUrl: boolean;
  hasServiceRoleKey: boolean;
} {
  return {
    configured: Boolean(!SUPABASE_DISABLED && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY),
    disabled: SUPABASE_DISABLED,
    hasUrl: Boolean(SUPABASE_URL),
    hasServiceRoleKey: Boolean(SUPABASE_SERVICE_ROLE_KEY),
  };
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (SUPABASE_DISABLED) return null;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  if (clientInstance) return clientInstance;

  clientInstance = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return clientInstance;
}

export async function pingSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  const client = getSupabaseAdminClient();
  if (!client) {
    return { ok: false, message: "Supabase env is not configured." };
  }

  const { error } = await client.from("user_profiles").select("email", { count: "exact", head: true }).limit(1);
  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Supabase is reachable." };
}

export async function pingSupabaseTable(tableName: string): Promise<{ ok: boolean; message: string }> {
  const client = getSupabaseAdminClient();
  if (!client) {
    return { ok: false, message: "Supabase env is not configured." };
  }

  const { error } = await client.from(tableName).select("*", { count: "exact", head: true }).limit(1);
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, message: "ok" };
}
