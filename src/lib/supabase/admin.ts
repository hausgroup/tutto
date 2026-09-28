import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getServerEnv, isSupabaseConfigured } from "@/lib/env";

/** Server-only admin client. Returns null if service role is not configured. */
export function createSupabaseAdminClient() {
  if (!isSupabaseConfigured()) return null;
  const env = getServerEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return null;

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
