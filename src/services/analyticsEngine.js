/**
 * Analytics Engine for stillhour
 * Implements period aggregation, trend calculation, subject distribution,
 * overstudied/understudied heuristics, completion projections, and heatmap generation.
 */

import { isEligibleStudySession } from '../utils/timeUtils';

/**
 * Filters sessions by date range and eligibility
 */
export function filterSessionsByRange(sessions = [], startDateStr, endDateStr) {
  return sessions.filter((s) => {
    if (!isEligibleStudySession(s.durationSeconds)) return false;
    if (startDateStr && s.date < startDateStr) return false;
    if (endDateStr && s.date > endDateStr) return false;
    return true;
  });
}

/**
 * Calculates planned versus actual study time for a list of subjects and filtered sessions.
 */
export function calculatePlannedVsActual(subjects = [], sessions = [], daysInPeriod = 7) {
  const subjectBreakdown = subjects.map((sub) => {
    const subSessions = sessions.filter((s) => s.subjectId === sub.id && isEligibleStudySession(s.durationSeconds));
    const actualMinutes = subSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    const plannedDailyMinutes = Number(sub.dailyTargetMinutes) || 0;
    const plannedPeriodMinutes = plannedDailyMinutes * daysInPeriod;

    const ratio = plannedPeriodMinutes > 0 ? actualMinutes / plannedPeriodMinutes : 1;
    let balanceStatus = 'on_track';
    if (actualMinutes < plannedPeriodMinutes * 0.5) {
      balanceStatus = 'understudied';
    } else if (actualMinutes > plannedPeriodMinutes * 1.5 && plannedPeriodMinutes > 0) {
      balanceStatus = 'overstudied';
    }

    return {
      subjectId: sub.id,
      name: sub.name,
      priority: sub.priority || 'medium',
      actualMinutes,
      plannedPeriodMinutes,
      ratio,
      balanceStatus, // 'understudied' | 'on_track' | 'overstudied'
      sessionCount: subSessions.length,
    };
  });

  const totalActualMinutes = subjectBreakdown.reduce((acc, s) => acc + s.actualMinutes, 0);
  const totalPlannedMinutes = subjectBreakdown.reduce((acc, s) => acc + s.plannedPeriodMinutes, 0);

  return {
    subjects: subjectBreakdown,
    totalActualMinutes,
    totalPlannedMinutes,
    overallRatio: totalPlannedMinutes > 0 ? Math.round((totalActualMinutes / totalPlannedMinutes) * 100) : 0,
  };
}

/**
 * Generates Weekly Summary comparing current week vs previous week
 */
export function generateWeeklySummary({
  currentWeekSessions = [],
  previousWeekSessions = [],
  subjects = [],
}) {
  const currentMinutes = currentWeekSessions
    .filter((s) => isEligibleStudySession(s.durationSeconds))
    .reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

  const prevMinutes = previousWeekSessions
    .filter((s) => isEligibleStudySession(s.durationSeconds))
    .reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

  const deltaMinutes = currentMinutes - prevMinutes;
  const deltaPercent = prevMinutes > 0
    ? Math.round(((currentMinutes - prevMinutes) / prevMinutes) * 100)
    : currentMinutes > 0 ? 100 : 0;

  // Rank subjects by study time in current week
  const subjectTimeMap = {};
  for (const s of currentWeekSessions) {
    if (isEligibleStudySession(s.durationSeconds)) {
      subjectTimeMap[s.subjectId] = (subjectTimeMap[s.subjectId] || 0) + (s.durationMinutes || 0);
    }
  }

  const rankedSubjects = Object.entries(subjectTimeMap)
    .map(([subId, mins]) => {
      const sub = subjects.find((subj) => subj.id === subId);
      return {
        id: subId,
        name: sub ? sub.name : 'Unknown',
        minutes: mins,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);

  return {
    currentWeekHours: Number((currentMinutes / 60).toFixed(1)),
    prevWeekHours: Number((prevMinutes / 60).toFixed(1)),
    deltaMinutes,
    deltaPercent,
    isIncrease: deltaMinutes >= 0,
    mostStudiedSubjects: rankedSubjects.slice(0, 3),
  };
}

/**
 * Computes estimated target completion projections based on recent rolling daily average.
 * Labels clearly as estimates, not guarantees.
 */
export function calculateTargetProjections({
  subject,
  currentStudiedMinutes = 0,
  goalTotalMinutes = 1800, // e.g. 30 hours
  recentSessions = [],
  windowDays = 7,
}) {
  const validRecentMinutes = recentSessions
    .filter((s) => s.subjectId === subject.id && isEligibleStudySession(s.durationSeconds))
    .reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

  const dailyVelocityMinutes = windowDays > 0 ? validRecentMinutes / windowDays : 0;
  const remainingMinutes = Math.max(0, goalTotalMinutes - currentStudiedMinutes);

  if (remainingMinutes === 0) {
    return {
      status: 'completed',
      daysRemaining: 0,
      dailyVelocityMinutes: Math.round(dailyVelocityMinutes),
      projectedDate: null,
      disclaimer: 'Goal already reached.',
    };
  }

  if (dailyVelocityMinutes <= 0) {
    return {
      status: 'insufficient_data',
      daysRemaining: null,
      dailyVelocityMinutes: 0,
      projectedDate: null,
      disclaimer: 'Pacing estimate requires at least one completed study block in the past 7 days.',
    };
  }

  const daysNeeded = Math.ceil(remainingMinutes / dailyVelocityMinutes);
  const projected = new Date();
  projected.setDate(projected.getDate() + daysNeeded);

  return {
    status: 'projected',
    daysRemaining: daysNeeded,
    dailyVelocityMinutes: Math.round(dailyVelocityMinutes),
    projectedDate: projected.toISOString().slice(0, 10),
    disclaimer: 'Estimated projection based on recent 7-day pace (estimate only, not a guarantee).',
  };
}

/**
 * Generates 16-week matrix for calendar consistency heatmap.
 * Maps dates to intensity levels (0 = none, 1 = light, 2 = moderate, 3 = high, 4 = intense).
 */
export function generateHeatmapGrid(sessions = [], weeksCount = 16, plannedRestDates = []) {
  const daysTotal = weeksCount * 7;
  const today = new Date();
  const cells = [];

  // Index sessions by date
  const minutesByDate = {};
  for (const s of sessions) {
    if (isEligibleStudySession(s.durationSeconds)) {
      minutesByDate[s.date] = (minutesByDate[s.date] || 0) + (s.durationMinutes || 0);
    }
  }

  for (let i = daysTotal - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const minutes = minutesByDate[dateStr] || 0;
    const isRest = plannedRestDates.includes(dateStr) || d.getDay() === 0;

    let intensity = 0;
    if (minutes >= 120) intensity = 4;
    else if (minutes >= 60) intensity = 3;
    else if (minutes >= 30) intensity = 2;
    else if (minutes > 0) intensity = 1;

    cells.push({
      date: dateStr,
      dayOfWeek: d.getDay(),
      minutes,
      intensity,
      isRest,
    });
  }

  return cells;
}
