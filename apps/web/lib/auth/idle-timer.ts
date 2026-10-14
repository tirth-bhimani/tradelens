/**
 * TradeLens Inactivity / Idle Session Timeout Utilities
 *
 * Provides deterministic calculation and formatting for user activity tracking,
 * idle timeout thresholds, and session expiration warnings.
 */

export const DEFAULT_IDLE_TIMEOUT_MINUTES = 15;
export const DEFAULT_WARNING_SECONDS = 60;
export const STORAGE_KEY_LAST_ACTIVITY = "tradelens_last_activity";

/**
 * Calculates remaining milliseconds before session idle timeout.
 */
export function calculateRemainingIdleTime(
  lastActivityTimestamp: number,
  timeoutMs: number,
  currentTime: number = Date.now()
): number {
  if (!lastActivityTimestamp || lastActivityTimestamp <= 0) {
    return timeoutMs;
  }
  const elapsed = currentTime - lastActivityTimestamp;
  return Math.max(0, timeoutMs - elapsed);
}

/**
 * Checks whether the user's idle duration has exceeded the timeout limit.
 */
export function isIdleExpired(
  lastActivityTimestamp: number,
  timeoutMs: number,
  currentTime: number = Date.now()
): boolean {
  if (!lastActivityTimestamp || lastActivityTimestamp <= 0) {
    return false;
  }
  return currentTime - lastActivityTimestamp >= timeoutMs;
}

/**
 * Determines whether the inactivity countdown warning should be displayed.
 */
export function shouldShowIdleWarning(
  lastActivityTimestamp: number,
  timeoutMs: number,
  warningMs: number,
  currentTime: number = Date.now()
): boolean {
  if (!lastActivityTimestamp || lastActivityTimestamp <= 0) {
    return false;
  }
  const remaining = calculateRemainingIdleTime(lastActivityTimestamp, timeoutMs, currentTime);
  return remaining > 0 && remaining <= warningMs;
}

/**
 * Formats a remaining seconds count into a friendly MM:SS or SSs format.
 */
export function formatCountdownTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
