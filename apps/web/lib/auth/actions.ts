"use server";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  error?: string | null;
  success?: boolean;
  message?: string | null;
}

/**
 * Log in using email and password, forwarding to requested deep link.
 */
export async function loginWithEmail(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const rawRedirect = (formData.get("redirectTo") as string) || "/dashboard";

  // Prevent Open Redirect: validate internal path
  const isSafeInternal =
    rawRedirect.startsWith("/") &&
    !rawRedirect.startsWith("//") &&
    !rawRedirect.startsWith("/\\");
  const destination = isSafeInternal ? rawRedirect : "/dashboard";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(destination);
}

/**
 * Register a new trader account using email and password.
 * The database trigger `on_auth_user_created` automatically initializes the profile row.
 */
export async function signupWithEmail(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  if (confirmPassword && password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is required and no active session was established yet
  if (data?.user && !data.session) {
    return {
      success: true,
      message:
        "Account created! Please check your email to confirm your account before signing in. (Or turn off 'Confirm email' in Supabase Auth settings for instant login).",
    };
  }

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

/**
 * Initiate Google OAuth authentication flow with hardened redirect URL detection.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = createClient();
  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  let appUrl: string;
  if (rawAppUrl) {
    appUrl = rawAppUrl.replace(/\/+$/, "");
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL environment variable must be configured in production.");
  } else {
    // Safe development fallback strictly pinned to localhost
    const headerList = headers();
    const host = headerList.get("host") || "localhost:3000";
    const isLocalhost =
      host.startsWith("localhost:") ||
      host.startsWith("127.0.0.1:") ||
      host === "localhost" ||
      host === "127.0.0.1";
    const safeHost = isLocalhost ? host : "localhost:3000";
    appUrl = `http://${safeHost}`;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl}/callback`,
    },
  });

  if (error) {
    const isNotEnabled =
      error.message.toLowerCase().includes("not enabled") ||
      error.message.toLowerCase().includes("validation_failed") ||
      error.message.toLowerCase().includes("unsupported provider");

    const message = isNotEnabled
      ? "Google OAuth is not enabled in your Supabase project. Enable it under Supabase Dashboard -> Authentication -> Providers -> Google with your Google Cloud Client ID & Secret."
      : error.message;

    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  if (data?.url) {
    redirect(data.url);
  }
}

/**
 * Sign out the current user session.
 */
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Complete the personalized onboarding wizard.
 */
export async function completeOnboarding(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated. Please log in first." };
  }

  const displayName = formData.get("displayName") as string;
  const timezone = (formData.get("timezone") as string) || "Asia/Kolkata";
  const capitalStr = formData.get("startingCapital") as string;
  const startingCapital = capitalStr ? parseFloat(capitalStr) : 0.0;

  const segmentEquity = formData.get("segment_equity");
  const segmentFno = formData.get("segment_fno");

  const tradingSegments: string[] = [];
  if (segmentEquity) tradingSegments.push("EQUITY");
  if (segmentFno) tradingSegments.push("FNO");
  if (tradingSegments.length === 0) tradingSegments.push("EQUITY", "FNO");

  if (!displayName || displayName.trim().length === 0) {
    return { error: "Display name is required." };
  }

  if (isNaN(startingCapital) || startingCapital < 0) {
    return { error: "Starting capital must be a valid positive amount." };
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      display_name: displayName.trim(),
      timezone,
      starting_capital: startingCapital,
      trading_segments: tradingSegments,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    return { error: `Failed to save profile: ${error.message}` };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Deduplicated user profile resolution cached per Next.js render cycle.
 */
export const getCurrentProfile = cache(async () => {
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  const hasAuthToken = allCookies.some(
    (c) => c.name.includes("-auth-token") || c.name.startsWith("sb-")
  );

  if (!hasAuthToken) {
    return { user: null, profile: null };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile };
});
