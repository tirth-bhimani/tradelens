"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Scale, Check, Terminal } from "lucide-react";
import { motion } from "framer-motion";

export function CtaSection() {
  return (
    <section className="py-16 md:py-24 bg-slate-50/70 dark:bg-[#070b13] border-t border-slate-200/80 dark:border-slate-800 transition-colors duration-200 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(43,127,255,0.08),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(43,127,255,0.12),transparent_70%)] blur-2xl"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-50px" }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="card-luminous relative rounded-[12px] bg-white dark:bg-[#0c111c] border border-slate-200 dark:border-slate-800/90 text-slate-900 dark:text-white p-8 sm:p-12 lg:p-16 overflow-hidden shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          {/* Theme-Adaptive Subtle Grid Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:18px_18px] opacity-35 dark:opacity-40 pointer-events-none" />

          {/* Top Edge Cyan/Blue Hairline Accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#2b7fff] to-transparent" />

          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-[5px] bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-mono font-medium shadow-sm">
              <Terminal className="w-3.5 h-3.5 text-[#2b7fff] dark:text-[#387ed1]" />
              <span>TERMINAL READY • INSTANT BROWSER INGESTION</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Turn your past executions into <br className="hidden sm:inline" />
              <span className="text-[#2b7fff] dark:text-[#387ed1]">your most disciplined trading edge.</span>
            </h2>

            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Export your tradebook CSV today. See where emotions cost you money, verify your broker tax statements down to the exact rupee, and test rule guardrails before tomorrow&apos;s 09:15 opening bell.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <Link
                href="/signup"
                className="hero-kiro-btn-cta w-full sm:w-auto text-xs font-bold"
              >
                <span>Import Tradebook Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/reconciliation"
                className="hero-kiro-btn-outline w-full sm:w-auto text-xs font-semibold text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 hover:text-slate-950 dark:hover:text-white shadow-sm"
              >
                <Scale className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>View Reconciliation Audit</span>
              </Link>
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Free Universal Ingestion
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> Tenant-Isolated RLS
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Zero Credential Access Needed
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
