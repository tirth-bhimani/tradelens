"use client";

import React, { useState } from "react";
import { NotificationPreferences } from "@/lib/reports/report-types";
import { updateNotificationPreferencesAction } from "@/lib/reports/report-actions";
import { Mail, CheckCircle2, AlertCircle, Loader2, Bell } from "lucide-react";

interface NotificationSettingsFormProps {
  initialPreferences: NotificationPreferences;
}

export function NotificationSettingsForm({ initialPreferences }: NotificationSettingsFormProps) {
  const [weeklyEmail, setWeeklyEmail] = useState(initialPreferences.weekly_email_enabled);
  const [emailAddress, setEmailAddress] = useState(
    initialPreferences.email_notifications_email || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await updateNotificationPreferencesAction({
        weekly_email_enabled: weeklyEmail,
        email_notifications_email: emailAddress || null,
      });

      if (res.success) {
        setMessage({ type: "success", text: "Notification preferences updated successfully." });
      } else {
        setMessage({ type: "error", text: res.error || "Failed to update preferences." });
      }
    } catch {
      setMessage({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="card-luminous p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1222] shadow-sm max-w-2xl space-y-6">
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Weekly Report &amp; Digest Notifications
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Control automated email digests and scheduled performance audits.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Weekly Digest Email Toggle */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <label
              htmlFor="weekly_email_toggle"
              className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer"
            >
              Weekly Performance Digest Email
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Receive a comprehensive email every Sunday evening containing your weekly net P&amp;L,
              rule adherence score, top leak diagnosis, and actionable focus items.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              id="weekly_email_toggle"
              type="checkbox"
              checked={weeklyEmail}
              onChange={(e) => setWeeklyEmail(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {/* Email Destination Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Digest Delivery Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="trader@example.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Defaults to your account registration email if left unchanged.
          </p>
        </div>

        {/* Feedback message */}
        {message && (
          <div
            className={`p-3 rounded-lg text-xs font-medium flex items-center space-x-2 ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Submit */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="kiro-btn-primary !h-9 !px-5 text-xs font-semibold inline-flex items-center space-x-1.5"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}
