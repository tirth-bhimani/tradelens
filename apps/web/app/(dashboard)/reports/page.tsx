import React from "react";
import { getWeeklyReportsAction } from "@/lib/reports/report-actions";
import { ReportsClientPage } from "./reports-client-page";

export const metadata = {
  title: "Weekly Performance Reports | TradeLens",
  description: "Automated weekly trading performance digest, rule adherence, behavioral leak diagnosis, and PDF export.",
};

export default async function ReportsPage() {
  const { reports, latest } = await getWeeklyReportsAction();

  return <ReportsClientPage initialReports={reports} initialLatest={latest} />;
}
