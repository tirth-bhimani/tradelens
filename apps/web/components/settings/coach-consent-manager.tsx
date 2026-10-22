"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Building,
  UserCheck,
  Calendar,
  Lock,
} from "lucide-react";
import { revokeCoachConsentAction } from "@/lib/coach/coach-actions";
import type { CoachAccessRecord } from "@/lib/coach/coach-types";

interface CoachConsentManagerProps {
  initialCoaches: CoachAccessRecord[];
}

export function CoachConsentManager({ initialCoaches }: CoachConsentManagerProps) {
  const [coaches, setCoaches] = useState<CoachAccessRecord[]>(initialCoaches);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleRevoke = async (coachId: string) => {
    setRevokingId(coachId);
    setStatusMessage(null);
    try {
      const res = await revokeCoachConsentAction(coachId);
      if (res.success) {
        setCoaches((prev) =>
          prev.map((c) =>
            c.coach_id === coachId
              ? { ...c, status: "revoked", revoked_at: new Date().toISOString() }
              : c
          )
        );
        setStatusMessage({
          type: "success",
          text: "Coach access was immediately revoked. They can no longer view your trade history or behavioral leaks.",
        });
        setConfirmingId(null);
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to revoke coach access. Please try again.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "An unexpected error occurred.",
      });
    } finally {
      setRevokingId(null);
    }
  };

  const activeCoaches = coaches.filter((c) => c.status === "active");
  const pastCoaches = coaches.filter((c) => c.status === "revoked");

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {statusMessage && (
        <div
          className={`p-4 rounded-[8px] border text-xs flex items-center space-x-2 animate-fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Active Coaches Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Active Coach Authorizations ({activeCoaches.length})</span>
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Read-only permissions enforced via PostgreSQL RLS
          </span>
        </div>

        {activeCoaches.length === 0 ? (
          <div className="p-8 rounded-[8px] border border-dashed border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.01] text-center space-y-2">
            <Lock className="w-6 h-6 mx-auto text-slate-400" />
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No active coach authorizations
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Your trading log, behavioral metrics, and performance analytics are completely private.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {activeCoaches.map((coach) => (
              <div
                key={coach.id}
                className="card-luminous p-4 sm:p-5 rounded-[8px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-start sm:items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 text-[#2b7fff] flex items-center justify-center font-bold text-sm shrink-0">
                    {coach.coach_name.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {coach.coach_name}
                      </span>
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[4px] text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Active Consent</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono">{coach.coach_email}</span>
                      {coach.organization_name && (
                        <span className="flex items-center space-x-1">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{coach.organization_name}</span>
                        </span>
                      )}
                      <span className="flex items-center space-x-1 font-mono text-[11px]">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Connected: {new Date(coach.granted_at).toLocaleDateString("en-IN")}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Revoke Controls */}
                <div className="shrink-0 flex items-center space-x-2">
                  {confirmingId === coach.coach_id ? (
                    <div className="flex items-center space-x-2 animate-fade-in">
                      <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                        Confirm revoke?
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRevoke(coach.coach_id)}
                        disabled={revokingId === coach.coach_id}
                        className="!h-8 !px-3 rounded-[5px] bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition"
                      >
                        {revokingId === coach.coach_id ? "Revoking..." : "Yes, Revoke"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="!h-8 !px-2.5 rounded-[5px] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(coach.coach_id)}
                      className="kiro-btn-outline !h-8 !px-3 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 inline-flex items-center space-x-1.5 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Revoke Access</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical / Revoked Coaches Section */}
      {pastCoaches.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200/80 dark:border-white/[0.08]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Past Authorizations ({pastCoaches.length})
          </h3>

          <div className="grid grid-cols-1 gap-2.5">
            {pastCoaches.map((coach) => (
              <div
                key={coach.id}
                className="p-3.5 rounded-[8px] border border-slate-200/60 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200/60 dark:bg-white/[0.06] text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                    {coach.coach_name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                      {coach.coach_name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {coach.coach_email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[4px] bg-slate-100 dark:bg-white/[0.04] text-slate-500">
                    <XCircle className="w-3 h-3 text-rose-400" />
                    <span>Access Revoked</span>
                  </span>
                  {coach.revoked_at && (
                    <span>on {new Date(coach.revoked_at).toLocaleDateString("en-IN")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
