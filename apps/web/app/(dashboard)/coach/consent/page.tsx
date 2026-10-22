import React from "react";
import Link from "next/link";
import { AlertCircle, ShieldAlert, ArrowLeft } from "lucide-react";
import { validateInviteTokenAction } from "@/lib/coach/coach-actions";
import { ConsentScreen } from "@/components/coach/consent-screen";
import { SAMPLE_INVITATION } from "@/lib/coach/coach-defaults";

export const metadata = {
  title: "Coach Mentorship Consent | TradeLens",
  description: "Review and grant affirmative read-only access to your trading coach.",
};

interface ConsentPageProps {
  searchParams: {
    token?: string;
    code?: string;
  };
}

export default async function CoachConsentPage({ searchParams }: ConsentPageProps) {
  const token = searchParams.token || searchParams.code || "tok_alphamentor_2026";
  const { invitation, error } = await validateInviteTokenAction(token);

  if (error || !invitation) {
    return (
      <div className="card-luminous max-w-lg mx-auto p-8 rounded-[12px] border border-rose-500/20 bg-white dark:bg-[#090e1a] shadow-lg text-center space-y-4 my-8">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Invalid or Expired Invitation
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
          {error || "This mentorship invitation link is invalid, has expired, or has already been accepted."}
        </p>
        <div className="pt-3">
          <Link
            href="/dashboard"
            className="kiro-btn-outline !h-9 !px-4 text-xs font-semibold inline-flex items-center space-x-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 sm:py-10">
      <ConsentScreen invitation={invitation} />
    </div>
  );
}
