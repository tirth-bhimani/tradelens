import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a browser-side Supabase client using cookie storage.
 * Safe for use in client components ("use client").
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "dummy-anon-key";

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
