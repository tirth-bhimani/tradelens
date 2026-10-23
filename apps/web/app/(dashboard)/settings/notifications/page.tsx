import React from "react";
import Link from "next/link";
import { Bell, ArrowLeft } from "lucide-react";
import { getNotificationPreferencesAction } from "@/lib/reports/report-actions";
import { NotificationSettingsForm } from "@/components/settings/notification-settings-form";

export const metadata = {
  title: "Notification Preferences | TradeLens Settings",
  description: "Configure automated weekly trading performance digest and email delivery preferences.",
};

export default async function NotificationSettingsPage() {
  const { preferences } = await getNotificationPreferencesAction();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-luminous p-6 sm:p-7 relative overflow-hidden transition-colors border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] shadow-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 rounded-full bg-emerald-500/10 dark:bg-emerald-600/10 blur-3xl"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[5px] bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-mono font-medium">
              <Bell className="w-3.5 h-3.5 text-emerald-500" />
              <span>COMMUNICATION &amp; DELIVERY PREFERENCES</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Notification Preferences
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Manage your delivery channels for weekly performance digests and behavioral leak alerts.
            </p>
          </div>

          <div className="shrink-0 flex items-center space-x-2.5">
            <Link
              href="/reports"
              className="kiro-btn-outline !h-9 !px-4 text-xs font-semibold inline-flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Back to Reports</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <NotificationSettingsForm initialPreferences={preferences} />
    </div>
  );
}
