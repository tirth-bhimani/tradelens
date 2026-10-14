"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function Footer() {
  return (
    <footer className="bg-white dark:bg-[#070a10] border-t border-slate-200 dark:border-slate-800 py-16 text-slate-600 dark:text-slate-400 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-100 dark:border-slate-800">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <BrandLogo variant="horizontal" size="md" href="/" />
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              India&apos;s behavioral trade journal &amp; deterministic rule backtester. Built for retail traders trading NSE Equity &amp; F&amp;O.
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Product</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="#features" className="hover:text-[#387ed1] dark:hover:text-[#387ed1] transition">FIFO Pairing Engine</Link></li>
              <li><Link href="#leaks" className="hover:text-[#387ed1] dark:hover:text-[#387ed1] transition">Behavioral Leak Detector</Link></li>
              <li><Link href="#rule-lab" className="hover:text-[#387ed1] dark:hover:text-[#387ed1] transition">Rule Lab 70/30 Replay</Link></li>
              <li><Link href="#charges" className="hover:text-[#387ed1] dark:hover:text-[#387ed1] transition">Indian Tax &amp; STT Engine</Link></li>
            </ul>
          </div>

          {/* Supported Brokers */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Supported Formats</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="text-slate-700 dark:text-slate-300">Standard CSV Tradebook</span></li>
              <li><span className="text-slate-700 dark:text-slate-300">Excel Ledger &amp; Tax P&amp;L (.xlsx)</span></li>
              <li><span className="text-slate-700 dark:text-slate-300">Universal Execution Importer</span></li>
              <li><span className="text-slate-700 dark:text-slate-300">Custom Column CSV Mapper</span></li>
            </ul>
          </div>

          {/* Security & Access */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Security</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="text-slate-700 dark:text-slate-300">PostgreSQL Row-Level Security</span></li>
              <li><span className="text-slate-700 dark:text-slate-300">Zero AI Hallucination Math</span></li>
              <li><span className="text-slate-700 dark:text-slate-300">No Broker Login Credentials Needed</span></li>
              <li><span className="text-slate-700 dark:text-slate-300">Local or Supabase Cloud Storage</span></li>
            </ul>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500">
          <p className="max-w-xl text-[11px] leading-relaxed">
            <strong>Regulatory Disclaimer:</strong> TradeLens is an educational behavioral analytics and rule backtesting platform. TradeLens does not provide buy/sell recommendations, portfolio management, or tips. Not registered as an investment adviser with SEBI.
          </p>

          <p className="text-[11px] whitespace-nowrap">
            © {new Date().getFullYear()} TradeLens. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
