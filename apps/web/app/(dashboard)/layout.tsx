import Link from "next/link";
import { LogOut } from "lucide-react";
import { getCurrentProfile, signOut } from "@/lib/auth/actions";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { DashboardTransition } from "@/components/dashboard/dashboard-transition";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getCurrentProfile();
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Trader";

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#050814] text-slate-900 dark:text-slate-100 transition-colors duration-200 relative selection:bg-[#2b7fff] selection:text-white overflow-x-hidden">
      {/* TradersJournal Subtle Ambient Top Mesh & Grid Texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 inset-x-0 h-96 bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,rgba(43,127,255,0.12),rgba(255,255,255,0))] dark:block hidden"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-tech-grid opacity-30 dark:opacity-25"
      />

      {/* Top Navigation Bar: TradersJournal Dynamic Floating Glass Aesthetic */}
      <header className="h-16 border-b border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#070b16]/80 backdrop-blur-xl sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between transition-colors shadow-[0_1px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        {/* Brand & Nav */}
        <div className="flex items-center space-x-6 md:space-x-8">
          <BrandLogo variant="horizontal" size="md" href="/dashboard" />
          <DashboardNav />
        </div>

        {/* Right Actions: Session, Theme Toggle & Sign Out */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {/* Live Market Session Status Indicator */}
          <div className="hidden xl:flex items-center space-x-2 px-2.5 py-1 rounded-[5px] bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-[11px] font-mono text-slate-600 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>NSE/BSE • 09:15 - 15:30 IST</span>
          </div>

          <ThemeToggle />

          <div className="hidden sm:flex items-center space-x-2.5 px-2.5 py-1 rounded-[6px] bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] transition hover:border-[#2b7fff]/40">
            <div className="w-6 h-6 rounded-[5px] bg-gradient-to-br from-[#2b7fff] to-[#1c68e3] text-white flex items-center justify-center text-xs font-bold font-mono shadow-[0_0_10px_rgba(43,127,255,0.4)]">
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
              className="kiro-btn-outline !h-8 !px-3 text-xs flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-400 transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </form>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 relative z-10">
        <DashboardTransition>{children}</DashboardTransition>
      </main>
    </div>
  );
}
