"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Clock, ShieldAlert, LogOut, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_IDLE_TIMEOUT_MINUTES,
  DEFAULT_WARNING_SECONDS,
  STORAGE_KEY_LAST_ACTIVITY,
  calculateRemainingIdleTime,
  shouldShowIdleWarning,
  formatCountdownTime,
} from "@/lib/auth/idle-timer";

export interface IdleSessionTimeoutProps {
  /** Inactivity timeout duration in minutes (default: 15) */
  timeoutMinutes?: number;
  /** Warning countdown window before logout in seconds (default: 60) */
  warningSeconds?: number;
}

export function IdleSessionTimeout({
  timeoutMinutes = DEFAULT_IDLE_TIMEOUT_MINUTES,
  warningSeconds = DEFAULT_WARNING_SECONDS,
}: IdleSessionTimeoutProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(warningSeconds);
  const [isLoggingOut, setIsLoggingOut] = useState(false);


  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = warningSeconds * 1000;

  const lastThrottleRef = useRef<number>(0);
  const isLoggingOutRef = useRef<boolean>(false);

  // Monitor auth state: only monitor inactivity if user has an active session
  useEffect(() => {
    let isMounted = true;
    setMounted(true);

    async function checkAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (isMounted) {
          setIsAuthenticated(!!session?.user);
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
        }
      }
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) {
        const authed = !!session?.user;
        setIsAuthenticated(authed);
        if (typeof window !== "undefined") {
          if (event === "SIGNED_IN") {
            localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, Date.now().toString());
          } else if (event === "SIGNED_OUT" || !authed) {
            localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);


  /**
   * Records user activity into localStorage (throttled to avoid performance overhead).
   */
  const recordActivity = useCallback(() => {
    if (typeof window === "undefined" || isLoggingOutRef.current || !isAuthenticated) return;

    const now = Date.now();
    // Throttle writes to once every 2 seconds
    if (now - lastThrottleRef.current > 2000) {
      lastThrottleRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, now.toString());
      } catch {
        // Safe fallback if storage quota exceeded or disabled
      }
      setShowWarning(false);
    }
  }, [isAuthenticated]);

  /**
   * Executes sign out and redirects to login with reason=timeout.
   */
  const handleLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setIsLoggingOut(true);

    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
      }
      // 1. Wipe server-side session cookies to prevent middleware from bouncing back to /dashboard
      await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
      // 2. Clear browser-side Supabase token
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Failed to sign out cleanly on idle timeout:", err);
    } finally {
      // 3. Redirect to login with reason parameter
      if (typeof window !== "undefined") {
        window.location.href = "/login?reason=timeout";
      } else {
        router.push("/login?reason=timeout");
      }
    }
  }, [supabase, router]);

  /**
   * Resets the inactivity timer when the user explicitly clicks "Stay Logged In".
   */
  const handleStayLoggedIn = useCallback(() => {
    const now = Date.now();
    lastThrottleRef.current = now;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, now.toString());
      } catch {
        // ignore
      }
    }
    setShowWarning(false);
    setSecondsRemaining(warningSeconds);
  }, [warningSeconds]);

  useEffect(() => {
    if (typeof window === "undefined" || !isAuthenticated) return;

    // Initialize or refresh current timestamp on active session mount
    const existing = localStorage.getItem(STORAGE_KEY_LAST_ACTIVITY);
    const lastActivity = existing ? parseInt(existing, 10) : 0;
    const now = Date.now();
    if (!lastActivity || isNaN(lastActivity) || (now - lastActivity >= timeoutMs)) {
      // If no valid timestamp or stale from past sessions, refresh to now
      localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, now.toString());
    }

    // Interactive events that reset the inactivity timer
    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "wheel",
    ];

    const handleUserInteraction = () => {
      recordActivity();
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserInteraction, { passive: true });
    });

    // Listen for storage changes from other browser tabs (cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_LAST_ACTIVITY && e.newValue) {
        setShowWarning(false);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Heartbeat check every 1 second
    const intervalId = setInterval(() => {
      if (isLoggingOutRef.current) return;

      const stored = localStorage.getItem(STORAGE_KEY_LAST_ACTIVITY);
      const activityTime = stored ? parseInt(stored, 10) : Date.now();
      const remainingMs = calculateRemainingIdleTime(activityTime, timeoutMs);

      if (remainingMs <= 0) {
        clearInterval(intervalId);
        handleLogout();
      } else if (shouldShowIdleWarning(activityTime, timeoutMs, warningMs)) {
        setShowWarning(true);
        setSecondsRemaining(Math.max(1, Math.ceil(remainingMs / 1000)));
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserInteraction);
      });
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(intervalId);
    };
  }, [isAuthenticated, recordActivity, handleLogout, timeoutMs, warningMs]);

  if (!mounted || !isAuthenticated || !showWarning) {
    return null;
  }


  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-timeout-title"
      aria-describedby="idle-timeout-desc"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md p-6 bg-white dark:bg-[#0f172a] rounded-[8px] border border-amber-300 dark:border-amber-700/80 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 rounded-[6px] bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h2 id="idle-timeout-title" className="text-base font-bold text-slate-900 dark:text-white">
              Inactivity Session Timeout
            </h2>
            <p id="idle-timeout-desc" className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              You have been inactive for a while. To protect your trading account, you will be automatically signed out in:
            </p>
          </div>
        </div>

        {/* Countdown Badge */}
        <div className="py-3 px-4 rounded-[6px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Time Remaining:</span>
          </span>
          <span className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2.5 py-0.5 rounded-[4px]">
            {formatCountdownTime(secondsRemaining)}
          </span>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Any activity (moving your mouse, typing, or clicking) will automatically reset the timer and keep your session active.
        </p>

        {/* Actions */}
        <div className="flex items-center space-x-3 pt-1">
          <button
            type="button"
            onClick={handleStayLoggedIn}
            disabled={isLoggingOut}
            className="flex-1 py-2.5 px-4 rounded-[4px] bg-[#387ed1] hover:bg-[#2b6ebf] text-white text-xs font-semibold shadow-sm transition flex items-center justify-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-[#387ed1]/50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Stay Logged In</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="py-2.5 px-3.5 rounded-[4px] border border-slate-300 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold transition flex items-center justify-center space-x-1.5 focus:outline-none cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isLoggingOut ? "Signing out..." : "Log Out"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
