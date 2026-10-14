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
  { href: "/imports", label: "Trade Imports" },
  { href: "/rule-lab", label: "Rule Lab" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1.5 rounded-[4px] transition-all duration-150 ${
              isActive
                ? "bg-blue-50 dark:bg-blue-950/70 text-[#387ed1] dark:text-[#38bdf8] font-semibold shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
