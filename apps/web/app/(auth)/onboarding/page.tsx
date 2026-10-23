"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Clock, ArrowRight, User } from "lucide-react";
import { completeOnboarding, type AuthState } from "@/lib/auth/actions";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BrandLogo } from "@/components/brand/BrandLogo";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="hero-kiro-btn-cta w-full !py-3 text-xs font-bold shadow-[0_0_20px_rgba(43,127,255,0.4)] disabled:opacity-50"
    >
      <span>{pending ? "Saving profile..." : "Complete Setup & Launch Journal"}</span>
      <ArrowRight className="w-4 h-4 ml-1.5" />
    </button>
  );
}

export default function OnboardingPage() {
  const [state, formAction] = useFormState<AuthState, FormData>(completeOnboarding, {});

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#f8fafc] dark:bg-[#050814] text-slate-900 dark:text-slate-100 transition-colors duration-200 relative overflow-hidden">
      {/* Background Grid & Ambient Mesh */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 inset-x-0 h-96 bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,rgba(43,127,255,0.15),transparent)] dark:block hidden"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-tech-grid opacity-35 dark:opacity-25"
      />

      {/* Top Floating Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <BrandLogo variant="horizontal" size="lg" href="/" />
          <div className="pt-1">
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[5px] bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-mono font-medium">
              <span>Profile Setup • Step 1 of 1</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight pt-1">
            Personalize Your Trading Journal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Set your trading style and starting capital to calibrate risk metrics and behavioral leak alerts.
          </p>
        </div>

        {/* Form Card */}
        <div className="p-7 sm:p-8 card-luminous rounded-[12px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] space-y-5 shadow-xl relative overflow-hidden">
          {/* Subtle Ambient Bloom Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 w-60 h-60 rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-3xl"
          />

          {state?.error && (
            <div className="p-3 rounded-[6px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-medium text-rose-700 dark:text-rose-300">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-4 relative z-10">
            {/* Display Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="displayName">
                Your Name / Trader Alias
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required
                  placeholder="e.g. Alpha Trader"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-[6px] bg-slate-50 dark:bg-[#060a12] border border-slate-200 dark:border-white/[0.1] text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#2b7fff] focus:ring-1 focus:ring-[#2b7fff] transition"
                />
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="timezone">
                Trading Timezone
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <select
                  id="timezone"
                  name="timezone"
                  defaultValue="Asia/Kolkata"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-[6px] bg-slate-50 dark:bg-[#060a12] border border-slate-200 dark:border-white/[0.1] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#2b7fff] focus:ring-1 focus:ring-[#2b7fff] transition appearance-none cursor-pointer"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST - Indian Standard Time)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">America/New_York (EST / EDT)</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                NSE, BSE, and Indian market fill timestamps align to this timezone.
              </p>
            </div>

            {/* Starting Capital */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="startingCapital">
                Starting Capital (₹ Optional)
              </label>
              <div className="relative">
                <div className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 text-sm font-bold flex items-center justify-center">
                  ₹
                </div>
                <input
                  id="startingCapital"
                  name="startingCapital"
                  type="number"
                  step="1000"
                  min="0"
                  placeholder="e.g. 100000"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-[6px] bg-slate-50 dark:bg-[#060a12] border border-slate-200 dark:border-white/[0.1] text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#2b7fff] focus:ring-1 focus:ring-[#2b7fff] transition"
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Used as the baseline for percentage return on capital and drawdown alerts.
              </p>
            </div>

            {/* Trading Segments */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Active Trading Segments
              </span>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center space-x-3 p-3.5 rounded-[8px] bg-slate-50 dark:bg-[#060a12] border border-slate-200 dark:border-white/[0.08] cursor-pointer hover:border-[#2b7fff] dark:hover:border-[#2b7fff] transition">
                  <input
                    type="checkbox"
                    name="segment_equity"
                    defaultChecked
                    className="w-4 h-4 rounded-[3px] text-[#2b7fff] bg-white dark:bg-[#090e1a] border-slate-300 dark:border-white/[0.2] focus:ring-[#2b7fff]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">NSE/BSE Equity</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Intraday &amp; Delivery</span>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-3.5 rounded-[8px] bg-slate-50 dark:bg-[#060a12] border border-slate-200 dark:border-white/[0.08] cursor-pointer hover:border-[#2b7fff] dark:hover:border-[#2b7fff] transition">
                  <input
                    type="checkbox"
                    name="segment_fno"
                    defaultChecked
                    className="w-4 h-4 rounded-[3px] text-[#2b7fff] bg-white dark:bg-[#090e1a] border-slate-300 dark:border-white/[0.2] focus:ring-[#2b7fff]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">F&amp;O Derivatives</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Futures &amp; Options (CE/PE)</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-2">
              <SubmitButton />
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
