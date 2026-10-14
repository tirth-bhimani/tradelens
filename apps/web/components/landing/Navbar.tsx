"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo Brand: Crisp 6px mark */}
          <Link href="/" className="flex items-center space-x-2.5 group">
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

          {/* Right Action: Theme Toggle + TradeLens Primary Button with Shimmer */}
          <div className="hidden md:flex items-center space-x-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-[#387ed1] dark:hover:text-[#387ed1] px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="btn-zerodha-primary btn-groww-shimmer"
            >
              Sign up for free
            </Link>
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
              <Link href="/login" className="btn-zerodha-secondary w-full text-center">
                Sign In
              </Link>
              <Link href="/signup" className="btn-zerodha-primary btn-groww-shimmer w-full text-center">
                Sign up for free
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
