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
  const [isScrolled, setIsScrolled] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
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
    <header className="kiro-nav fixed inset-x-0 z-50 transition-all duration-300">
      <div className={`w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300 ${isScrolled ? "pt-2" : "pt-0"}`}>
        <div className="kiro-island-shell">
          <div
            className={`kiro-island-card transition-all duration-300 ${
              isScrolled
                ? "on"
                : "bg-white/80 dark:bg-[#070b13]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between h-16 sm:h-[60px] px-2 sm:px-3">
              {/* Logo Brand: Theme-adaptive TradeLens logo */}
              <BrandLogo variant="horizontal" size="md" href="/" />

              {/* Desktop Navigation Links */}
              <nav className="hidden lg:flex items-center space-x-1.5 text-xs font-semibold">
                <Link href="#features" className="kiro-nav-link">
                  FEATURES
                </Link>
                <Link href="#leaks" className="kiro-nav-link">
                  BEHAVIORAL LEAKS
                </Link>
                <Link href="#rule-lab" className="kiro-nav-link">
                  RULE LAB
                </Link>
                <Link href="#charges" className="kiro-nav-link">
                  PRICING &amp; TAXES
                </Link>
                <Link href="/tilt-autopsy" className="kiro-nav-link text-[#2b7fff] dark:text-[#387ed1]">
                  TILT AUTOPSY
                </Link>
              </nav>

              {/* Right Action: Theme Toggle + Auth CTA */}
              <div className="hidden md:flex items-center space-x-3">
                <ThemeToggle />
                {mounted && user ? (
                  <div className="flex items-center space-x-2.5">
                    <Link
                      href="/dashboard"
                      className="kiro-btn-cta text-xs py-2 px-4 flex items-center space-x-1.5"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>Dashboard</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="kiro-btn-outline text-xs py-2 px-3 flex items-center space-x-1.5 text-rose-600 dark:text-rose-400"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="kiro-btn-outline text-xs"
                    >
                      SIGN IN
                    </Link>
                    <Link
                      href="/signup"
                      className="kiro-btn-cta text-xs"
                    >
                      START FOR FREE
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile Actions: Theme Toggle + Menu Hamburger */}
              <div className="flex items-center space-x-2 lg:hidden">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-[6px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>
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
            className="lg:hidden mx-4 mt-1 rounded-[12px] border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0d1322]/95 backdrop-blur-xl px-5 pt-3 pb-6 space-y-3 overflow-hidden shadow-2xl"
          >
            <div className="flex flex-col space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-[6px] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                FEATURES
              </Link>
              <Link href="#leaks" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-[6px] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                BEHAVIORAL LEAKS
              </Link>
              <Link href="#rule-lab" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-[6px] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                RULE LAB
              </Link>
              <Link href="#charges" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-[6px] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                PRICING &amp; TAXES
              </Link>
              <Link href="/tilt-autopsy" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-[6px] hover:bg-slate-100 dark:hover:bg-slate-800 text-[#2b7fff] transition-colors">
                TILT AUTOPSY
              </Link>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              {mounted && user ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="kiro-btn-cta w-full text-center flex items-center justify-center space-x-1.5"
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
                    className="kiro-btn-outline w-full text-center flex items-center justify-center space-x-1.5 text-rose-600 dark:text-rose-400"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="kiro-btn-outline w-full text-center">
                    SIGN IN
                  </Link>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="kiro-btn-cta w-full text-center">
                    START FOR FREE
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
