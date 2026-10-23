"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, AlertTriangle, Loader2, X } from "lucide-react";
import { deleteAccountAction } from "@/lib/privacy/deletion-actions";

export function DeleteAccountDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmationInput.trim() === "DELETE MY ACCOUNT";

  const handleExecuteDelete = async () => {
    if (!isConfirmed || isDeleting) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await deleteAccountAction(confirmationInput);
      if (!res.success) {
        throw new Error(res.error || "Failed to delete account");
      }

      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        // Safe fallback
      }

      // Hard redirect to login page with deletion confirmation
      window.location.href = "/login?deleted=true";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account deletion failed");
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Danger Zone Container Card */}
      <div className="p-6 rounded-[8px] bg-rose-500/[0.03] border border-rose-500/20 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-500">
              <ShieldAlert className="w-4 h-4" />
              <span>Danger Zone (DPDP Act Sec 12(3))</span>
            </div>
            <h2 className="text-lg font-bold text-rose-600 dark:text-rose-400">
              Permanently Delete Account
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
              Permanently scrubs your profile, uploaded tradebook CSVs, round-trip trades,
              rulebook guardrails, and weekly reports across all databases and cloud storage buckets.
              This action is immediate and completely irreversible.
            </p>
          </div>

          <button
            onClick={() => {
              setConfirmationInput("");
              setError(null);
              setIsOpen(true);
            }}
            className="px-4 py-2.5 rounded-[6px] bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm transition shrink-0"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-[12px] bg-white dark:bg-[#0b101b] border border-rose-500/30 p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Confirm Permanent Erasure
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This action executes a zero-residue hard scrub of your account under the
              Digital Personal Data Protection Act, 2023. All your trading data and rulebook configurations will be permanently destroyed.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Type <span className="font-mono text-rose-500">DELETE MY ACCOUNT</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                disabled={isDeleting}
                className="w-full px-3 py-2 text-xs rounded-[6px] border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            {error && (
              <div className="p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-[6px] text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={!isConfirmed || isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[6px] bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Scrubbing Data...</span>
                  </>
                ) : (
                  <span>I Understand, Delete Everything</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
