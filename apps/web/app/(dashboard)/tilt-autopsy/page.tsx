import React from "react";
import Link from "next/link";
import {
  Flame,
  ShieldCheck,
  UploadCloud,
  Sliders,
  Info,
  Beaker,
} from "lucide-react";
import { detectTiltCascades } from "@/lib/tilt/detector";
import { TiltAutopsyView } from "@/components/tilt/tilt-autopsy-view";

export const metadata = {
  title: "Tilt Autopsy & Cascade Sequencer | TradeLens",
  description: "Forensic post-mortem analysis of revenge trading spirals and emotional velocity compression.",
};

export default function TiltAutopsyPage() {
  // Compute cascades from detected trades (falls back to sample dataset if empty)
  const overview = detectTiltCascades([]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-luminous p-6 sm:p-7 relative overflow-hidden transition-all duration-200 border border-slate-200/80 dark:border-white/[0.08] rounded-[8px] bg-white dark:bg-[#090e1a] shadow-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 rounded-full bg-rose-500/10 dark:bg-rose-600/10 blur-3xl"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[5px] bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-mono font-bold">
              <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span>FORENSIC TILT AUTOPSY • ZERO MANUAL HOMEWORK</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Tilt Autopsy & Cascade Sequencer
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Automated forensic reconstruction of revenge trading spirals. Isolates trigger losses, detects compressed re-entry velocity, and simulates counterfactual circuit breakers to sever future spirals before they drain your account.
            </p>
          </div>

          <div className="shrink-0 flex items-center space-x-3">
            <Link
              href="/rule-lab"
              className="kiro-btn-outline !h-9 !px-4 text-xs font-semibold inline-flex items-center space-x-1.5"
            >
              <Beaker className="w-3.5 h-3.5 text-[#2b7fff]" />
              <span>Open Rule Lab</span>
            </Link>
            <Link
              href="/imports"
              className="kiro-btn-cta !h-9 !px-4 text-xs font-bold inline-flex items-center space-x-1.5 shadow-[0_0_15px_-3px_rgba(43,127,255,0.4)]"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Import Tradebook</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Institutional Explainer Strip */}
      <div className="p-3.5 rounded-[5px] border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 text-xs flex items-start space-x-2.5">
        <Info className="w-4 h-4 text-[#2b7fff] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>How Tilt Detection Works:</strong> Traditional journals require manual emoji logging when you are already tilted. TradeLens automatically diagnoses execution intervals, re-entry timestamps, and position size spikes directly from your broker fills without any manual surveys.
        </p>
      </div>

      {/* Main Interactive Autopsy Container */}
      <TiltAutopsyView overview={overview} />
    </div>
  );
}
