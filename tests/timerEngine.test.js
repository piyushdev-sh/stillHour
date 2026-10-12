import { describe, it, expect } from 'vitest';
import {
  createNewTimerSession,
  getRemainingSeconds,
  getElapsedStudySeconds,
  pauseTimerState,
  resumeTimerState,
  tickTimerState,
  finalizeSessionRecord,
  checkRecoveryNeeded,
} from '../src/services/timerEngine.js';

describe('Phase 2: Timer Engine & Spec Rules Compliance', () => {
  const mockStartTime = 1700000000000;

  it('enforces subject requirement and rejects session creation without subject', () => {
    expect(() => {
      createNewTimerSession({ subjectId: null, subjectName: null });
    }).toThrow('A session requires a subject.');
  });

  it('initializes timer session with correct targetEndTimestamp', () => {
    const session = createNewTimerSession({
      subjectId: 'sub_123',
      subjectName: 'Philosophy',
      durationMinutes: 25,
      startTimeMs: mockStartTime,
    });

    expect(session.status).toBe('running');
    expect(session.plannedDurationSeconds).toBe(1500); // 25 * 60
    expect(session.targetEndTimestamp).toBe(mockStartTime + 1500 * 1000);
    expect(session.isSaved).toBe(false);
  });

  it('accurately computes countdown and elapsed time while running', () => {
    const session = createNewTimerSession({
      subjectId: 'sub_123',
      subjectName: 'Philosophy',
      durationMinutes: 25,
      startTimeMs: mockStartTime,
    });

    // 5 minutes later (300 seconds)
    const fiveMinutesLater = mockStartTime + 300 * 1000;
    const remaining = getRemainingSeconds(session, fiveMinutesLater);
    const elapsed = getElapsedStudySeconds(session, fiveMinutesLater);

    expect(remaining).toBe(1200); // 1500 - 300
    expect(elapsed).toBe(300);
  });

  it('freezes countdown during pause and pushes targetEndTimestamp on resume', () => {
    let session = createNewTimerSession({
      subjectId: 'sub_123',
      subjectName: 'Philosophy',
      durationMinutes: 25,
      startTimeMs: mockStartTime,
    });

    // User studies for 5 minutes, then pauses
    const pauseTime = mockStartTime + 300 * 1000;
    session = pauseTimerState(session, pauseTime);
    expect(session.status).toBe('paused');
    expect(session.currentPauseStart).toBe(pauseTime);

    // 10 minutes pass during pause
    const tenMinutesInPause = pauseTime + 600 * 1000;
    // Countdown must remain frozen at 1200 seconds
    expect(getRemainingSeconds(session, tenMinutesInPause)).toBe(1200);
    // Elapsed study time must remain strictly 300 seconds
    expect(getElapsedStudySeconds(session, tenMinutesInPause)).toBe(300);

    // User resumes after 10 minutes pause
    session = resumeTimerState(session, tenMinutesInPause);
    expect(session.status).toBe('running');
    expect(session.currentPauseStart).toBe(null);
    // targetEndTimestamp must be pushed forward by 600 seconds
    expect(session.targetEndTimestamp).toBe(mockStartTime + (1500 + 600) * 1000);

    // Now user studies for another 5 minutes after resume
    const finalCheckTime = tenMinutesInPause + 300 * 1000;
    expect(getRemainingSeconds(session, finalCheckTime)).toBe(900); // 1200 - 300
    expect(getElapsedStudySeconds(session, finalCheckTime)).toBe(600); // 300 + 300
  });

  it('transitions to completed when countdown reaches zero without auto-restart', () => {
    const session = createNewTimerSession({
      subjectId: 'sub_123',
      subjectName: 'Philosophy',
      durationMinutes: 1, // 60s
      startTimeMs: mockStartTime,
    });

    const atZero = mockStartTime + 60 * 1000;
    const ticked = tickTimerState(session, atZero);
    expect(ticked.status).toBe('completed');
    expect(getRemainingSeconds(ticked, atZero)).toBe(0);
  });

  it('detects unexpected app closure and provides recovery metadata', () => {
    const session = createNewTimerSession({
      subjectId: 'sub_123',
      subjectName: 'Philosophy',
      durationMinutes: 25,
      startTimeMs: mockStartTime,
    });

    // App crashed / tab closed 2 minutes in; resumed 15 minutes later
    const lastTick = mockStartTime + 120 * 1000;
    session.lastTickTimestamp = lastTick;

    const resumeTime = mockStartTime + 900 * 1000; // 13 minutes gap
    const recovery = checkRecoveryNeeded(session, resumeTime, 15000);

    expect(recovery.needsRecovery).toBe(true);
    expect(recovery.gapSeconds).toBe(780); // 13 minutes = 780s
    expect(recovery.lastTickTimestamp).toBe(lastTick);
  });

  it('excludes sessions shorter than 60 seconds from totals in finalized record', () => {
    const session = createNewTimerSession({
      subjectId: 'sub_123',
      subjectName: 'Philosophy',
      durationMinutes: 25,
      startTimeMs: mockStartTime,
    });

    // User stopped after only 45 seconds
    const stopTime = mockStartTime + 45 * 1000;
    const finalized = finalizeSessionRecord(session, stopTime);

    expect(finalized.durationSeconds).toBe(45);
    expect(finalized.isEligible).toBe(false);
    expect(finalized.completed).toBe(true);
  });

  it('supports 2-hour (120 min) preset with accurate 7200s duration and countdown', () => {
    const session = createNewTimerSession({
      subjectId: 'sub_deep_work',
      subjectName: 'Deep Work & Analysis',
      durationMinutes: 120,
      startTimeMs: mockStartTime,
    });

    expect(session.plannedDurationSeconds).toBe(7200);
    expect(session.targetEndTimestamp).toBe(mockStartTime + 7200 * 1000);

    // 1 hour elapsed (3600 seconds)
    const oneHourLater = mockStartTime + 3600 * 1000;
    const remaining = getRemainingSeconds(session, oneHourLater);
    const elapsed = getElapsedStudySeconds(session, oneHourLater);

    expect(remaining).toBe(3600);
    expect(elapsed).toBe(3600);
  });
});
