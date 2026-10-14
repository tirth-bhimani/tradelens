import Link from "next/link";
import { LogOut } from "lucide-react";
import { getCurrentProfile, signOut } from "@/lib/auth/actions";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getCurrentProfile();
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Trader";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Navigation Bar: TradeLens clean aesthetic */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0d1322]/95 backdrop-blur-md sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-8">
          <Link href="/dashboard" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-[6px] bg-[#387ed1] text-white flex items-center justify-center shadow-sm group-hover:bg-[#2b6ebf] transition-colors">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M14 7h7v7" />
              </svg>
            </div>
            <div className="flex items-baseline">
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Trade</span>
              <span className="text-xl font-bold tracking-tight text-[#387ed1]">Lens</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-1 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-[4px] bg-blue-50 dark:bg-blue-950/50 text-[#387ed1] font-semibold transition"
            >
              Overview
            </Link>
            <Link
              href="/imports"
              className="px-3 py-1.5 rounded-[4px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition"
            >
              Trade Imports
            </Link>
            <Link
              href="/rule-lab"
              className="px-3 py-1.5 rounded-[4px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition"
            >
              Rule Lab
            </Link>
          </nav>
        </div>

        {/* User Session Badges, Theme Toggle & Sign Out */}
        <div className="flex items-center space-x-3">
          <ThemeToggle />

          <div className="hidden sm:flex items-center space-x-2.5 px-3 py-1 rounded-[4px] bg-slate-100 dark:bg-slate-850 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
            <div className="w-6 h-6 rounded-[3px] bg-[#387ed1] text-white flex items-center justify-center text-xs font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">{displayName}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{profile?.role || "Trader"}</div>
            </div>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center space-x-1 px-3 py-1.5 rounded-[4px] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
