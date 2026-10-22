import React from "react";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export const metadata = {
  title: "404 - Page Not Found | TradeLens",
  description: "The requested page does not exist or has been moved.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f8fafc] dark:bg-[#050814] text-slate-900 dark:text-slate-100 selection:bg-[#2b7fff] selection:text-white">
      <div className="card-luminous max-w-md w-full p-8 rounded-[12px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-xl text-center space-y-5 animate-fade-in">
        <div className="w-14 h-14 mx-auto rounded-full bg-blue-500/10 text-[#2b7fff] flex items-center justify-center">
          <Compass className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-mono font-bold text-[#2b7fff] uppercase tracking-wider">
            Error 404
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            The page or resource you are looking for does not exist, was moved, or the development chunk was invalidated.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/dashboard"
            className="kiro-btn-cta !h-9 !px-5 text-xs font-bold inline-flex items-center space-x-2 shadow-[0_0_15px_-3px_rgba(43,127,255,0.4)]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
