/**
 * Timer Engine for stillhour
 * Implements timestamp-backed duration recording, pause interval subtraction,
 * safe crash recovery, and duplicate save prevention.
 */

export function createNewTimerSession({
  subjectId,
  subjectName,
  taskId = null,
  taskTitle = null,
  durationMinutes = 25,
  startTimeMs = Date.now(),
}) {
  if (!subjectId) {
    throw new Error('A session requires a subject.');
  }

  const plannedDurationSeconds = Math.max(60, Math.floor(durationMinutes * 60));
  const targetEndTimestamp = startTimeMs + plannedDurationSeconds * 1000;
  const sessionId = `sess_${startTimeMs}_${Math.random().toString(36).slice(2, 8)}`;
  const startISO = new Date(startTimeMs).toISOString();

  return {
    sessionId,
    subjectId,
    subjectName,
    taskId,
    taskTitle,
    plannedDurationSeconds,
    startTimestamp: startTimeMs,
    startTimestampISO: startISO,
    targetEndTimestamp,
    pauses: [], // Array of { pausedAt: number, pausedAtISO: string, resumedAt: number | null, resumedAtISO: string | null }
    currentPauseStart: null,
    status: 'running', // 'running' | 'paused' | 'completed' | 'idle'
    lastTickTimestamp: startTimeMs,
    isSaved: false,
    date: startISO.slice(0, 10),
    recoveryEvents: [],
    completionReason: null,
    createdAt: startISO,
    updatedAt: startISO,
  };
}

/**
 * Calculates remaining seconds in countdown mode
 */
export function getRemainingSeconds(timerState, nowMs = Date.now()) {
  if (!timerState || timerState.status === 'idle') return 0;
  if (timerState.status === 'completed') return 0;

  if (timerState.status === 'paused' && timerState.currentPauseStart) {
    // If paused, clock is frozen at the moment pause began
    const msLeft = timerState.targetEndTimestamp - timerState.currentPauseStart;
    return Math.max(0, Math.ceil(msLeft / 1000));
  }

  // Running
  const msLeft = timerState.targetEndTimestamp - nowMs;
  return Math.max(0, Math.ceil(msLeft / 1000));
}

/**
 * Calculates net elapsed study time in seconds (strictly excluding pauses)
 */
export function getElapsedStudySeconds(timerState, nowMs = Date.now()) {
  if (!timerState || !timerState.startTimestamp) return 0;

  const effectiveEndMs =
    timerState.status === 'paused' && timerState.currentPauseStart
      ? timerState.currentPauseStart
      : timerState.status === 'completed'
      ? timerState.targetEndTimestamp
      : nowMs;

  let totalPauseMs = 0;
  for (const interval of timerState.pauses || []) {
    const pStart = interval.pausedAt;
    const pEnd = interval.resumedAt || (timerState.status === 'paused' ? effectiveEndMs : interval.pausedAt);
    if (pEnd > pStart) {
      totalPauseMs += (pEnd - pStart);
    }
  }

  const grossElapsedMs = Math.max(0, effectiveEndMs - timerState.startTimestamp);
  const netElapsedMs = Math.max(0, grossElapsedMs - totalPauseMs);
  return Math.floor(netElapsedMs / 1000);
}

/**
 * Strictly calculates net elapsed study time in seconds from timestamps and pause intervals.
 * Excludes all pause durations from focused study time.
 */
export function calculateNetStudySeconds(startTimestamp, endTimestamp, pauses = [], plannedDurationSeconds = Infinity) {
  if (!startTimestamp || !endTimestamp || endTimestamp <= startTimestamp) return 0;

  let totalPauseMs = 0;
  for (const interval of pauses) {
    const pStart = interval.pausedAt;
    const pEnd = interval.resumedAt || endTimestamp;
    if (pEnd > pStart) {
      // Clip pause interval to [startTimestamp, endTimestamp]
      const effectiveStart = Math.max(startTimestamp, pStart);
      const effectiveEnd = Math.min(endTimestamp, pEnd);
      if (effectiveEnd > effectiveStart) {
        totalPauseMs += (effectiveEnd - effectiveStart);
      }
    }
  }

  const grossElapsedMs = Math.max(0, endTimestamp - startTimestamp);
  const netElapsedMs = Math.max(0, grossElapsedMs - totalPauseMs);
  const calculatedSeconds = Math.floor(netElapsedMs / 1000);

  return Math.min(plannedDurationSeconds, calculatedSeconds);
}

/**
 * Transitions timer into 'paused' state
 */
export function pauseTimerState(timerState, nowMs = Date.now()) {
  if (!timerState || timerState.status !== 'running') return timerState;

  const nowISO = new Date(nowMs).toISOString();
  const updatedPauses = [
    ...(timerState.pauses || []),
    { pausedAt: nowMs, pausedAtISO: nowISO, resumedAt: null, resumedAtISO: null },
  ];

  return {
    ...timerState,
    status: 'paused',
    currentPauseStart: nowMs,
    lastTickTimestamp: nowMs,
    pauses: updatedPauses,
    updatedAt: nowISO,
  };
}

/**
 * Resumes a paused timer, pushing targetEndTimestamp forward by pause duration
 */
export function resumeTimerState(timerState, nowMs = Date.now()) {
  if (!timerState || timerState.status !== 'paused' || !timerState.currentPauseStart) {
    return timerState;
  }

  const nowISO = new Date(nowMs).toISOString();
  const pauseDurationMs = Math.max(0, nowMs - timerState.currentPauseStart);
  const updatedTargetEnd = timerState.targetEndTimestamp + pauseDurationMs;

  const updatedPauses = (timerState.pauses || []).map((p, idx, arr) => {
    if (idx === arr.length - 1 && p.resumedAt === null) {
      return {
        ...p,
        resumedAt: nowMs,
        resumedAtISO: nowISO,
      };
    }
    return p;
  });

  return {
    ...timerState,
    status: 'running',
    targetEndTimestamp: updatedTargetEnd,
    currentPauseStart: null,
    lastTickTimestamp: nowMs,
    pauses: updatedPauses,
    updatedAt: nowISO,
  };
}

/**
 * Updates lastTickTimestamp during active tick
 */
export function tickTimerState(timerState, nowMs = Date.now()) {
  if (!timerState || timerState.status !== 'running') return timerState;

  const remaining = getRemainingSeconds(timerState, nowMs);
  if (remaining <= 0) {
    return {
      ...timerState,
      status: 'completed',
      lastTickTimestamp: nowMs,
    };
  }

  return {
    ...timerState,
    lastTickTimestamp: nowMs,
  };
}

/**
 * Finalizes session record for saving to data store with comprehensive audit trail.
 */
export function finalizeSessionRecord(timerState, nowMs = Date.now(), reason = null) {
  if (!timerState) return null;

  const endMs =
    timerState.status === 'paused' && timerState.currentPauseStart
      ? timerState.currentPauseStart
      : timerState.status === 'completed'
      ? Math.min(nowMs, timerState.targetEndTimestamp)
      : nowMs;

  const nowISO = new Date(nowMs).toISOString();
  const startISO = timerState.startTimestampISO || new Date(timerState.startTimestamp).toISOString();
  const endISO = new Date(endMs).toISOString();

  // Normalize pauses to ensure ISO strings exist for auditable records
  const normalizedPauses = (timerState.pauses || []).map((p) => ({
    pausedAt: p.pausedAt,
    pausedAtISO: p.pausedAtISO || new Date(p.pausedAt).toISOString(),
    resumedAt: p.resumedAt || (timerState.status === 'paused' ? endMs : p.pausedAt),
    resumedAtISO: p.resumedAtISO || (p.resumedAt ? new Date(p.resumedAt).toISOString() : endISO),
  }));

  const actualDurationSeconds = calculateNetStudySeconds(
    timerState.startTimestamp,
    endMs,
    normalizedPauses,
    timerState.plannedDurationSeconds
  );

  const determinedReason =
    reason ||
    timerState.completionReason ||
    (timerState.status === 'completed' || nowMs >= timerState.targetEndTimestamp
      ? 'timer_completed'
      : 'manual_stop');

  return {
    id: timerState.sessionId,
    subjectId: timerState.subjectId,
    subjectName: timerState.subjectName,
    taskId: timerState.taskId || null,
    taskTitle: timerState.taskTitle || null,
    plannedDurationSeconds: timerState.plannedDurationSeconds,
    durationSeconds: actualDurationSeconds,
    durationMinutes: Math.round(actualDurationSeconds / 60),
    startTimestamp: timerState.startTimestamp,
    startTimestampISO: startISO,
    endTimestamp: endMs,
    endTimestampISO: endISO,
    pauses: normalizedPauses,
    recoveryEvents: timerState.recoveryEvents || [],
    completionReason: determinedReason,
    notes: timerState.notes || '',
    date: timerState.date || startISO.slice(0, 10),
    completed: true,
    isEligible: actualDurationSeconds >= 60,
    createdAt: timerState.createdAt || startISO,
    savedAt: nowISO,
  };
}

/**
 * Evaluates whether restored timer state requires crash/sleep recovery confirmation.
 * Per spec: "After unexpected closure/restart, restore the last known timer state
 * and ask whether to resume or discard the unconfirmed interval. Never silently invent elapsed study time."
 */
export function checkRecoveryNeeded(savedState, nowMs = Date.now(), thresholdMs = 15000) {
  if (!savedState || savedState.status !== 'running') {
    return { needsRecovery: false };
  }

  const gapMs = nowMs - (savedState.lastTickTimestamp || savedState.startTimestamp);
  if (gapMs > thresholdMs) {
    return {
      needsRecovery: true,
      gapSeconds: Math.floor(gapMs / 1000),
      lastTickTimestamp: savedState.lastTickTimestamp,
      state: savedState,
    };
  }

  return { needsRecovery: false };
}
