"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export function CtaSection() {
  return (
    <section className="py-16 md:py-20 bg-slate-50 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: false, margin: "-40px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[10px] bg-gradient-to-tr from-[#387ed1] to-sky-600 text-white p-8 sm:p-14 lg:p-16 overflow-hidden shadow-xl shadow-blue-600/15"
        >
          {/* Subtle Ambient Rings */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-[3px] bg-white/15 border border-white/20 text-white text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-sky-200" />
              <span>Ready in 60 Seconds</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Turn Your Past Trades Into Your Most Powerful Edge
            </h2>

            <p className="text-blue-100 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              Export your tradebook today. See where emotions cost you money and prove which rules work before tomorrow&apos;s market opening.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3">
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-[4px] text-sm font-bold text-[#387ed1] bg-white hover:bg-slate-50 shadow-md transition-all duration-150 hover:-translate-y-0.5 btn-groww-shimmer"
              >
                <span>Get Started for Free</span>
                <ArrowRight className="w-4 h-4 ml-2 text-[#387ed1]" />
              </Link>

              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 rounded-[4px] text-sm font-semibold text-white hover:bg-white/15 border border-white/30 backdrop-blur-sm transition-all duration-150"
              >
                <span>Sign In to Account</span>
              </Link>
            </div>

            <div className="pt-6 border-t border-white/20 flex flex-wrap items-center justify-center gap-6 text-xs text-blue-100 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-sky-200" /> Free to get started
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-200" /> Private &amp; RLS Isolated
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-sky-200" /> Indian Equity &amp; F&amp;O Supported
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
