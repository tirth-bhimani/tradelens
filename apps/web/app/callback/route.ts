import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Handles OAuth callback code exchange to establish user session.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNext = requestUrl.searchParams.get("next") || "/dashboard";

  // Prevent open redirect: validate internal destination path
  const isSafeInternal =
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\");
  const destination = isSafeInternal ? rawNext : "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(destination, requestUrl.origin));
    }

    console.error("OAuth code exchange failed:", error.message);
  }

  // Redirect to login with error query param if exchange failed or code missing
  return NextResponse.redirect(
    new URL("/login?error=OAuth+authentication+failed.+Please+try+again.", requestUrl.origin)
  );
}
