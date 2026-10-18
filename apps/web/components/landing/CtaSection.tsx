"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Scale, Check, Terminal } from "lucide-react";
import { motion } from "framer-motion";

export function CtaSection() {
  return (
    <section className="py-16 md:py-24 bg-white dark:bg-[#070b13] border-t border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-[8px] bg-[#0c111c] border border-slate-800 text-white p-8 sm:p-12 lg:p-16 overflow-hidden shadow-2xl">
          {/* Subtle Terminal Grid Background */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

          {/* Top Edge Cyan/Blue Hairline Accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#387ed1] to-transparent" />

          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-5">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-[4px] bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium">
              <Terminal className="w-3.5 h-3.5 text-[#387ed1]" />
              <span>Terminal Ready • Instant Browser Ingestion</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Turn your past executions into <br className="hidden sm:inline" />
              <span className="text-[#387ed1]">your most disciplined trading edge.</span>
            </h2>

            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Export your tradebook CSV today. See where emotions cost you money, verify your broker tax statements down to the exact rupee, and test rule guardrails before tomorrow&apos;s 09:15 opening bell.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3 rounded-[4px] text-xs font-bold text-white bg-[#387ed1] hover:bg-[#2b6ebf] transition-all duration-150 space-x-2 shadow-sm"
              >
                <span>Import Tradebook Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/reconciliation"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-[4px] text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all duration-150 space-x-2"
              >
                <Scale className="w-3.5 h-3.5 text-slate-400" />
                <span>View Reconciliation Audit</span>
              </Link>
            </div>

            <div className="pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Free Universal Ingestion
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> Tenant-Isolated RLS
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Zero Credential Access Needed
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
