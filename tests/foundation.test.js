import { describe, it, expect } from 'vitest';
import {
  formatSecondsToTimer,
  formatMinutesToHuman,
  calculateNetStudyDurationSeconds,
  isEligibleStudySession,
} from '../src/utils/timeUtils.js';

describe('Phase 1 Foundation: Time Utilities and Spec Business Rules', () => {
  it('formats seconds into MM:SS correctly', () => {
    expect(formatSecondsToTimer(0)).toBe('00:00');
    expect(formatSecondsToTimer(65)).toBe('01:05');
    expect(formatSecondsToTimer(1500)).toBe('25:00');
  });

  it('formats minutes into human readable duration', () => {
    expect(formatMinutesToHuman(45)).toBe('45m');
    expect(formatMinutesToHuman(60)).toBe('1h 0m');
    expect(formatMinutesToHuman(135)).toBe('2h 15m');
  });

  it('accurately excludes pause intervals from total study duration', () => {
    const startMs = 1700000000000;
    // 30 minutes total wall clock time = 1800 seconds
    const endMs = startMs + 30 * 60 * 1000;

    // 5 minutes pause
    const pauses = [
      {
        pausedAt: startMs + 10 * 60 * 1000,
        resumedAt: startMs + 15 * 60 * 1000,
      },
    ];

    const netSeconds = calculateNetStudyDurationSeconds(startMs, endMs, pauses);
    // 30 mins - 5 mins = 25 mins = 1500 seconds
    expect(netSeconds).toBe(1500);
  });

  it('enforces the 60-second threshold rule from the specification', () => {
    // "Sessions shorter than 60 seconds remain in history but are excluded from study totals and target achievement."
    expect(isEligibleStudySession(59)).toBe(false);
    expect(isEligibleStudySession(0)).toBe(false);
    expect(isEligibleStudySession(60)).toBe(true);
    expect(isEligibleStudySession(1800)).toBe(true);
  });
});
