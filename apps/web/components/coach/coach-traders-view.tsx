"use client";

import React, { useState } from "react";
import { UserPlus, GraduationCap, ShieldCheck } from "lucide-react";
import { InviteModal } from "./invite-modal";
import { CohortStats } from "./cohort-stats";
import { TraderRiskTable } from "./trader-risk-table";
import { TraderDetailModal } from "./trader-detail-modal";
import type { StudentRosterItem, CoachInvitation, CohortAggregateStats } from "@/lib/coach/coach-types";

interface CoachTradersViewProps {
  initialRoster: StudentRosterItem[];
  initialStats: CohortAggregateStats;
}

export function CoachTradersView({ initialRoster, initialStats }: CoachTradersViewProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inspectTraderId, setInspectTraderId] = useState<string | null>(null);
  const [roster] = useState<StudentRosterItem[]>(initialRoster);
  const [stats] = useState<CohortAggregateStats>(initialStats);

  const handleInviteCreated = (invite: CoachInvitation) => {
    // Optionally trigger notification
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="card-luminous p-6 sm:p-7 relative overflow-hidden transition-colors border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-xs">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-3xl"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[5px] bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-mono font-medium">
              <GraduationCap className="w-3.5 h-3.5 text-[#2b7fff]" />
              <span>COACH &amp; MENTORSHIP ROSTER • TRAFFIC-LIGHT RISK SUPERVISION</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Student Cohort Dashboard
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Supervise mentee discipline, trade execution cadence, and behavioral leak patterns. Read-only permissions are enforced via database-level Row-Level Security with trader consent sovereignty.
            </p>
          </div>

          <div className="shrink-0 flex items-center space-x-2.5">
            <button
              type="button"
              onClick={() => setIsInviteOpen(true)}
              className="kiro-btn-cta !h-9 !px-4 text-xs font-bold inline-flex items-center space-x-1.5 shadow-[0_0_15px_-3px_rgba(43,127,255,0.4)]"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Student</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Aggregate Cohort KPI Cards */}
      <CohortStats stats={stats} />

      {/* 3. Traffic-Light Risk Grid Table */}
      <TraderRiskTable
        initialRoster={roster}
        onInviteClick={() => setIsInviteOpen(true)}
        onInspectTrader={(traderId) => setInspectTraderId(traderId)}
      />

      {/* 4. Deep Read-Only Trader Analytics Inspection Modal */}
      <TraderDetailModal
        traderId={inspectTraderId}
        onClose={() => setInspectTraderId(null)}
      />

      {/* 5. Student Invitation Generator Dialog */}
      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onInviteCreated={handleInviteCreated}
      />
    </div>
  );
}
