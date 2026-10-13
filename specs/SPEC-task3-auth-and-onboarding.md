# Spec: Task 3 - Authentication and User Profile Onboarding Flow

## Assumptions
1. **Auth Provider**: Supabase Auth using `@supabase/ssr` and `@supabase/supabase-js` for modern Next.js App Router server and client components with secure HTTP-only cookie management.
2. **Auth Methods**: Email + Password authentication, password reset, and Google OAuth with PKCE flow.
3. **Profile Lifecycle**: When a user registers or logs in for the first time, a corresponding row in the `profiles` table is initialized with `id = auth.users.id`.
4. **Onboarding Guard**: An authenticated user whose profile lacks required setup (e.g. timezone, trading segments) is redirected to `/onboarding` before accessing the dashboard or trade import features.
5. **Local & Cloud Compatibility**: Works with both local Supabase emulation and cloud Supabase via standard environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

## Objective
Implement secure user authentication and personalized onboarding for TradeLens. This foundation ensures:
- Retail traders can safely sign up, log in with email/password or Google OAuth, and securely verify their sessions.
- Session tokens are stored in secure HTTP-only cookies and refreshed seamlessly via Next.js Middleware.
- Every authenticated trader has a personalized profile containing display name, timezone (defaulting to IST `Asia/Kolkata`), initial capital (for return percentage metrics), and active trading segments (Equity, F&O).
- Unauthenticated traffic attempting to access protected trade analytics routes is cleanly redirected to `/login`.

## Tech Stack
- **Framework**: Next.js 14+ (App Router, Server Actions, Middleware)
- **Auth Client Library**: `@supabase/ssr` v0.5+, `@supabase/supabase-js` v2.45+
- **Styling & UI**: Tailwind CSS, Lucide React icons
- **Form Validation**: Zod / standard React Server Action validation
- **Testing**: Vitest + React Testing Library (mocks and unit tests in `apps/web/tests/auth.test.ts`)

## Commands

### Dependencies Installation
```powershell
# Install Supabase SSR and JS clients in apps/web
npm install @supabase/ssr @supabase/supabase-js --prefix apps/web
```

### Development & Build
```powershell
# Run Next.js development server
npm run dev --prefix apps/web

# Build production bundle
npm run build --prefix apps/web
```

### Testing & Linting
```powershell
# Run auth utility and route tests
npm test --prefix apps/web

# Lint Next.js codebase
npm run lint --prefix apps/web
```

## Project Structure
```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx              # Login form (Email/Password + Google OAuth)
│   │   ├── signup/
│   │   │   └── page.tsx              # Account registration form
│   │   ├── callback/
│   │   │   └── route.ts              # OAuth & email verification callback handler
│   │   └── onboarding/
│   │       └── page.tsx              # Profile setup wizard (Timezone, Capital, Segments)
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Protected dashboard layout with user session header
│   │   └── dashboard/
│   │       └── page.tsx              # Authenticated trader home view
│   ├── layout.tsx
│   └── page.tsx                      # Public landing page with Login CTA
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client (createBrowserClient)
│   │   ├── server.ts                 # Server component client (createServerClient)
│   │   └── middleware.ts             # Session refresh helper for Next.js Middleware
│   └── auth/
│       └── actions.ts                # Server actions for login, signup, signout, onboarding
├── middleware.ts                     # Route protection & session refresh middleware
└── tests/
    ├── format.test.ts
    └── auth.test.ts                  # Unit & integration tests for auth guards
```

## Code Style

### Server Client Pattern
```typescript
// apps/web/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // Handled safely by Next.js middleware.
          }
        },
      },
    }
  );
}
```

### Route Guard Middleware Pattern
```typescript
// apps/web/middleware.ts
import { NextResponse, type NextRequest } from "next/request";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

## Testing Strategy
- **Framework**: Vitest running in `apps/web/tests/auth.test.ts`.
- **Test Scenarios**:
  1. **Route Guard Assertions**: Unauthenticated requests to protected paths (`/dashboard`, `/imports`, `/rule-lab`) redirect to `/login`.
  2. **Onboarding Guard**: Authenticated users without completed profiles redirect to `/onboarding`.
  3. **Input Validation**: Timezone defaults to `Asia/Kolkata`; starting capital requires positive non-negative values.
  4. **Server Action Mocking**: Mock Supabase client verifying signup and login dispatch valid credentials.

## Boundaries
- **Always do**:
  - Use secure HTTP-only cookies via `@supabase/ssr` rather than storing tokens in `localStorage`.
  - Validate and sanitize all user inputs on the server before mutating the `profiles` table.
  - Set default timezone to `Asia/Kolkata` (IST) unless explicitly modified by the user.
- **Ask first**:
  - Adding third-party OAuth providers other than Google (e.g. GitHub, Apple).
  - Removing mandatory email verification in production.
- **Never do**:
  - Expose `SUPABASE_SERVICE_ROLE_KEY` to client-side components (browser bundle).
  - Allow unauthenticated users to query or mutate `profiles`, `imports`, or `trades`.

## Success Criteria
- [ ] `@supabase/ssr` and `@supabase/supabase-js` installed in `apps/web`.
- [ ] `/login` and `/signup` pages render responsive, accessible UI with email/password and Google OAuth triggers.
- [ ] Auth callback route (`/callback`) exchanges auth codes for persistent sessions.
- [ ] `/onboarding` wizard collects display name, timezone (default `Asia/Kolkata`), starting capital, and segments, successfully updating the user's `profiles` record.
- [ ] Next.js Middleware automatically refreshes sessions and restricts `/dashboard` access to authenticated users.
- [ ] `npm test --prefix apps/web` passes with green status.
- [ ] `npm run build --prefix apps/web` compiles with zero TypeScript or routing errors.

## Resolved Decisions
1. **Email Verification in Development**: In development mode, signups proceed immediately to `/onboarding` without waiting for email link confirmation to facilitate rapid local testing; production requires email confirmation.
2. **Google OAuth Readiness**: The Google OAuth flow is fully wired with standard PKCE redirect, ready to authenticate as soon as Google credentials are added to the Supabase project.
