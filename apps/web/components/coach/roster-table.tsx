"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Clock,
  Sparkles,
} from "lucide-react";
import type { StudentRosterItem, CoachConsentStatus } from "@/lib/coach/coach-types";

interface RosterTableProps {
  initialRoster: StudentRosterItem[];
  onInviteClick: () => void;
}

export function RosterTable({ initialRoster, onInviteClick }: RosterTableProps) {
  const [roster] = useState<StudentRosterItem[]>(initialRoster);
  const [filter, setFilter] = useState<"all" | "active" | "revoked">("all");
  const [search, setSearch] = useState("");

  const filteredRoster = useMemo(() => {
    return roster.filter((item) => {
      const matchesFilter = filter === "all" ? true : item.status === filter;
      const matchesSearch =
        item.trader_name.toLowerCase().includes(search.toLowerCase()) ||
        item.trader_email.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [roster, filter, search]);

  const activeCount = roster.filter((r) => r.status === "active").length;
  const revokedCount = roster.filter((r) => r.status === "revoked").length;

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 p-1 rounded-[7px] bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-[5px] transition ${
              filter === "all"
                ? "bg-white dark:bg-[#0c1322] text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            All Students ({roster.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("active")}
            className={`px-3 py-1 rounded-[5px] transition ${
              filter === "active"
                ? "bg-white dark:bg-[#0c1322] text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Active Consent ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("revoked")}
            className={`px-3 py-1 rounded-[5px] transition ${
              filter === "revoked"
                ? "bg-white dark:bg-[#0c1322] text-rose-600 dark:text-rose-400 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Revoked ({revokedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search trader name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-[6px] border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[#2b7fff]"
          />
        </div>
      </div>

      {/* Roster Table Card */}
      <div className="card-luminous overflow-hidden rounded-[8px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-50/75 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Student Trader</th>
                <th className="py-3 px-4">Consent Status</th>
                <th className="py-3 px-4 text-right">Win Rate</th>
                <th className="py-3 px-4 text-right">Net P&L</th>
                <th className="py-3 px-4 text-right">Rule Adherence</th>
                <th className="py-3 px-4 text-center">Risk Flag</th>
                <th className="py-3 px-4 text-right">Connected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        No students found
                      </p>
                      <p className="text-xs max-w-sm">
                        {search
                          ? "No matching student traders found for your search query."
                          : "Invite a trader to your cohort to begin monitoring their discipline and performance."}
                      </p>
                      <button
                        type="button"
                        onClick={onInviteClick}
                        className="mt-2 kiro-btn-cta !h-8 !px-3 text-xs font-semibold"
                      >
                        Generate Student Invite
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRoster.map((item) => {
                  const isRevoked = item.status === "revoked";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {item.trader_name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {item.trader_email}
                        </div>
                      </td>

                      {/* Consent Status */}
                      <td className="py-3.5 px-4">
                        {item.status === "active" ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[4px] text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active Consent</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[4px] text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3 h-3" />
                            <span>Access Revoked</span>
                          </span>
                        )}
                      </td>

                      {/* Win Rate */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold">
                        {isRevoked ? (
                          <span className="text-slate-400">Hidden</span>
                        ) : (
                          <span className={item.win_rate >= 50 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                            {item.win_rate.toFixed(1)}%
                          </span>
                        )}
                      </td>

                      {/* Net P&L */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold">
                        {isRevoked ? (
                          <span className="text-slate-400">Hidden</span>
                        ) : (
                          <span className={item.net_pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                            {item.net_pnl >= 0 ? `+₹${item.net_pnl.toLocaleString("en-IN")}` : `-₹${Math.abs(item.net_pnl).toLocaleString("en-IN")}`}
                          </span>
                        )}
                      </td>

                      {/* Adherence */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        {isRevoked ? (
                          <span className="text-slate-400">Hidden</span>
                        ) : (
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.adherence_pct}%
                          </span>
                        )}
                      </td>

                      {/* Risk Flag */}
                      <td className="py-3.5 px-4 text-center">
                        {isRevoked ? (
                          <span className="text-slate-400 text-[11px]">—</span>
                        ) : item.risk_level === "high" ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[4px] text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            <span>High Tilt Risk</span>
                          </span>
                        ) : item.risk_level === "medium" ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[4px] text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            <span>Moderate</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[4px] text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <Shield className="w-3 h-3" />
                            <span>Disciplined</span>
                          </span>
                        )}
                      </td>

                      {/* Connected Date */}
                      <td className="py-3.5 px-4 text-right text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                        {new Date(item.granted_at).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
