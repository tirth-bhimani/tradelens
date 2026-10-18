"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { createClient } from "@/lib/supabase/client";
import { STORAGE_KEY_LAST_ACTIVITY } from "@/lib/auth/idle-timer";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setMounted(true);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
      }
      await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Signout error:", err);
    } finally {
      setUser(null);
      setIsSigningOut(false);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo Brand: Theme-adaptive TradeLens logo */}
          <BrandLogo variant="horizontal" size="md" href="/" />

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Link href="#features" className="hover:text-[#387ed1] dark:hover:text-[#387ed1] transition-colors">
              Features
            </Link>
            <Link href="#leaks" className="hover:text-[#387ed1] dark:hover:text-[#387ed1] transition-colors">
              Behavioral Leaks
            </Link>
            <Link href="#rule-lab" className="hover:text-[#387ed1] dark:hover:text-[#387ed1] transition-colors">
              Rule Lab
            </Link>
            <Link href="#charges" className="hover:text-[#387ed1] dark:hover:text-[#387ed1] transition-colors">
              Pricing &amp; Taxes
            </Link>
            <Link href="#features" className="hover:text-[#387ed1] dark:hover:text-[#387ed1] transition-colors">
              Integrations
            </Link>
          </nav>

          {/* Right Action: Theme Toggle + Auth CTA */}
          <div className="hidden md:flex items-center space-x-3">
            <ThemeToggle />
            {mounted && user ? (
              <div className="flex items-center space-x-3">
                <Link
                  href="/dashboard"
                  className="btn-zerodha-primary text-xs py-2 px-3.5 flex items-center space-x-1.5"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 px-2.5 py-1.5 transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-[#387ed1] dark:hover:text-[#387ed1] px-3 py-1.5 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="btn-zerodha-primary"
                >
                  Sign up for free
                </Link>
              </>
            )}
          </div>

          {/* Mobile Actions: Theme Toggle + Menu Hamburger */}
          <div className="flex items-center space-x-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-[4px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer with AnimatePresence */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1322] px-4 pt-2 pb-6 space-y-3 overflow-hidden shadow-lg"
          >
            <div className="flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-[4px] hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                Features
              </Link>
              <Link href="#leaks" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-[4px] hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                Behavioral Leaks
              </Link>
              <Link href="#rule-lab" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-[4px] hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                Rule Lab
              </Link>
              <Link href="#charges" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-[4px] hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                Pricing &amp; Taxes
              </Link>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              {mounted && user ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-zerodha-primary w-full text-center flex items-center justify-center space-x-1.5"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Go to Dashboard</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    disabled={isSigningOut}
                    className="btn-zerodha-secondary w-full text-center flex items-center justify-center space-x-1.5 text-rose-600 dark:text-rose-400"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="btn-zerodha-secondary w-full text-center">
                    Sign In
                  </Link>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="btn-zerodha-primary w-full text-center">
                    Sign up for free
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
