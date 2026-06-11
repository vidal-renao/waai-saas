import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Service role client bypasses RLS — only for server-side webhook processing.
// NEVER expose this client or its key to the frontend.
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role credentials are not configured");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
