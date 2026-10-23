import React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ShieldAlert, Scale, CheckCircle2, BookOpen } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export const metadata = {
  title: "Terms of Service & Regulatory Disclaimers | TradeLens",
  description: "Terms of service, statutory SEBI educational disclaimers, and derivative risk disclosures for TradeLens.",
};

export default function TermsOfServicePage() {
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
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-[5px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider mb-4">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Statutory Regulatory Disclosures</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
          Terms of Service &amp; Disclaimers
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Last Updated: October 2026 • Effective Date: October 2026 • Jurisdiction: Republic of India
        </p>
      </div>

      {/* Main Content Body */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-24 space-y-10 text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {/* MANDATORY SEBI RISK DISCLOSURE BANNER */}
        <div className="p-6 rounded-[8px] bg-rose-500/[0.05] border border-rose-500/30 space-y-3">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>MANDATORY SEBI RISK DISCLOSURE ON DERIVATIVES (F&amp;O)</span>
          </div>
          <div className="space-y-2 text-xs text-rose-900 dark:text-rose-200">
            <p>
              Pursuant to the Securities and Exchange Board of India (SEBI) study dated January 2023 on
              <em> &quot;Analysis of Profit and Loss of Individual Traders Dealing in Equity F&amp;O Segment&quot;</em>:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>9 out of 10 individual traders</strong> in equity Futures and Options Segment incurred net losses.</li>
              <li>On average, loss makers registered net trading losses close to <strong>₹50,000</strong> per individual.</li>
              <li>Over and above the net trading losses, active losers incurred an additional <strong>28% of net trading losses</strong> as transaction and statutory charges.</li>
              <li>Those making net trading profits incurred between <strong>15% to 50%</strong> of such profits as charges.</li>
            </ul>
          </div>
        </div>

        {/* Section 1: Non-Advisory Nature */}
        <section className="card-luminous p-6 sm:p-8 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#2b7fff]" />
            <span>1. Self-Directed Educational &amp; Journaling Tool (No Advisory)</span>
          </h2>
          <p>
            TradeLens is strictly an educational software application designed to help self-directed traders
            journal their executions, audit broker statutory fees, and detect behavioral trading biases.
          </p>
          <div className="p-4 rounded-[6px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05] space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>TradeLens is <strong>NOT</strong> a SEBI-registered Investment Adviser (RIA) under the SEBI (Investment Advisers) Regulations, 2013.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>TradeLens is <strong>NOT</strong> a SEBI-registered Research Analyst (RA) under the SEBI (Research Analysts) Regulations, 2014.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>TradeLens does <strong>NOT</strong> provide buy/sell signals, tips, portfolio management (PMS), algorithmic execution, or guaranteed returns.</span>
            </div>
          </div>
        </section>

        {/* Section 2: User Responsibility */}
        <section className="card-luminous p-6 sm:p-8 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#2b7fff]" />
            <span>2. User Financial Responsibility</span>
          </h2>
          <p>
            All trading decisions, stop-loss determinations, order placements, and risk exposures are taken solely
            and independently by you on your registered broker. TradeLens and its developers bear zero liability
            for any trading losses, missed profits, or slippage incurred in market operations.
          </p>
        </section>

        {/* Section 3: Data Integrity & Formula Neutralization */}
        <section className="card-luminous p-6 sm:p-8 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#2b7fff]" />
            <span>3. Acceptable Use &amp; Security Compliance</span>
          </h2>
          <p>
            Users agree not to upload malicious payloads, conduct denial-of-service attempts, or attempt automated
            scraping of other tenants&apos; data. TradeLens automatically neutralizes all CSV formula injection patterns
            (<code>=</code>, <code>+</code>, <code>-</code>, <code>@</code>, <code>\t</code>, <code>\r</code>) to protect users from CWE-1236 vulnerabilities.
          </p>
        </section>

        {/* Section 4: Governing Law */}
        <section className="card-luminous p-6 sm:p-8 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#2b7fff]" />
            <span>4. Governing Law &amp; Jurisdiction</span>
          </h2>
          <p>
            These Terms of Service are governed by and construed in accordance with the laws of the
            <strong> Republic of India</strong>. Any dispute arising out of or in connection with these Terms
            shall be subject to the exclusive jurisdiction of the competent courts in <strong>Bengaluru, Karnataka, India</strong>.
          </p>
        </section>
      </main>
    </div>
  );
}
