import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Server-side signout endpoint that clears HTTP-only session cookies.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch (err: unknown) {
    console.warn("Server signout error:", err);
  }

  const response = NextResponse.json({ success: true });
  
  // Explicitly clear all Supabase auth cookies from response headers
  const allCookies = request.cookies.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.includes("sb-") || cookie.name.includes("supabase")) {
      response.cookies.delete(cookie.name);
    }
  }

  return response;
}
