import { createClient } from "@supabase/supabase-js";

/**
 * Creates a privileged Supabase admin client using the service role key.
 * Strictly server-side only. Used for high-stakes account erasure (DPDP Act 2023),
 * user management, and administrative cleanup tasks that must bypass RLS.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for privileged admin operations.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
