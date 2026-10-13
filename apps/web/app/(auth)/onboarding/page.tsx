"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Clock, ArrowRight, User, Sparkles } from "lucide-react";
import { completeOnboarding, type AuthState } from "@/lib/auth/actions";
import Link from "next/link";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-zerodha-primary btn-groww-shimmer w-full py-3"
    >
      <span>{pending ? "Saving profile..." : "Complete Setup & Launch Journal"}</span>
      <ArrowRight className="w-4 h-4 ml-1.5" />
    </button>
  );
}

export default function OnboardingPage() {
  const [state, formAction] = useFormState<AuthState, FormData>(completeOnboarding, {});

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-white via-slate-50/50 to-white text-slate-900">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
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
          <div className="pt-1">
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-[3px] bg-blue-50 border border-blue-200 text-[#387ed1] text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-[#387ed1]" />
              <span>Step 1 of 1: Trader Profile</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight pt-1">
            Personalize Your Trading Journal
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Set your trading style and starting capital to calibrate risk metrics and behavioral leak alerts.
          </p>
        </div>

        {/* Card */}
        <div className="p-7 sm:p-8 card-zerodha-glass space-y-5">
          {state?.error && (
            <div className="p-3 rounded-[6px] bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            {/* Display Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="displayName">
                Your Name / Trader Alias
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required
                  placeholder="e.g. Tirth Bhimani"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-[4px] bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#387ed1] focus:ring-1 focus:ring-[#387ed1] transition"
                />
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="timezone">
                Trading Timezone
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <select
                  id="timezone"
                  name="timezone"
                  defaultValue="Asia/Kolkata"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-[4px] bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#387ed1] focus:ring-1 focus:ring-[#387ed1] transition appearance-none cursor-pointer"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST - Indian Standard Time)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">America/New_York (EST / EDT)</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-400">
                NSE, BSE, and Indian market fill timestamps align to this timezone.
              </p>
            </div>

            {/* Starting Capital */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="startingCapital">
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
                  placeholder="e.g. 200000"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-[4px] bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#387ed1] focus:ring-1 focus:ring-[#387ed1] transition"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Used as the baseline for percentage return on capital and drawdown alerts.
              </p>
            </div>

            {/* Trading Segments */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-semibold text-slate-700 block">
                Active Trading Segments
              </span>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center space-x-3 p-3 rounded-[6px] bg-slate-50 border border-slate-200 cursor-pointer hover:border-[#387ed1] hover:bg-blue-50/20 transition">
                  <input
                    type="checkbox"
                    name="segment_equity"
                    defaultChecked
                    className="w-4 h-4 rounded-[2px] text-[#387ed1] bg-white border-slate-300 focus:ring-[#387ed1]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">NSE/BSE Equity</span>
                    <span className="text-[10px] text-slate-500">Intraday &amp; Delivery</span>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-3 rounded-[6px] bg-slate-50 border border-slate-200 cursor-pointer hover:border-[#387ed1] hover:bg-blue-50/20 transition">
                  <input
                    type="checkbox"
                    name="segment_fno"
                    defaultChecked
                    className="w-4 h-4 rounded-[2px] text-[#387ed1] bg-white border-slate-300 focus:ring-[#387ed1]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">F&amp;O Derivatives</span>
                    <span className="text-[10px] text-slate-500">Futures &amp; Options (CE/PE)</span>
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
