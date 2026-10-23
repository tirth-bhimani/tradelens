"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  UploadCloud,
  CheckSquare,
  BrainCircuit,
  Flame,
  ShieldCheck,
  Beaker,
  GraduationCap,
  ShieldAlert,
  ChevronDown,
  Menu,
  X,
  FileText,
} from "lucide-react";

interface SubNavItem {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: SubNavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "trading",
    label: "Trading",
    icon: BookOpen,
    items: [
      {
        href: "/trades",
        label: "Trade Log",
        description: "Full trade ledger, gross/net P&L & holding time",
        icon: BookOpen,
      },
      {
        href: "/imports",
        label: "Trade Imports",
        description: "Upload Zerodha, Groww & AngelOne CSV tradebooks",
        icon: UploadCloud,
      },
      {
        href: "/reconciliation",
        label: "Reconciliation",
        description: "Audit broker contract note fills & statutory charges",
        icon: CheckSquare,
      },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BrainCircuit,
    items: [
      {
        href: "/tilt-autopsy",
        label: "Tilt Autopsy",
        description: "Revenge trading cascade sequencer & loss spirals",
        icon: Flame,
        badge: "Cascade",
      },
      {
        href: "/insights",
        label: "AI Insights",
        description: "Statistically grounded behavioral diagnostic engine",
        icon: BrainCircuit,
        badge: "AI",
      },
      {
        href: "/reports",
        label: "Weekly Reports",
        description: "Comprehensive performance audit & printable weekly PDF",
        icon: FileText,
      },
    ],
  },
  {
    id: "strategy",
    label: "Strategy",
    icon: ShieldCheck,
    items: [
      {
        href: "/rules",
        label: "Personal Rulebook",
        description: "Active portfolio guardrails & import adherence score",
        icon: ShieldCheck,
      },
      {
        href: "/rule-lab",
        label: "Rule Lab",
        description: "Counterfactual replay sandbox & 70/30 train/test replay",
        icon: Beaker,
      },
    ],
  },
  {
    id: "coaching",
    label: "Coaching",
    icon: GraduationCap,
    items: [
      {
        href: "/coach/traders",
        label: "Student Cohort",
        description: "Monitor mentee discipline, win rate & risk flags",
        icon: GraduationCap,
        badge: "Cohort",
      },
      {
        href: "/settings/coach",
        label: "Revoke & Manage Consent",
        description: "Audit connected mentors and revoke trading data access",
        icon: ShieldAlert,
        badge: "Revoke",
      },
    ],
  },
];

export function DashboardNav() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenGroup(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenGroup(null);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdown and mobile menu on pathname change
  useEffect(() => {
    setOpenGroup(null);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleMouseEnter = (groupId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setOpenGroup(groupId);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenGroup(null);
    }, 200);
  };

  const isOverviewActive = pathname === "/dashboard";

  return (
    <>
      {/* Desktop & Tablet Navigation Bar */}
      <div ref={navRef} className="hidden md:flex items-center space-x-1.5 relative z-50">
        {/* 1. Direct Overview Link */}
        <Link
          href="/dashboard"
          className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold flex items-center space-x-1.5 border transition-colors duration-150 ${
            isOverviewActive
              ? "bg-[#2b7fff] text-white border-[#2b7fff] shadow-xs"
              : "border-transparent text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Overview</span>
        </Link>

        {/* 2. Four Clean Dropdowns: Trading ▾, Analytics ▾, Strategy ▾, Coaching ▾ */}
        {NAV_GROUPS.map((group) => {
          const isGroupActive = group.items.some((item) => pathname.startsWith(item.href));
          const isOpen = openGroup === group.id;
          const GroupIcon = group.icon;

          return (
            <div
              key={group.id}
              className="relative"
              onMouseEnter={() => handleMouseEnter(group.id)}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => setOpenGroup(isOpen ? null : group.id)}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold flex items-center space-x-1.5 border transition-colors duration-150 cursor-pointer ${
                  isGroupActive
                    ? "bg-blue-500/10 text-[#2b7fff] dark:text-[#5ca1ff] border-blue-500/20 font-bold"
                    : "border-transparent text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                }`}
                aria-expanded={isOpen}
              >
                <GroupIcon className="w-3.5 h-3.5" />
                <span>{group.label}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-[#2b7fff]" : "text-slate-500 dark:text-slate-400"
                  }`}
                />
              </button>

              {/* Seamless Hover Bridge & Flyout Card */}
              {isOpen && (
                <div
                  className="absolute left-0 top-full pt-1.5 w-72 z-50 animate-fade-in"
                  onMouseEnter={() => handleMouseEnter(group.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="card-luminous p-1.5 rounded-[10px] border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#0c1322] shadow-2xl">
                    <div className="space-y-0.5">
                      {group.items.map((subItem) => {
                        const isItemActive =
                          pathname === subItem.href || pathname.startsWith(subItem.href + "/");
                        const SubIcon = subItem.icon;

                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={() => setOpenGroup(null)}
                            className={`flex items-start space-x-2.5 p-2 rounded-[6px] transition-colors ${
                              isItemActive
                                ? "bg-blue-500/10 dark:bg-blue-600/15 text-[#2b7fff]"
                                : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-[5px] flex items-center justify-center shrink-0 mt-0.5 ${
                                isItemActive
                                  ? "bg-[#2b7fff] text-white"
                                  : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              <SubIcon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {subItem.label}
                                </span>
                                {subItem.badge && (
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                                      subItem.badge === "Revoke"
                                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                        : "bg-blue-500/10 text-[#2b7fff] border border-blue-500/20"
                                    }`}
                                  >
                                    {subItem.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-1">
                                {subItem.description}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Hamburger Button */}
      <div className="flex md:hidden items-center">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-[6px] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Accordion Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-black/50 backdrop-blur-sm md:hidden animate-fade-in">
          <div className="bg-white dark:bg-[#070b16] border-b border-slate-200 dark:border-white/[0.08] p-4 max-h-[calc(100vh-4rem)] overflow-y-auto space-y-4 shadow-xl">
            {/* Overview */}
            <Link
              href="/dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center space-x-2.5 p-2.5 rounded-[8px] text-xs font-bold ${
                isOverviewActive
                  ? "bg-[#2b7fff] text-white"
                  : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </Link>

            {/* Categorized Sections */}
            {NAV_GROUPS.map((group) => {
              const GroupIcon = group.icon;
              return (
                <div key={group.id} className="space-y-1">
                  <div className="px-2.5 py-1 text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                    <GroupIcon className="w-3 h-3 text-[#2b7fff]" />
                    <span>{group.label}</span>
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isItemActive =
                        pathname === subItem.href || pathname.startsWith(subItem.href + "/");

                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center justify-between p-2 rounded-[6px] text-xs font-medium ${
                            isItemActive
                              ? "bg-blue-500/10 text-[#2b7fff] font-bold"
                              : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <SubIcon className="w-3.5 h-3.5 opacity-70" />
                            <span>{subItem.label}</span>
                          </div>
                          {subItem.badge && (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                                subItem.badge === "Revoke"
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                  : "bg-blue-500/10 text-[#2b7fff] border border-blue-500/20"
                              }`}
                            >
                              {subItem.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
