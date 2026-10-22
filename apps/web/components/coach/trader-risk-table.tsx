"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Clock,
  ArrowRight,
  UserX,
} from "lucide-react";
import type { StudentRosterItem } from "@/lib/coach/coach-types";
import { revokeCoachConsentAction } from "@/lib/coach/coach-actions";

interface TraderRiskTableProps {
  initialRoster: StudentRosterItem[];
  onInviteClick: () => void;
  onInspectTrader: (traderId: string) => void;
}

export function TraderRiskTable({
  initialRoster,
  onInviteClick,
  onInspectTrader,
}: TraderRiskTableProps) {
  const [roster, setRoster] = useState<StudentRosterItem[]>(initialRoster);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low" | "revoked">("all");
  const [search, setSearch] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleRevoke = async (traderId: string, traderName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to revoke and disconnect mentorship access for ${traderName}?`
    );
    if (!confirmed) return;

    setRevokingId(traderId);
    const res = await revokeCoachConsentAction(traderId);
    setRevokingId(null);

    if (res.success) {
      setRoster((prev) =>
        prev.map((r) =>
          r.trader_id === traderId || r.id === traderId
            ? { ...r, status: "revoked", top_leak: "Access Revoked" }
            : r
        )
      );
    }
  };

  const filteredRoster = useMemo(() => {
    return roster.filter((item) => {
      let matchesFilter = true;
      if (filter === "high") matchesFilter = item.risk_level === "high" && item.status === "active";
      else if (filter === "medium") matchesFilter = item.risk_level === "medium" && item.status === "active";
      else if (filter === "low") matchesFilter = item.risk_level === "low" && item.status === "active";
      else if (filter === "revoked") matchesFilter = item.status === "revoked";

      const matchesSearch =
        item.trader_name.toLowerCase().includes(search.toLowerCase()) ||
        item.trader_email.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [roster, filter, search]);

  const highRiskCount = roster.filter((r) => r.risk_level === "high" && r.status === "active").length;
  const moderateCount = roster.filter((r) => r.risk_level === "medium" && r.status === "active").length;
  const disciplinedCount = roster.filter((r) => r.risk_level === "low" && r.status === "active").length;
  const revokedCount = roster.filter((r) => r.status === "revoked").length;

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Risk-level Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-[7px] bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-[5px] transition ${
              filter === "all"
                ? "bg-white dark:bg-[#0c1322] text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            All Mentees ({roster.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("high")}
            className={`px-2.5 py-1 rounded-[5px] transition flex items-center space-x-1 ${
              filter === "high"
                ? "bg-white dark:bg-[#0c1322] text-rose-600 dark:text-rose-400 shadow-xs font-bold"
                : "text-rose-600/70 dark:text-rose-400/70 hover:text-rose-600"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>High Risk ({highRiskCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("medium")}
            className={`px-2.5 py-1 rounded-[5px] transition flex items-center space-x-1 ${
              filter === "medium"
                ? "bg-white dark:bg-[#0c1322] text-amber-600 dark:text-amber-400 shadow-xs font-bold"
                : "text-amber-600/70 dark:text-amber-400/70 hover:text-amber-600"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Moderate ({moderateCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("low")}
            className={`px-2.5 py-1 rounded-[5px] transition flex items-center space-x-1 ${
              filter === "low"
                ? "bg-white dark:bg-[#0c1322] text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                : "text-emerald-600/70 dark:text-emerald-400/70 hover:text-emerald-600"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Disciplined ({disciplinedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("revoked")}
            className={`px-2.5 py-1 rounded-[5px] transition ${
              filter === "revoked"
                ? "bg-white dark:bg-[#0c1322] text-slate-700 dark:text-slate-300 shadow-xs font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
            }`}
          >
            Revoked ({revokedCount})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search mentee name or email..."
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
                <th className="py-3 px-4 text-center">Traffic-Light Risk</th>
                <th className="py-3 px-4 text-right">Win Rate</th>
                <th className="py-3 px-4 text-right">Net P&amp;L</th>
                <th className="py-3 px-4 text-right">Adherence</th>
                <th className="py-3 px-4">Primary Leak</th>
                <th className="py-3 px-4 text-right">Actions</th>
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

                      {/* Traffic-Light Risk Flag */}
                      <td className="py-3.5 px-4 text-center">
                        {isRevoked ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[4px] text-[10px] font-semibold bg-slate-100 dark:bg-white/[0.04] text-slate-500 border border-slate-200 dark:border-white/[0.08]">
                            <XCircle className="w-3 h-3" />
                            <span>Revoked</span>
                          </span>
                        ) : item.risk_level === "high" ? (
                          <span
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            title={item.risk_reasons?.join("; ") || "High tilt risk"}
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            <span>High Tilt Risk</span>
                          </span>
                        ) : item.risk_level === "medium" ? (
                          <span
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            title={item.risk_reasons?.join("; ") || "Moderate risk"}
                          >
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>Moderate</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            title="Disciplined execution with zero tilt cascades"
                          >
                            <Shield className="w-3 h-3 text-emerald-500" />
                            <span>Disciplined</span>
                          </span>
                        )}
                      </td>

                      {/* Win Rate */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold">
                        {isRevoked ? (
                          <span className="text-slate-400">Hidden</span>
                        ) : (
                          <span
                            className={
                              item.win_rate >= 50
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-amber-600 dark:text-amber-400"
                            }
                          >
                            {item.win_rate.toFixed(1)}%
                          </span>
                        )}
                      </td>

                      {/* Net P&L */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold">
                        {isRevoked ? (
                          <span className="text-slate-400">Hidden</span>
                        ) : (
                          <span
                            className={
                              item.net_pnl >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }
                          >
                            {item.net_pnl >= 0
                              ? `+₹${item.net_pnl.toLocaleString("en-IN")}`
                              : `-₹${Math.abs(item.net_pnl).toLocaleString("en-IN")}`}
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

                      {/* Primary Behavioral Leak */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
                        {isRevoked ? (
                          <span className="text-slate-400 italic">Access Revoked</span>
                        ) : (
                          <span className="line-clamp-1">{item.top_leak || "None detected"}</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isRevoked ? (
                          <span className="px-2.5 py-1 rounded text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-white/[0.03]">
                            Revoked
                          </span>
                        ) : (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => onInspectTrader(item.trader_id)}
                              className="kiro-btn-outline !h-7 !px-2.5 text-xs font-semibold inline-flex items-center space-x-1 hover:border-[#2b7fff] hover:text-[#2b7fff] transition"
                              title={`Inspect ${item.trader_name}'s analytics`}
                            >
                              <span>Inspect</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={revokingId === item.trader_id}
                              onClick={() => handleRevoke(item.trader_id, item.trader_name)}
                              className="!h-7 !px-2 text-xs font-medium rounded border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition flex items-center space-x-1 disabled:opacity-50"
                              title="Revoke / Disconnect mentorship consent"
                            >
                              <UserX className="w-3 h-3" />
                              <span className="hidden sm:inline">
                                {revokingId === item.trader_id ? "..." : "Revoke"}
                              </span>
                            </button>
                          </div>
                        )}
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
