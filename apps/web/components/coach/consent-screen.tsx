"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Eye,
  Lock,
  RotateCcw,
  UserCheck,
  Building,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { acceptCoachConsentAction } from "@/lib/coach/coach-actions";
import type { CoachInvitation } from "@/lib/coach/coach-types";

interface ConsentScreenProps {
  invitation: CoachInvitation;
}

export function ConsentScreen({ invitation }: ConsentScreenProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await acceptCoachConsentAction(invitation.invite_token);
      if (!res.success) {
        setError(res.error || "Failed to grant coach access.");
      } else {
        setAccepted(true);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = () => {
    setDeclined(true);
  };

  if (accepted) {
    return (
      <div className="card-luminous max-w-xl mx-auto p-6 sm:p-8 rounded-[12px] border border-emerald-500/20 bg-white dark:bg-[#090e1a] shadow-lg text-center space-y-4 animate-fade-in">
        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Coach Access Granted
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
          You have successfully connected with <strong>{invitation.coach_name}</strong>. They now have read-only visibility into your trading logs and behavioral analytics.
        </p>
        <div className="p-3 rounded-[6px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-xs text-slate-500 dark:text-slate-400 font-mono">
          You can revoke this access at any time with one click in Settings &gt; Coach Consent.
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/settings/coach"
            className="w-full sm:w-auto kiro-btn-cta !h-9 !px-4 text-xs font-semibold inline-flex items-center justify-center space-x-1.5"
          >
            <span>Manage Coach Consents</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto kiro-btn-outline !h-9 !px-4 text-xs font-semibold inline-flex items-center justify-center"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="card-luminous max-w-xl mx-auto p-6 sm:p-8 rounded-[12px] border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-lg text-center space-y-4 animate-fade-in">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-white/[0.05] text-slate-400 flex items-center justify-center">
          <XCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Invitation Declined
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          No data was shared. <strong>{invitation.coach_name}</strong> does not have access to any of your trading records or metrics.
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="kiro-btn-outline !h-9 !px-5 text-xs font-semibold inline-flex items-center"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card-luminous max-w-2xl mx-auto p-6 sm:p-8 rounded-[12px] border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-xl space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="space-y-2 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[5px] bg-blue-500/10 border border-blue-500/20 text-[#2b7fff] text-xs font-mono font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>AFFIRMATIVE DATA SHARING CONSENT</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Coach Mentorship Invitation
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          A trading coach has invited you to share your trade log and behavioral discipline metrics for mentoring.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-[6px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Coach Profile Card */}
      <div className="p-4 rounded-[8px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/15 text-[#2b7fff] flex items-center justify-center font-bold text-sm">
            {invitation.coach_name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-1.5">
              <span>{invitation.coach_name}</span>
              <UserCheck className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {invitation.coach_email}
            </div>
          </div>
        </div>

        {invitation.organization_name && (
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">
              Organization
            </span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-end space-x-1">
              <Building className="w-3 h-3 text-slate-400" />
              <span>{invitation.organization_name}</span>
            </span>
          </div>
        )}
      </div>

      {/* Permissions Breakdown: What Coach CAN See */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-1.5">
          <Eye className="w-4 h-4 text-[#2b7fff]" />
          <span>What your coach WILL be able to see</span>
        </h3>
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-start space-x-2 p-2.5 rounded-[6px] bg-emerald-500/[0.06] border border-emerald-500/15">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <strong>Read-only Closed Trade History:</strong> Symbols, entry/exit timestamps, quantity, executed prices, gross/net P&amp;L, and statutory charge breakdown.
            </div>
          </div>
          <div className="flex items-start space-x-2 p-2.5 rounded-[6px] bg-emerald-500/[0.06] border border-emerald-500/15">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <strong>Behavioral Leak Metrics:</strong> Revenge trading frequency, loss escalation tilt alerts, cooldown pauses, and Rulebook discipline scores.
            </div>
          </div>
          <div className="flex items-start space-x-2 p-2.5 rounded-[6px] bg-emerald-500/[0.06] border border-emerald-500/15">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <strong>Rule Suggestions:</strong> Coach can recommend tested guardrails into your Rulebook for your review and activation.
            </div>
          </div>
        </div>
      </div>

      {/* Negative Assurances: What Coach CANNOT Do */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-1.5">
          <Lock className="w-4 h-4 text-amber-500" />
          <span>Strict Security &amp; Privacy Assurances</span>
        </h3>
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-start space-x-2 p-2.5 rounded-[6px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06]">
            <XCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <strong>No Broker Execution:</strong> Coach has zero capability to place, cancel, or modify live market orders on your broker.
            </div>
          </div>
          <div className="flex items-start space-x-2 p-2.5 rounded-[6px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06]">
            <XCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <strong>No Credentials or Secrets:</strong> Coach never sees your broker API credentials, passwords, or personal banking info.
            </div>
          </div>
          <div className="flex items-start space-x-2 p-2.5 rounded-[6px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06]">
            <RotateCcw className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <strong>Instant Revocation Guarantee:</strong> You can terminate coach access at any time with one click in your settings. Access cuts off immediately.
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleDecline}
          disabled={isSubmitting}
          className="w-full sm:w-auto kiro-btn-outline !h-10 !px-5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400"
        >
          Decline Invitation
        </button>
        <button
          type="button"
          onClick={handleAccept}
          disabled={isSubmitting}
          className="w-full sm:w-auto kiro-btn-cta !h-10 !px-6 text-xs font-bold inline-flex items-center justify-center space-x-2 shadow-[0_0_18px_rgba(43,127,255,0.45)] disabled:opacity-60"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isSubmitting ? "Establishing Consent..." : "Accept & Grant Read-Only Access"}</span>
        </button>
      </div>
    </div>
  );
}
