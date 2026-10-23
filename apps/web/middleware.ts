import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { authRateLimiter, uploadRateLimiter } from "@/lib/security/rate-limiter";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const clientIp =
    request.ip ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1";

  // 1. Rate limit authentication routes (10 req/min)
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/auth/")
  ) {
    const rateCheck = authRateLimiter.check(clientIp);
    if (!rateCheck.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: "Too Many Requests. Rate limit exceeded. Please wait before retrying.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil(rateCheck.resetMs / 1000).toString(),
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  }

  // 2. Rate limit tradebook CSV uploads (5 req/min)
  if (pathname.startsWith("/api/trades/upload")) {
    const rateCheck = uploadRateLimiter.check(clientIp);
    if (!rateCheck.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: "Upload Rate Limit Exceeded. You can upload up to 5 tradebooks per minute.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil(rateCheck.resetMs / 1000).toString(),
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image formats
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff|woff2)$).*)",
  ],
};
