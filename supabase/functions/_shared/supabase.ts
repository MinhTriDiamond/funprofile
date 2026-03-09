/**
 * Supabase client factory for Edge Functions.
 * Re-exports createAdminClient for consistency.
 *
 * Usage:
 *   import { createAdminClient } from "../_shared/supabase.ts";
 *   const supabase = createAdminClient();
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Create an admin Supabase client using SUPABASE_SERVICE_ROLE_KEY.
 * Use this for server-side operations that bypass RLS.
 */
export function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

/**
 * Create a Supabase client using the anon key.
 * Use this when you want RLS to apply.
 */
export function createAnonClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );
}
