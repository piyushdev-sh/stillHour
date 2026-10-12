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

  return {
    sessionId,
    subjectId,
    subjectName,
    taskId,
    taskTitle,
    plannedDurationSeconds,
    startTimestamp: startTimeMs,
    targetEndTimestamp,
    pauses: [], // Array of { pausedAt: number, resumedAt: number | null }
    currentPauseStart: null,
    status: 'running', // 'running' | 'paused' | 'completed' | 'idle'
    lastTickTimestamp: startTimeMs,
    isSaved: false,
    date: new Date(startTimeMs).toISOString().slice(0, 10),
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
 * Transitions timer into 'paused' state
 */
export function pauseTimerState(timerState, nowMs = Date.now()) {
  if (!timerState || timerState.status !== 'running') return timerState;

  const updatedPauses = [
    ...(timerState.pauses || []),
    { pausedAt: nowMs, resumedAt: null },
  ];

  return {
    ...timerState,
    status: 'paused',
    currentPauseStart: nowMs,
    lastTickTimestamp: nowMs,
    pauses: updatedPauses,
  };
}

/**
 * Resumes a paused timer, pushing targetEndTimestamp forward by pause duration
 */
export function resumeTimerState(timerState, nowMs = Date.now()) {
  if (!timerState || timerState.status !== 'paused' || !timerState.currentPauseStart) {
    return timerState;
  }

  const pauseDurationMs = Math.max(0, nowMs - timerState.currentPauseStart);
  const updatedTargetEnd = timerState.targetEndTimestamp + pauseDurationMs;

  const updatedPauses = (timerState.pauses || []).map((p, idx, arr) => {
    if (idx === arr.length - 1 && p.resumedAt === null) {
      return { ...p, resumedAt: nowMs };
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
 * Finalizes session record for saving to IndexedDB / state
 */
export function finalizeSessionRecord(timerState, nowMs = Date.now()) {
  if (!timerState) return null;

  const actualDurationSeconds = Math.min(
    timerState.plannedDurationSeconds,
    getElapsedStudySeconds(timerState, nowMs)
  );

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
    endTimestamp: nowMs,
    pauses: timerState.pauses || [],
    date: timerState.date || new Date(nowMs).toISOString().slice(0, 10),
    completed: true,
    savedAt: new Date(nowMs).toISOString(),
    isEligible: actualDurationSeconds >= 60,
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
