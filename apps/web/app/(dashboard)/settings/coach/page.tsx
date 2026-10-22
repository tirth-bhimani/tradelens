import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Lock } from "lucide-react";
import { getTraderCoachesAction } from "@/lib/coach/coach-actions";
import { CoachConsentManager } from "@/components/settings/coach-consent-manager";

export const metadata = {
  title: "Coach Consent & Permissions | TradeLens Settings",
  description: "Audit and revoke mentor access to your trading logs and behavioral metrics.",
};

export default async function SettingsCoachPage() {
  const { coaches } = await getTraderCoachesAction();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-luminous p-6 sm:p-7 relative overflow-hidden transition-colors border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 rounded-full bg-emerald-500/10 dark:bg-emerald-600/10 blur-3xl"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[5px] bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-mono font-medium">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>DATA PRIVACY &amp; REVOCABLE ACCESS CONTROL</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Coach Consent &amp; Permissions
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              You retain absolute data sovereignty over your trades and performance metrics. When you revoke access, the coach is immediately blocked at the database level from querying your trade ledger, imports, or behavioral leak autopsies.
            </p>
          </div>

          <div className="shrink-0 flex items-center space-x-2.5">
            <Link
              href="/dashboard"
              className="kiro-btn-outline !h-9 !px-4 text-xs font-semibold inline-flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Consent Manager */}
      <CoachConsentManager initialCoaches={coaches} />
    </div>
  );
}
