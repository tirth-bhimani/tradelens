import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Database, ExternalLink, Scale, FileText } from "lucide-react";
import { getRecentImports } from "@/lib/trades/actions";
import { DataExportCard } from "@/components/settings/data-export-card";
import { ImportRetentionCard } from "@/components/settings/import-retention-card";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Data Management & Privacy | TradeLens Settings",
  description: "Export full trade data archives, manage import retention, and exercise erasure rights under Indian DPDP Act 2023.",
};

export default async function SettingsDataPage() {
  const { imports } = await getRecentImports();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-luminous p-6 sm:p-7 relative overflow-hidden transition-colors border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-3xl"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[5px] bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-mono font-medium">
              <Database className="w-3.5 h-3.5 text-[#387ed1]" />
              <span>DATA PRIVACY &amp; SOVEREIGNTY (DPDP ACT 2023)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Data Management &amp; Privacy Rights
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Under India&apos;s Digital Personal Data Protection Act, 2023, you hold absolute ownership
              over your tradebook records. Export your entire history, delete specific broker batches,
              or permanently erase your account at any time.
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

      {/* 1. Export Data Card (Right to Portability) */}
      <DataExportCard />

      {/* 2. Uploaded Tradebooks Retention & Granular Deletion */}
      <ImportRetentionCard initialImports={imports} />

      {/* 3. Statutory DPDP Act 2023 Rights Summary */}
      <div className="card-luminous p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <Scale className="w-4 h-4 text-[#387ed1]" />
            <span>Your Statutory Privacy Rights</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1 text-[#387ed1] hover:underline font-medium"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Privacy Policy</span>
            </Link>
            <Link
              href="/terms"
              className="inline-flex items-center gap-1 text-[#387ed1] hover:underline font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Terms of Service</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="p-3.5 rounded-[6px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05] space-y-1">
            <div className="font-semibold text-slate-900 dark:text-slate-200">Right to Access &amp; Summary</div>
            <p className="text-[11px] leading-relaxed">
              Obtain an instant summary of processed digital personal data and associated broker tradebooks under Sec 11 of the DPDP Act.
            </p>
          </div>
          <div className="p-3.5 rounded-[6px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05] space-y-1">
            <div className="font-semibold text-slate-900 dark:text-slate-200">Right to Erasure</div>
            <p className="text-[11px] leading-relaxed">
              Remove individual import batches or completely scrub your identity and logs across all tables with immediate effect under Sec 12(3).
            </p>
          </div>
          <div className="p-3.5 rounded-[6px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05] space-y-1">
            <div className="font-semibold text-slate-900 dark:text-slate-200">Grievance Redressal</div>
            <p className="text-[11px] leading-relaxed">
              Direct access to TradeLens&apos;s designated Grievance Redressal Officer at grievance@tradelens.in with a 30-day statutory resolution guarantee.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Danger Zone (Permanent Account Deletion) */}
      <DeleteAccountDialog />
    </div>
  );
}
