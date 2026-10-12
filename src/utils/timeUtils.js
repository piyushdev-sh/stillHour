/**
 * Time utility functions for stillhour study tracker
 */

/**
 * Formats a duration in seconds into MM:SS format
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatSecondsToTimer(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Formats minutes into human-readable hours and minutes (e.g. "2h 15m" or "45m")
 * @param {number} minutes
 * @returns {string}
 */
export function formatMinutesToHuman(minutes) {
  const safeMins = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safeMins / 60);
  const remainingMins = safeMins % 60;
  if (hours === 0) return `${remainingMins}m`;
  return `${hours}h ${remainingMins}m`;
}

/**
 * Calculates net study duration in seconds from start time, end time, and pause intervals.
 * Pause intervals: array of { pausedAt, resumedAt }
 * @param {number} startMs - Epoch timestamp in ms
 * @param {number} endMs - Epoch timestamp in ms
 * @param {Array<{ pausedAt: number, resumedAt: number }>} pauses
 * @returns {number} Net duration in seconds (integer)
 */
export function calculateNetStudyDurationSeconds(startMs, endMs, pauses = []) {
  if (!startMs || !endMs || endMs < startMs) return 0;

  let totalPauseMs = 0;
  for (const interval of pauses) {
    if (interval.pausedAt && interval.resumedAt) {
      const pStart = Math.max(startMs, interval.pausedAt);
      const pEnd = Math.min(endMs, interval.resumedAt);
      if (pEnd > pStart) {
        totalPauseMs += (pEnd - pStart);
      }
    }
  }

  const rawDurationMs = endMs - startMs;
  const netDurationMs = Math.max(0, rawDurationMs - totalPauseMs);
  return Math.floor(netDurationMs / 1000);
}

/**
 * Checks if a session is eligible to contribute to study totals.
 * Per specification: "Sessions shorter than 60 seconds remain in history but are excluded from study totals and target achievement."
 * @param {number} durationSeconds
 * @returns {boolean}
 */
export function isEligibleStudySession(durationSeconds) {
  return typeof durationSeconds === 'number' && durationSeconds >= 60;
}
