"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { signupWithEmail, signInWithGoogle, type AuthState } from "@/lib/auth/actions";

function OAuthErrorBanner() {
  const searchParams = useSearchParams();
  const errorMsg = searchParams.get("error");
  if (!errorMsg) return null;

  return (
    <div className="p-3 rounded-[6px] bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800 leading-relaxed">
      {errorMsg}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-zerodha-primary btn-groww-shimmer w-full py-3"
    >
      <span>{pending ? "Creating account..." : "Sign up for free"}</span>
      <ArrowRight className="w-4 h-4 ml-1.5" />
    </button>
  );
}

export default function SignupPage() {
  const [state, formAction] = useFormState<AuthState, FormData>(signupWithEmail, {});

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-white via-slate-50/50 to-white text-slate-900">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-[6px] bg-[#387ed1] text-white flex items-center justify-center shadow-sm group-hover:bg-[#2b6ebf] transition-colors">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M14 7h7v7" />
              </svg>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl font-bold tracking-tight text-slate-900">Trade</span>
              <span className="text-2xl font-bold tracking-tight text-[#387ed1]">Lens</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight pt-1">Open Free Account</h1>
          <p className="text-xs text-slate-500">
            Uncover behavioral leaks and test trading rules with deterministic replay
          </p>
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
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white/80 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Or with email
            </span>
            <div className="border-t border-slate-200 w-full"></div>
          </div>

          {/* OAuth Redirect Error Banner */}
          <Suspense fallback={null}>
            <OAuthErrorBanner />
          </Suspense>

          {/* Form Error Banner */}
          {state?.error && (
            <div className="p-3 rounded-[6px] bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {state.error}
            </div>
          )}

          {/* Confirmation Message */}
          {state?.message && (
            <div className="p-3 rounded-[6px] bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 leading-relaxed">
              {state.message}
            </div>
          )}

          {/* Signup Form */}
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="email">
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
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-[4px] bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#387ed1] focus:ring-1 focus:ring-[#387ed1] transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-[4px] bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#387ed1] focus:ring-1 focus:ring-[#387ed1] transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="confirmPassword">
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
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-[4px] bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#387ed1] focus:ring-1 focus:ring-[#387ed1] transition"
                />
              </div>
            </div>

            <div className="flex items-start space-x-2 pt-1 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Protected by PostgreSQL Row-Level Security. We never share personal trade records.
              </span>
            </div>

            <SubmitButton />
          </form>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-[#387ed1] hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
