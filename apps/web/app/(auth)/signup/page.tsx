"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { signupWithEmail, signInWithGoogle, type AuthState } from "@/lib/auth/actions";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BrandLogo } from "@/components/brand/BrandLogo";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-zerodha-primary w-full py-3"
    >
      <span>{pending ? "Creating account..." : "Sign up for free"}</span>
      <ArrowRight className="w-4 h-4 ml-1.5" />
    </button>
  );
}

function SignupForm() {
  const [state, formAction] = useFormState<AuthState, FormData>(signupWithEmail, {});
  const searchParams = useSearchParams();
  const errorMsg = searchParams.get("error");

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-3 flex flex-col items-center">
        <BrandLogo variant="horizontal" size="lg" href="/" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight pt-1">Open Free Account</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Uncover behavioral leaks and test trading rules with deterministic replay
          </p>
        </div>
      </div>

      {/* Auth Card */}
      <div className="p-7 sm:p-8 card-zerodha-glass space-y-5">
        {/* Google OAuth Button */}
        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="btn-zerodha-secondary w-full py-2.5 text-sm"
          >
            <svg className="w-4 h-4 mr-2.5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
              />
            </svg>
            <span>Sign up with Google</span>
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 dark:border-slate-700 w-full"></div>
          <span className="bg-white/90 dark:bg-slate-800/90 px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
            Or with email
          </span>
          <div className="border-t border-slate-200 dark:border-slate-700 w-full"></div>
        </div>

        {/* OAuth Redirect Error Banner */}
        {errorMsg && (
          <div className="p-3 rounded-[6px] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-medium text-amber-800 dark:text-amber-300 leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* Form Error Banner */}
        {state?.error && (
          <div className="p-3 rounded-[6px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-400">
            {state.error}
          </div>
        )}

        {/* Confirmation Message */}
        {state?.message && (
          <div className="p-3 rounded-[6px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300 leading-relaxed">
            {state.message}
          </div>
        )}

        {/* Signup Form */}
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="trader@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-[4px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#387ed1] focus:ring-1 focus:ring-[#387ed1] transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="At least 8 characters"
                minLength={8}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-[4px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#387ed1] focus:ring-1 focus:ring-[#387ed1] transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                placeholder="Repeat your password"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-[4px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#387ed1] focus:ring-1 focus:ring-[#387ed1] transition"
              />
            </div>
          </div>

          <div className="flex items-start space-x-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Protected by PostgreSQL Row-Level Security. We never share personal trade records.
            </span>
          </div>

          <SubmitButton />
        </form>
      </div>

      {/* Footer Link */}
      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="text-[#387ed1] dark:text-sky-400 hover:underline font-semibold">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-white via-slate-50/50 to-white dark:from-[#0b0f19] dark:via-[#0e1424] dark:to-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-200 relative">
      {/* Top Floating Controls */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <Suspense
        fallback={
          <div className="w-full max-w-md p-8 card-zerodha-glass space-y-4 animate-pulse">
            <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
            <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
            <div className="h-32 bg-slate-100 dark:bg-slate-800/50 rounded" />
          </div>
        }
      >
        <SignupForm />
      </Suspense>
    </main>
  );
}
