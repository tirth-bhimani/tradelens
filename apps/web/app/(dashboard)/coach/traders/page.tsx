import React from "react";
import { getCoachRosterAction, getCohortStatsAction } from "@/lib/coach/coach-actions";
import { CoachTradersView } from "@/components/coach/coach-traders-view";

export const metadata = {
  title: "Student Cohort Dashboard | TradeLens Coach",
  description: "Monitor mentee discipline, trade execution cadence, and behavioral leak patterns.",
};

export default async function CoachTradersPage() {
  const [{ roster }, { stats }] = await Promise.all([
    getCoachRosterAction(),
    getCohortStatsAction(),
  ]);

  return <CoachTradersView initialRoster={roster} initialStats={stats} />;
}
