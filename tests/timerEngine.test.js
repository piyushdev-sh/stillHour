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
  calculateNetStudySeconds,
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

  it('strictly calculates net study seconds from timestamps excluding multiple pause intervals', () => {
    const startMs = 1700000000000;
    const endMs = startMs + 1800 * 1000; // 30 minutes total elapsed (1800s)

    // Pause 1: from minute 5 to 8 (3 minutes = 180s)
    // Pause 2: from minute 15 to 17 (2 minutes = 120s)
    // Total paused: 300s. Net study: 1800 - 300 = 1500s (25 minutes).
    const pauses = [
      { pausedAt: startMs + 300 * 1000, resumedAt: startMs + 480 * 1000 },
      { pausedAt: startMs + 900 * 1000, resumedAt: startMs + 1020 * 1000 },
    ];

    const netSeconds = calculateNetStudySeconds(startMs, endMs, pauses, 1800);
    expect(netSeconds).toBe(1500);
  });

  it('generates fully auditable session record with ISO 8601 strings and completion reason', () => {
    let session = createNewTimerSession({
      subjectId: 'sub_audit_test',
      subjectName: 'Advanced Algorithms',
      durationMinutes: 45,
      startTimeMs: mockStartTime,
    });

    // Verify session creation has ISO strings
    expect(session.startTimestampISO).toBe(new Date(mockStartTime).toISOString());
    expect(session.date).toBe(new Date(mockStartTime).toISOString().slice(0, 10));

    // Pause at minute 10
    const pauseMs = mockStartTime + 600 * 1000;
    session = pauseTimerState(session, pauseMs);
    expect(session.pauses[0].pausedAtISO).toBe(new Date(pauseMs).toISOString());

    // Resume at minute 12
    const resumeMs = mockStartTime + 720 * 1000;
    session = resumeTimerState(session, resumeMs);
    expect(session.pauses[0].resumedAtISO).toBe(new Date(resumeMs).toISOString());

    // Complete session at minute 25
    const stopMs = mockStartTime + 1500 * 1000;
    const finalized = finalizeSessionRecord(session, stopMs, 'manual_stop');

    expect(finalized.startTimestampISO).toBe(new Date(mockStartTime).toISOString());
    expect(finalized.endTimestampISO).toBe(new Date(stopMs).toISOString());
    expect(finalized.completionReason).toBe('manual_stop');
    expect(finalized.pauses).toHaveLength(1);
    expect(finalized.pauses[0].pausedAtISO).toBe(new Date(pauseMs).toISOString());
    expect(finalized.pauses[0].resumedAtISO).toBe(new Date(resumeMs).toISOString());

    // Total gross: 1500s. Pause: 120s. Net: 1380s.
    expect(finalized.durationSeconds).toBe(1380);
    expect(finalized.durationMinutes).toBe(23);
    expect(finalized.isEligible).toBe(true);
  });
});
