import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Mail, Scale, Lock, Database } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export const metadata = {
  title: "Privacy Policy | TradeLens",
  description: "TradeLens Privacy Policy compliant with India's Digital Personal Data Protection Act, 2023 (DPDP Act).",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#050814] text-slate-900 dark:text-slate-100 selection:bg-[#2b7fff] selection:text-white transition-colors duration-200">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#070b16]/80 backdrop-blur-xl sticky top-0 z-50 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BrandLogo variant="horizontal" size="md" href="/" />
        </div>
        <div className="flex items-center space-x-3">
          <ThemeToggle />
          <Link
            href="/"
            className="kiro-btn-outline !h-8 !px-3 text-xs inline-flex items-center space-x-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </div>
      </header>

      {/* Hero Header */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-[5px] bg-blue-500/10 border border-blue-500/20 text-[#2b7fff] text-xs font-mono font-semibold uppercase tracking-wider mb-4">
          <Scale className="w-3.5 h-3.5" />
          <span>Statutory Compliance: DPDP Act 2023</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
          Privacy Policy
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Last Updated: October 2026 • Effective Date: October 2026 • Jurisdiction: Republic of India
        </p>
      </div>

      {/* Main Content Body */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-24 space-y-10 text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {/* Section 1 */}
        <section className="card-luminous p-6 sm:p-8 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2b7fff]" />
            <span>1. Regulatory Framework &amp; Data Fiduciary Status</span>
          </h2>
          <p>
            TradeLens operates as a <strong>Data Fiduciary</strong> in strict compliance with the
            <strong> Digital Personal Data Protection Act, 2023 (DPDP Act, Act No. 22 of 2023)</strong> of India.
            This Policy sets out how TradeLens collects, processes, protects, and erases digital personal data
            and tradebook execution records provided by individual traders (<strong>Data Principals</strong>).
          </p>
        </section>

        {/* Section 2 */}
        <section className="card-luminous p-6 sm:p-8 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-[#2b7fff]" />
            <span>2. Categories of Data Processed</span>
          </h2>
          <div className="space-y-3">
            <p><strong>A. Information You Provide:</strong></p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs">
              <li>Profile data: Email address, display name, and trading timezone (default <code>Asia/Kolkata</code>).</li>
              <li>Broker Tradebooks: Uploaded CSV files containing exchange order timestamps, trading symbol, buy/sell flags, quantity, execution price, and broker order IDs.</li>
              <li>Personal Rulebooks: Custom risk thresholds, maximum loss limits, and psychological discipline rules.</li>
            </ul>

            <p className="pt-2"><strong>B. What We Strictly NEVER Collect:</strong></p>
            <div className="p-3.5 rounded-[6px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Zero-Credential Architecture</span>
              </div>
              <p>
                TradeLens never requests, accesses, or stores your broker trading passwords, Demat PINs, 2FA/TOTP authenticator codes, bank credentials, Aadhaar numbers, or PAN records.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="card-luminous p-6 sm:p-8 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#2b7fff]" />
            <span>3. Purpose of Processing</span>
          </h2>
          <p>We process your trade data exclusively for the explicit purposes consented to at sign-up:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs">
            <li>Deterministic FIFO pairing of raw buy/sell fills into closed round-trip trades.</li>
            <li>Auditing statutory Indian exchange charges (STT, GST, SEBI Turnover fees, Stamp Duty).</li>
            <li>Identifying behavioral trading leaks (revenge trading cascades, sizing tilt, overtrading spirals).</li>
            <li>Evaluating personal rulebook adherence and compiling weekly performance audits.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="card-luminous p-6 sm:p-8 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#2b7fff]" />
            <span>4. Storage Residency &amp; Security Controls</span>
          </h2>
          <p>
            All user databases, encrypted storage buckets, and processing services are anchored within the
            <strong> Republic of India (AWS Mumbai <code>ap-south-1</code> region / Supabase India)</strong>, ensuring full domestic data residency.
          </p>
          <p>
            Every outgoing CSV export is actively sanitized against <strong>CWE-1236 (CSV / Formula Injection)</strong>,
            neutralizing executable prefixes (<code>=</code>, <code>+</code>, <code>-</code>, <code>@</code>, <code>\t</code>, <code>\r</code>)
            so malicious payloads cannot execute when opened in Microsoft Excel or spreadsheet viewers.
          </p>
        </section>

        {/* Section 5 */}
        <section className="card-luminous p-6 sm:p-8 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#2b7fff]" />
            <span>5. Your Rights as a Data Principal (DPDP Act 2023)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
            <div className="p-3.5 rounded-[6px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05] space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">Right to Access &amp; Portability (Sec 11)</div>
              <p className="text-[11px] text-slate-500">
                Download a complete, machine-readable ZIP archive of all raw fills, paired trades, rules, and reports anytime via Settings &gt; Data &amp; Privacy.
              </p>
            </div>
            <div className="p-3.5 rounded-[6px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05] space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">Right to Erasure (Sec 12(3))</div>
              <p className="text-[11px] text-slate-500">
                Permanently purge specific uploaded tradebooks or wipe your entire account and stored files with zero residue.
              </p>
            </div>
            <div className="p-3.5 rounded-[6px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05] space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">Right of Grievance Redressal (Sec 13)</div>
              <p className="text-[11px] text-slate-500">
                Direct statutory access to our designated Grievance Redressal Officer before escalating to the Data Protection Board of India.
              </p>
            </div>
            <div className="p-3.5 rounded-[6px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05] space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">Right to Nominate (Sec 14)</div>
              <p className="text-[11px] text-slate-500">
                Designate a nominee who may exercise data rights on your behalf in the event of death or incapacity.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6 */}
        <section className="card-luminous p-6 sm:p-8 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#2b7fff]" />
            <span>6. Grievance Redressal Officer Contact</span>
          </h2>
          <p>
            In accordance with the Digital Personal Data Protection Act, 2023, the contact details of the designated
            Data Protection &amp; Grievance Redressal Officer are:
          </p>
          <div className="p-4 rounded-[6px] bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-mono space-y-1.5">
            <div><strong>Designation:</strong> Data Protection &amp; Grievance Redressal Officer</div>
            <div><strong>Entity:</strong> TradeLens Technologies Private Limited</div>
            <div><strong>Email:</strong> grievance@tradelens.in</div>
            <div><strong>Location:</strong> Bengaluru, Karnataka, 560001, India</div>
            <div><strong>Statutory Timeline:</strong> Acknowledgment within 48 hours; resolution within 30 calendar days.</div>
          </div>
        </section>
      </main>
    </div>
  );
}
