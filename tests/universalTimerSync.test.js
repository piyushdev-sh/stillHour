import { describe, it, expect } from 'vitest';
import {
  createNewTimerSession,
  pauseTimerState,
  resumeTimerState,
  calculateNetStudySeconds,
  finalizeSessionRecord,
} from '../src/services/timerEngine';

describe('Universal Timer Multi-Device Synchronization & Concurrency', () => {
  const startMs = 1700000000000;

  it('generates consistent authoritative active timer state', () => {
    const timer = createNewTimerSession({
      subjectId: 'sub_math',
      subjectName: 'MATH',
      durationMinutes: 25,
      startTimeMs: startMs,
    });

    expect(timer.status).toBe('running');
    expect(timer.subjectId).toBe('sub_math');
    expect(timer.plannedDurationSeconds).toBe(1500);
    expect(timer.targetEndTimestamp).toBe(startMs + 1500 * 1000);
    expect(timer.startTimestampISO).toBe(new Date(startMs).toISOString());
  });

  it('rejects concurrent sessions when single-timer rule is enforced', () => {
    const activeTimer = createNewTimerSession({
      subjectId: 'sub_math',
      subjectName: 'MATH',
      durationMinutes: 25,
      startTimeMs: startMs,
    });

    // Simulated server handler for START action
    const handleStartOnServer = (currentTimer, newParams) => {
      if (
        currentTimer &&
        (currentTimer.status === 'running' || currentTimer.status === 'paused') &&
        !newParams.force
      ) {
        return {
          status: 409,
          error: 'TIMER_ALREADY_ACTIVE',
          activeTimer: currentTimer,
        };
      }
      return {
        status: 200,
        activeTimer: createNewTimerSession(newParams),
      };
    };

    // Device B attempts to start without force
    const result = handleStartOnServer(activeTimer, {
      subjectId: 'sub_cs',
      subjectName: 'CORE CS',
      durationMinutes: 30,
      startTimeMs: startMs + 60000,
      force: false,
    });

    expect(result.status).toBe(409);
    expect(result.error).toBe('TIMER_ALREADY_ACTIVE');
    expect(result.activeTimer.subjectName).toBe('MATH');

    // Device B forces switch
    const forceResult = handleStartOnServer(activeTimer, {
      subjectId: 'sub_cs',
      subjectName: 'CORE CS',
      durationMinutes: 30,
      startTimeMs: startMs + 60000,
      force: true,
    });

    expect(forceResult.status).toBe(200);
    expect(forceResult.activeTimer.subjectName).toBe('CORE CS');
  });

  it('records every pause and resume event exactly once with UTC timestamps', () => {
    let timer = createNewTimerSession({
      subjectId: 'sub_math',
      subjectName: 'MATH',
      durationMinutes: 25,
      startTimeMs: startMs,
    });

    // Pause at +5m (300s)
    const pauseTime = startMs + 300 * 1000;
    timer = pauseTimerState(timer, pauseTime);

    expect(timer.status).toBe('paused');
    expect(timer.pauses).toHaveLength(1);
    expect(timer.pauses[0].pausedAt).toBe(pauseTime);
    expect(timer.pauses[0].pausedAtISO).toBe(new Date(pauseTime).toISOString());
    expect(timer.pauses[0].resumedAt).toBeNull();

    // Resume at +8m (480s)
    const resumeTime = startMs + 480 * 1000;
    timer = resumeTimerState(timer, resumeTime);

    expect(timer.status).toBe('running');
    expect(timer.pauses).toHaveLength(1);
    expect(timer.pauses[0].resumedAt).toBe(resumeTime);
    expect(timer.pauses[0].resumedAtISO).toBe(new Date(resumeTime).toISOString());
    // Target end pushed by 180s (3 min)
    expect(timer.targetEndTimestamp).toBe(startMs + (1500 + 180) * 1000);
  });

  it('guarantees paused intervals are never counted as focused study time', () => {
    const totalElapsedSeconds = 1200; // 20 minutes
    const endMs = startMs + totalElapsedSeconds * 1000;

    // Paused for 5 minutes (300s)
    const pauses = [
      {
        pausedAt: startMs + 300 * 1000,
        resumedAt: startMs + 600 * 1000,
      },
    ];

    const netStudySeconds = calculateNetStudySeconds(startMs, endMs, pauses, 1500);
    // Net: 1200 - 300 = 900s (15 min)
    expect(netStudySeconds).toBe(900);
  });

  it('finalizes session with auditable metadata when stopped', () => {
    let timer = createNewTimerSession({
      subjectId: 'sub_math',
      subjectName: 'MATH',
      taskId: 'task_1',
      taskTitle: 'Calculus Exercises',
      durationMinutes: 45,
      startTimeMs: startMs,
    });

    const stopTime = startMs + 1800 * 1000; // 30 min in
    const finalized = finalizeSessionRecord(timer, stopTime, 'manual_stop');

    expect(finalized.id).toBe(timer.sessionId);
    expect(finalized.subjectId).toBe('sub_math');
    expect(finalized.subjectName).toBe('MATH');
    expect(finalized.taskId).toBe('task_1');
    expect(finalized.taskTitle).toBe('Calculus Exercises');
    expect(finalized.startTimestampISO).toBe(new Date(startMs).toISOString());
    expect(finalized.endTimestampISO).toBe(new Date(stopTime).toISOString());
    expect(finalized.completionReason).toBe('manual_stop');
    expect(finalized.durationSeconds).toBe(1800);
    expect(finalized.durationMinutes).toBe(30);
    expect(finalized.isEligible).toBe(true);
    expect(finalized.completed).toBe(true);
  });
});
