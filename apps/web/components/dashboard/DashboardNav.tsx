"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/trades", label: "Trade Log" },
  { href: "/imports", label: "Trade Imports" },
  { href: "/reconciliation", label: "Reconciliation" },
  { href: "/rule-lab", label: "Rule Lab" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard Navigation" className="flex items-center space-x-1 text-xs md:text-sm font-medium overflow-x-auto py-1">
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            className={`px-2.5 sm:px-3 py-1.5 rounded-[4px] whitespace-nowrap transition-colors duration-150 ${
              isActive
                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
