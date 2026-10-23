"use client";

import React, { useState } from "react";
import { WeeklyReportSummary } from "@/lib/reports/report-types";
import { ReportCard } from "@/components/reports/report-card";
import { WeeklySummaryView } from "@/components/reports/weekly-summary-view";
import { FileText, Calendar, Sparkles } from "lucide-react";

interface ReportsClientPageProps {
  initialReports: WeeklyReportSummary[];
  initialLatest: WeeklyReportSummary | null;
}

export function ReportsClientPage({ initialReports, initialLatest }: ReportsClientPageProps) {
  const [reports, setReports] = useState<WeeklyReportSummary[]>(initialReports);
  const [selectedReport, setSelectedReport] = useState<WeeklyReportSummary | null>(
    initialLatest || initialReports[0] || null
  );

  const handleReportGenerated = (newReport: WeeklyReportSummary) => {
    setReports((prev) => [newReport, ...prev]);
    setSelectedReport(newReport);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner (Hidden in print) */}
      <div className="card-luminous p-6 sm:p-7 relative overflow-hidden transition-colors border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-sm print:hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 rounded-full bg-emerald-500/10 dark:bg-emerald-600/10 blur-3xl"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[5px] bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-mono font-medium">
              <FileText className="w-3.5 h-3.5 text-emerald-500" />
              <span>AUTOMATED PERFORMANCE AUDIT &amp; PDF EXPORT</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Weekly Reports &amp; Intelligence Digest
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Synthesizes execution data, statutory brokerage drag, rule adherence, and psychological tilt
              into actionable performance audits and high-resolution exportable PDFs.
            </p>
          </div>
        </div>
      </div>

      {/* Main Layout: Sidebar Archive List + Main Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Archive Weeks List (Hidden in print) */}
        <div className="lg:col-span-4 space-y-3 print:hidden">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Report Archive ({reports.length})
            </span>
          </div>

          <div className="space-y-2.5">
            {reports.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                No reports compiled yet.
              </div>
            ) : (
              reports.map((rep) => (
                <ReportCard
                  key={rep.id}
                  report={rep}
                  isSelected={selectedReport?.id === rep.id}
                  onSelect={(r) => setSelectedReport(r)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column: Active Weekly Report Viewer (Takes full width in print) */}
        <div className="lg:col-span-8 print:col-span-12">
          {selectedReport ? (
            <WeeklySummaryView
              report={selectedReport}
              onReportGenerated={handleReportGenerated}
            />
          ) : (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-slate-800 text-slate-400">
              Select a report from the archive to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
