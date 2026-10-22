"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  TrendingUp,
  Flame,
  MessageSquare,
  BookOpen,
  Lock,
  PlusCircle,
  UserX,
} from "lucide-react";
import { getTraderDrillDownAction, revokeCoachConsentAction } from "@/lib/coach/coach-actions";
import type { TraderDrillDownData } from "@/lib/coach/coach-types";
import { CoachNoteComposer } from "./coach-note-composer";
import { AssignRuleModal } from "./assign-rule-modal";

interface TraderDetailModalProps {
  traderId: string | null;
  onClose: () => void;
  onRevoked?: (traderId: string) => void;
}

export function TraderDetailModal({ traderId, onClose, onRevoked }: TraderDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "trades" | "tilt" | "notes">("overview");
  const [data, setData] = useState<TraderDrillDownData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    if (!traderId) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getTraderDrillDownAction(traderId).then((res) => {
      if (!isMounted) return;
      setLoading(false);
      if (res.error || !res.data) {
        setError(res.error || "Failed to load mentee analytics.");
      } else {
        setData(res.data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [traderId]);

  const handleRevoke = async () => {
    if (!data || isRevoking) return;
    const confirmed = window.confirm(
      `Are you sure you want to revoke and disconnect mentorship access for ${data.trader_name}?`
    );
    if (!confirmed) return;

    setIsRevoking(true);
    const res = await revokeCoachConsentAction(data.trader_id);
    setIsRevoking(false);

    if (res.success) {
      setData((prev) => (prev ? { ...prev, status: "revoked" } : prev));
      setError("Trader access has been revoked. Performance analytics are strictly shielded.");
      if (onRevoked) onRevoked(data.trader_id);
    }
  };

  if (!traderId) return null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drilldown-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      >
        <div
          className="card-luminous relative w-full max-w-4xl max-h-[90vh] rounded-[12px] border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#090e1a] shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-200/80 dark:border-white/[0.08] flex items-start justify-between bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  <span>READ-ONLY SUPERVISION • RLS ENFORCED</span>
                </span>
                <span className="text-slate-400 text-xs">•</span>
                <span className="text-xs text-slate-500 font-mono">
                  Connected since {data?.connected_date || "Oct 2026"}
                </span>
              </div>
              <h2 id="drilldown-title" className="text-xl font-bold text-slate-900 dark:text-white">
                {data?.trader_name || "Mentee Analytics"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {data?.trader_email}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {data && data.status === "active" && !error && (
                <button
                  type="button"
                  disabled={isRevoking}
                  onClick={handleRevoke}
                  className="!h-8 !px-3 text-xs font-semibold rounded border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition flex items-center space-x-1 disabled:opacity-50"
                  title="Revoke / Disconnect mentorship consent"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>{isRevoking ? "Revoking..." : "Revoke Access"}</span>
                </button>
              )}
              {data && data.status === "active" && !error && (
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="kiro-btn-cta !h-8 !px-3 text-xs font-semibold inline-flex items-center space-x-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Assign Rule</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-[5px] text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          {!error && (
            <div className="px-5 border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-100/50 dark:bg-white/[0.01] flex space-x-2">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`py-2.5 px-3 border-b-2 text-xs font-semibold flex items-center space-x-1.5 transition ${
                  activeTab === "overview"
                    ? "border-[#2b7fff] text-[#2b7fff]"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Performance Overview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("trades")}
                className={`py-2.5 px-3 border-b-2 text-xs font-semibold flex items-center space-x-1.5 transition ${
                  activeTab === "trades"
                    ? "border-[#2b7fff] text-[#2b7fff]"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Recent Executions ({data?.recent_trades.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tilt")}
                className={`py-2.5 px-3 border-b-2 text-xs font-semibold flex items-center space-x-1.5 transition ${
                  activeTab === "tilt"
                    ? "border-[#2b7fff] text-[#2b7fff]"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Tilt Autopsy ({data?.tilt_cascades.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("notes")}
                className={`py-2.5 px-3 border-b-2 text-xs font-semibold flex items-center space-x-1.5 transition ${
                  activeTab === "notes"
                    ? "border-[#2b7fff] text-[#2b7fff]"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Notes &amp; Coaching ({data?.notes.length || 0})</span>
              </button>
            </div>
          )}

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {loading ? (
              <div className="py-20 text-center text-xs text-slate-400 font-mono">
                Loading encrypted student analytics from database...
              </div>
            ) : error ? (
              <div className="p-6 rounded-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-sm">
                  <Lock className="w-4 h-4" />
                  <span>Access Shielded</span>
                </div>
                <p className="text-xs leading-relaxed">{error}</p>
              </div>
            ) : data ? (
              <>
                {/* 1. OVERVIEW TAB */}
                {activeTab === "overview" && (
                  <div className="space-y-5">
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-[8px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
                        <div className="text-[11px] text-slate-500 font-mono">Win Rate</div>
                        <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                          {data.metrics.win_rate.toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-3.5 rounded-[8px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
                        <div className="text-[11px] text-slate-500 font-mono">Net P&amp;L</div>
                        <div
                          className={`text-xl font-bold font-mono mt-1 ${
                            data.metrics.net_pnl >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {data.metrics.net_pnl >= 0 ? `+₹${data.metrics.net_pnl.toLocaleString("en-IN")}` : `-₹${Math.abs(data.metrics.net_pnl).toLocaleString("en-IN")}`}
                        </div>
                      </div>
                      <div className="p-3.5 rounded-[8px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
                        <div className="text-[11px] text-slate-500 font-mono">Max Drawdown</div>
                        <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                          {data.metrics.max_drawdown_pct.toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-3.5 rounded-[8px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
                        <div className="text-[11px] text-slate-500 font-mono">Rule Adherence</div>
                        <div className="text-xl font-bold font-mono text-[#2b7fff] mt-1">
                          {data.metrics.adherence_pct}%
                        </div>
                      </div>
                    </div>

                    {/* Equity Curve SVG Chart */}
                    <div className="p-4 rounded-[8px] border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase font-bold text-slate-700 dark:text-slate-300">
                          Cumulative Equity Curve (INR)
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {data.equity_curve.length} check points
                        </span>
                      </div>

                      <div className="h-44 w-full flex items-end space-x-2 pt-4 px-2">
                        {data.equity_curve.map((pt, idx) => {
                          const maxVal = Math.max(
                            ...data.equity_curve.map((p) => Math.abs(p.cumulative_pnl)),
                            10000
                          );
                          const heightPct = Math.min(100, Math.max(15, (Math.abs(pt.cumulative_pnl) / maxVal) * 100));
                          const isPositive = pt.cumulative_pnl >= 0;

                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center group relative">
                              <div
                                style={{ height: `${heightPct}%` }}
                                className={`w-full max-w-[28px] rounded-t-[4px] transition-all ${
                                  isPositive
                                    ? "bg-emerald-500/80 hover:bg-emerald-500"
                                    : "bg-rose-500/80 hover:bg-rose-500"
                                }`}
                              />
                              <div className="text-[9px] font-mono text-slate-400 mt-1 truncate max-w-[36px]">
                                {pt.date.split("-").slice(1).join("/")}
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-8 px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-mono shadow-md whitespace-nowrap z-20">
                                ₹{pt.cumulative_pnl.toLocaleString("en-IN")}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Rules List */}
                    <div className="space-y-2">
                      <div className="text-xs font-mono uppercase font-bold text-slate-700 dark:text-slate-300">
                        Active Guardrails in Mentee Rulebook ({data.rules.length})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {data.rules.map((r) => (
                          <div
                            key={r.id}
                            className="p-3 rounded-[6px] border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {r.name}
                            </span>
                            {r.suggested_by_coach_id && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-blue-500/10 text-[#2b7fff] border border-blue-500/20">
                                Coach Assigned
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. RECENT EXECUTIONS TAB */}
                {activeTab === "trades" && (
                  <div className="space-y-3">
                    <div className="text-xs font-mono uppercase font-bold text-slate-700 dark:text-slate-300">
                      Recent Ledger Executions
                    </div>
                    <div className="overflow-x-auto rounded-[8px] border border-slate-200/80 dark:border-white/[0.08]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-50/75 dark:bg-white/[0.02] text-slate-500 font-mono text-[11px] uppercase">
                            <th className="py-2.5 px-3">Symbol</th>
                            <th className="py-2.5 px-3">Side</th>
                            <th className="py-2.5 px-3 text-right">Qty</th>
                            <th className="py-2.5 px-3 text-right">Entry</th>
                            <th className="py-2.5 px-3 text-right">Exit</th>
                            <th className="py-2.5 px-3 text-right">P&amp;L (₹)</th>
                            <th className="py-2.5 px-3 text-right">Hold Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                          {data.recent_trades.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                              <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white font-mono">
                                {t.symbol}
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                                    t.side === "BUY"
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                  }`}
                                >
                                  {t.side}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono">{t.quantity}</td>
                              <td className="py-2 px-3 text-right font-mono">₹{t.entry_price.toFixed(1)}</td>
                              <td className="py-2 px-3 text-right font-mono">₹{t.exit_price.toFixed(1)}</td>
                              <td
                                className={`py-2 px-3 text-right font-mono font-bold ${
                                  t.pnl >= 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {t.pnl >= 0 ? `+₹${t.pnl.toLocaleString("en-IN")}` : `-₹${Math.abs(t.pnl).toLocaleString("en-IN")}`}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-400">
                                {t.holding_duration}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. TILT AUTOPSY TAB */}
                {activeTab === "tilt" && (
                  <div className="space-y-3">
                    <div className="text-xs font-mono uppercase font-bold text-slate-700 dark:text-slate-300">
                      Detected Loss Cascades &amp; Revenge Trading Patterns
                    </div>
                    {data.tilt_cascades.length === 0 ? (
                      <div className="p-8 text-center rounded-[8px] border border-dashed border-slate-200 dark:border-white/[0.08] text-xs text-slate-500 space-y-1">
                        <ShieldCheck className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                        <div className="font-semibold text-slate-700 dark:text-slate-300">
                          Zero Tilt Cascades Detected
                        </div>
                        <p>Mentee has adhered to discipline thresholds with no revenge trading spirals.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {data.tilt_cascades.map((c) => (
                          <div
                            key={c.id}
                            className="p-4 rounded-[8px] border border-rose-500/20 bg-rose-500/5 space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center space-x-1.5">
                                <Flame className="w-4 h-4 text-rose-500" />
                                <span>Revenge Spiral Triggered on {c.trigger_symbol}</span>
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-500/20 text-rose-600 dark:text-rose-400">
                                {c.severity} Severity
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                              Detected {c.trades_in_cascade} rapid trades within 30 minutes following an initial stopout, compounding into an aggregate cascade drawdown of ₹{c.loss_spiral_inr.toLocaleString("en-IN")}.
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. NOTES TAB */}
                {activeTab === "notes" && (
                  <CoachNoteComposer
                    traderId={data.trader_id}
                    traderName={data.trader_name}
                    initialNotes={data.notes}
                    onNoteAdded={(newNote) => {
                      setData((prev) =>
                        prev ? { ...prev, notes: [newNote, ...prev.notes] } : prev
                      );
                    }}
                  />
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Assign Rule Modal Dialog */}
      {data && (
        <AssignRuleModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          traderId={data.trader_id}
          traderName={data.trader_name}
          onRuleAssigned={(ruleName) => {
            setData((prev) =>
              prev
                ? {
                    ...prev,
                    rules: [
                      ...prev.rules,
                      {
                        id: `rule-assigned-${Date.now()}`,
                        name: ruleName,
                        rule_type: "custom",
                        is_active: true,
                        suggested_by_coach_id: "coach-01",
                      },
                    ],
                  }
                : prev
            );
          }}
        />
      )}
    </>
  );
}
