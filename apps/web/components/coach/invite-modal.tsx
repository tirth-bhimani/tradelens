"use client";

import React, { useState } from "react";
import {
  X,
  UserPlus,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { createCoachInviteAction } from "@/lib/coach/coach-actions";
import type { CoachInvitation } from "@/lib/coach/coach-types";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteCreated?: (invite: CoachInvitation) => void;
}

export function InviteModal({ isOpen, onClose, onInviteCreated }: InviteModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<CoachInvitation | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiresDays, setExpiresDays] = useState(7);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await createCoachInviteAction({ expires_in_days: expiresDays });
      if (res.error || !res.invite) {
        setError(res.error || "Failed to generate invite.");
      } else {
        setCreatedInvite(res.invite);
        if (onInviteCreated) onInviteCreated(res.invite);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getFullInviteUrl = () => {
    if (!createdInvite) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://tradelens.app";
    return `${origin}/coach/consent?token=${createdInvite.invite_token}`;
  };

  const handleCopy = () => {
    const url = getFullInviteUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="card-luminous relative w-full max-w-lg rounded-[10px] border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-blue-500/10 text-[#2b7fff] flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 id="invite-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                Invite Student Trader
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate an affirmative consent link for a mentee
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[5px] text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-4">
          {error && (
            <div className="p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!createdInvite ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-[8px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <div className="flex items-center space-x-1.5 font-semibold text-slate-900 dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-[#2b7fff]" />
                  <span>Zero-Trust Trader Data Consent</span>
                </div>
                <p className="leading-relaxed">
                  Students retain 100% data sovereignty. They must explicitly review and accept read-only access to their trade logs and behavioral leaks before any metrics become visible to you.
                </p>
              </div>

              <div>
                <label htmlFor="expiry-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Link Expiration Window
                </label>
                <select
                  id="expiry-select"
                  value={expiresDays}
                  onChange={(e) => setExpiresDays(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-[6px] border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#0c1322] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#2b7fff]"
                >
                  <option value={1}>24 hours</option>
                  <option value={7}>7 days (Standard)</option>
                  <option value={30}>30 days</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full kiro-btn-cta !h-10 text-xs font-bold flex items-center justify-center space-x-2 shadow-[0_0_18px_rgba(43,127,255,0.45)] disabled:opacity-60"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isGenerating ? "Generating Secure Link..." : "Generate Consent Link"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-[8px] bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>Invite link generated successfully! Share it with your student.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Unique Consent URL
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={getFullInviteUrl()}
                    className="flex-1 h-9 px-3 rounded-[6px] border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#0c1322] text-xs font-mono text-slate-800 dark:text-slate-200 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="kiro-btn-cta !h-9 !px-3 text-xs font-semibold flex items-center space-x-1.5"
                    title="Copy Link"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-[6px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    Invite Code
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                    {createdInvite.invite_code}
                  </span>
                </div>
                <div className="p-2.5 rounded-[6px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    Expires In
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{expiresDays} Days</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setCreatedInvite(null)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                >
                  Generate another link
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="kiro-btn-outline !h-8 !px-4 text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
