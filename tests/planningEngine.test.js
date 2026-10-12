import { describe, it, expect } from 'vitest';
import {
  calculateDailyTargetFromSubjects,
  getTargetForDate,
  calculateDailyStudyStats,
  calculateConsistencyStreak,
  getUnfinishedTasksForCarryForward,
} from '../src/services/planningEngine.js';

describe('Phase 3: Planning & Consistency Engine', () => {
  const mockSubjects = [
    { id: 'sub_math', name: 'Mathematics', dailyTargetMinutes: 60, archived: false },
    { id: 'sub_physics', name: 'Physics', dailyTargetMinutes: 45, archived: false },
    { id: 'sub_old', name: 'Old Subject', dailyTargetMinutes: 30, archived: true },
  ];

  it('calculates daily target correctly from active subject targets', () => {
    const total = calculateDailyTargetFromSubjects(mockSubjects);
    // 60 + 45 = 105 (ignores archived 30)
    expect(total).toBe(105);
  });

  it('guarantees historical target immutability for past dates', () => {
    const pastDate = '2026-10-01';
    const historicalSnapshots = {
      [pastDate]: {
        totalTargetMinutes: 90,
        subjectTargets: { sub_math: 90 },
      },
    };

    // Even if current subjects total 105, past date must preserve original snapshot of 90
    const plan = getTargetForDate(pastDate, mockSubjects, historicalSnapshots);
    expect(plan.isSnapshot).toBe(true);
    expect(plan.totalTargetMinutes).toBe(90);
  });

  it('guarantees single-counting for task-linked sessions', () => {
    const mockSessions = [
      {
        id: 'sess_1',
        subjectId: 'sub_math',
        subjectName: 'Mathematics',
        taskId: 'task_algebra',
        taskTitle: 'Algebra practice',
        durationMinutes: 30,
        durationSeconds: 1800,
        date: '2026-10-12',
      },
      {
        id: 'sess_2',
        subjectId: 'sub_math',
        subjectName: 'Mathematics',
        taskId: null,
        durationMinutes: 30,
        durationSeconds: 1800,
        date: '2026-10-12',
      },
      {
        id: 'sess_3_short',
        subjectId: 'sub_math',
        subjectName: 'Mathematics',
        taskId: null,
        durationMinutes: 0,
        durationSeconds: 45, // < 60s, must be excluded
        date: '2026-10-12',
      },
    ];

    const stats = calculateDailyStudyStats(mockSessions, 60, '2026-10-12');
    // Total should be 30 + 30 = 60 minutes (the task-linked session is counted only once, and 45s is excluded)
    expect(stats.totalStudiedMinutes).toBe(60);
    expect(stats.eligibleSessionCount).toBe(2);
    expect(stats.isMet).toBe(true);
    expect(stats.completionPercent).toBe(100);
    expect(stats.subjectStats['sub_math'].minutes).toBe(60);
  });

  it('exempts planned rest days from consistency streak calculations', () => {
    // 3 days: Friday (studied), Saturday (studied), Sunday (rest day), Monday (today, studied)
    const recentDates = ['2026-10-12', '2026-10-11', '2026-10-10', '2026-10-09'];
    // 2026-10-11 was Sunday
    const sessionsByDate = {
      '2026-10-12': [{ durationSeconds: 3600, durationMinutes: 60 }], // Monday met
      '2026-10-11': [], // Sunday rest day (0 mins)
      '2026-10-10': [{ durationSeconds: 3600, durationMinutes: 60 }], // Saturday met
      '2026-10-09': [{ durationSeconds: 3600, durationMinutes: 60 }], // Friday met
    };

    const streak = calculateConsistencyStreak({
      recentDates,
      sessionsByDate,
      restDaysOfWeek: ['Sunday'],
      dailyTargetMinutes: 60,
    });

    // Sunday was a planned rest day, so streak continues across it: 3 studied days!
    expect(streak).toBe(3);
  });

  it('identifies unfinished tasks from past dates for carry-forward prompt', () => {
    const today = '2026-10-12';
    const mockTasks = [
      { id: 't1', title: 'Yesterday task', completed: false, carryForward: true, date: '2026-10-11' },
      { id: 't2', title: 'Yesterday finished', completed: true, carryForward: true, date: '2026-10-11' },
      { id: 't3', title: 'Today task', completed: false, carryForward: true, date: '2026-10-12' },
    ];

    const eligibleForCarry = getUnfinishedTasksForCarryForward(mockTasks, today);
    expect(eligibleForCarry.length).toBe(1);
    expect(eligibleForCarry[0].id).toBe('t1');
  });
});
