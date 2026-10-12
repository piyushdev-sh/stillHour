/**
 * Planning & Consistency Engine for stillhour
 * Implements target calculations, historical immutability, rest-day streak exemptions,
 * task single-counting, and carry-forward flows.
 */

import { isEligibleStudySession } from '../utils/timeUtils';

/**
 * Calculates total daily target in minutes from subject targets.
 * @param {Array} subjects
 * @returns {number} target in minutes
 */
export function calculateDailyTargetFromSubjects(subjects = []) {
  const activeSubjects = subjects.filter((s) => !s.archived);
  return activeSubjects.reduce((acc, s) => acc + (Number(s.dailyTargetMinutes) || 0), 0);
}

/**
 * Retrieves the effective target plan for a given date.
 * Per specification: "Target changes in future must not rewrite the original target saved for past dates."
 * @param {string} dateStr - YYYY-MM-DD
 * @param {Array} currentSubjects
 * @param {Object} historicalSnapshots - Map of dateStr -> { totalTargetMinutes, subjectTargets }
 * @returns {{ totalTargetMinutes: number, isSnapshot: boolean }}
 */
export function getTargetForDate(dateStr, currentSubjects = [], historicalSnapshots = {}) {
  if (historicalSnapshots && historicalSnapshots[dateStr]) {
    return {
      totalTargetMinutes: historicalSnapshots[dateStr].totalTargetMinutes,
      subjectTargets: historicalSnapshots[dateStr].subjectTargets || {},
      isSnapshot: true,
    };
  }

  // Fallback to current subject targets for today/future dates
  const currentTotal = calculateDailyTargetFromSubjects(currentSubjects);
  const subjectTargets = {};
  for (const s of currentSubjects) {
    if (!s.archived) {
      subjectTargets[s.id] = s.dailyTargetMinutes || 0;
    }
  }

  return {
    totalTargetMinutes: currentTotal || 120, // default 2h if subjects lack targets
    subjectTargets,
    isSnapshot: false,
  };
}

/**
 * Computes study statistics for a specific date with strict single-counting.
 * Per specification: "A task-linked session contributes once to total study time and subject time; do not double-count it."
 * Also excludes sessions shorter than 60 seconds.
 */
export function calculateDailyStudyStats(sessions = [], targetMinutes = 120, dateStr) {
  const dateSessions = dateStr ? sessions.filter((s) => s.date === dateStr) : sessions;
  const eligibleSessions = dateSessions.filter((s) => isEligibleStudySession(s.durationSeconds));

  // Compute total duration without double counting (each session counted exactly once)
  const totalStudiedMinutes = eligibleSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const totalStudiedSeconds = eligibleSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);

  // Subject-wise breakdown
  const subjectStats = {};
  for (const sess of eligibleSessions) {
    if (!subjectStats[sess.subjectId]) {
      subjectStats[sess.subjectId] = {
        subjectId: sess.subjectId,
        subjectName: sess.subjectName,
        minutes: 0,
        seconds: 0,
        sessionCount: 0,
      };
    }
    subjectStats[sess.subjectId].minutes += sess.durationMinutes || 0;
    subjectStats[sess.subjectId].seconds += sess.durationSeconds || 0;
    subjectStats[sess.subjectId].sessionCount += 1;
  }

  const completionPercent = targetMinutes > 0
    ? Math.min(100, Math.round((totalStudiedMinutes / targetMinutes) * 100))
    : 0;

  // Clear met / missed state
  const isMet = totalStudiedMinutes >= targetMinutes && targetMinutes > 0;

  return {
    totalStudiedMinutes,
    totalStudiedSeconds,
    targetMinutes,
    completionPercent,
    isMet,
    subjectStats,
    eligibleSessionCount: eligibleSessions.length,
    rawSessionCount: dateSessions.length,
  };
}

/**
 * Calculates consistency streak, strictly exempting planned rest days.
 * Per specification: "Planned rest days are set in advance and excluded from consistency expectations."
 * @param {Array<string>} datesArray - Array of dates in descending order (today down to past)
 * @param {Object} sessionsByDate - Map of dateStr -> Array<session>
 * @param {Array<string>} restDaysOfWeek - e.g. ['Sunday']
 * @param {Array<string>} specificRestDates - e.g. ['2026-10-11']
 * @param {number} dailyTargetMinutes
 * @returns {number} streak in days
 */
export function calculateConsistencyStreak({
  recentDates = [],
  sessionsByDate = {},
  restDaysOfWeek = ['Sunday'],
  specificRestDates = [],
  dailyTargetMinutes = 60,
}) {
  let streak = 0;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const dateStr of recentDates) {
    const dateObj = new Date(dateStr);
    const dayName = dayNames[dateObj.getDay()];

    const isPlannedRestDay =
      restDaysOfWeek.includes(dayName) || specificRestDates.includes(dateStr);

    const dateSessions = sessionsByDate[dateStr] || [];
    const validMinutes = dateSessions
      .filter((s) => isEligibleStudySession(s.durationSeconds))
      .reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

    const metTarget = validMinutes >= dailyTargetMinutes;

    if (metTarget) {
      streak += 1;
    } else if (isPlannedRestDay) {
      // Planned rest day does not break streak!
      continue;
    } else {
      // Missed non-rest day breaks streak
      break;
    }
  }

  return streak;
}

/**
 * Identifies unfinished tasks from previous dates that are eligible to carry forward into today.
 * @param {Array} tasks
 * @param {string} todayDateStr
 * @returns {Array} unfinished tasks from past dates
 */
export function getUnfinishedTasksForCarryForward(tasks = [], todayDateStr) {
  return tasks.filter((t) => {
    return !t.completed && t.carryForward && t.date && t.date < todayDateStr;
  });
}
