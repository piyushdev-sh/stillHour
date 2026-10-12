import { describe, it, expect } from 'vitest';
import {
  filterSessionsByRange,
  calculatePlannedVsActual,
  generateWeeklySummary,
  calculateTargetProjections,
  generateHeatmapGrid,
} from '../src/services/analyticsEngine.js';

describe('Phase 4: Analytics Engine & Reporting Logic', () => {
  it('filters sessions by date range and excludes sessions under 60 seconds', () => {
    const sessions = [
      { id: '1', date: '2026-10-10', durationSeconds: 1800, durationMinutes: 30 },
      { id: '2', date: '2026-10-11', durationSeconds: 45, durationMinutes: 0 }, // < 60s
      { id: '3', date: '2026-10-12', durationSeconds: 2400, durationMinutes: 40 },
      { id: '4', date: '2026-10-15', durationSeconds: 1200, durationMinutes: 20 },
    ];

    const filtered = filterSessionsByRange(sessions, '2026-10-10', '2026-10-12');
    expect(filtered.length).toBe(2); // IDs 1 and 3 (2 excluded because < 60s, 4 excluded because date out of range)
  });

  it('correctly categorizes understudied and overstudied subjects', () => {
    const subjects = [
      { id: 'sub_art', name: 'Art History', dailyTargetMinutes: 60, priority: 'medium' },
      { id: 'sub_math', name: 'Mathematics', dailyTargetMinutes: 60, priority: 'high' },
      { id: 'sub_code', name: 'Coding', dailyTargetMinutes: 60, priority: 'high' },
    ];

    // Period: 7 days -> Planned period is 420 mins each
    const sessions = [
      // Art: 100 mins (< 210 mins = understudied)
      { subjectId: 'sub_art', durationSeconds: 6000, durationMinutes: 100 },
      // Math: 400 mins (~95% = on track)
      { subjectId: 'sub_math', durationSeconds: 24000, durationMinutes: 400 },
      // Code: 700 mins (> 630 mins = overstudied)
      { subjectId: 'sub_code', durationSeconds: 42000, durationMinutes: 700 },
    ];

    const result = calculatePlannedVsActual(subjects, sessions, 7);
    const art = result.subjects.find((s) => s.subjectId === 'sub_art');
    const math = result.subjects.find((s) => s.subjectId === 'sub_math');
    const code = result.subjects.find((s) => s.subjectId === 'sub_code');

    expect(art.balanceStatus).toBe('understudied');
    expect(math.balanceStatus).toBe('on_track');
    expect(code.balanceStatus).toBe('overstudied');
  });

  it('calculates weekly summary and change percentage from previous week', () => {
    const subjects = [{ id: 'sub_1', name: 'Neuroscience' }];
    const currentWeekSessions = [
      { subjectId: 'sub_1', durationSeconds: 18000, durationMinutes: 300 }, // 5 hours
    ];
    const previousWeekSessions = [
      { subjectId: 'sub_1', durationSeconds: 14400, durationMinutes: 240 }, // 4 hours
    ];

    const summary = generateWeeklySummary({
      currentWeekSessions,
      previousWeekSessions,
      subjects,
    });

    expect(summary.currentWeekHours).toBe(5);
    expect(summary.prevWeekHours).toBe(4);
    expect(summary.deltaMinutes).toBe(60);
    expect(summary.deltaPercent).toBe(25); // +25%
    expect(summary.isIncrease).toBe(true);
    expect(summary.mostStudiedSubjects[0].name).toBe('Neuroscience');
  });

  it('calculates target completion projection with required disclaimer', () => {
    const subject = { id: 'sub_cs', name: 'Computer Science' };
    const recentSessions = [
      { subjectId: 'sub_cs', durationSeconds: 3600, durationMinutes: 60 },
      { subjectId: 'sub_cs', durationSeconds: 3600, durationMinutes: 60 },
      { subjectId: 'sub_cs', durationSeconds: 3600, durationMinutes: 60 },
      { subjectId: 'sub_cs', durationSeconds: 3600, durationMinutes: 60 },
      { subjectId: 'sub_cs', durationSeconds: 3600, durationMinutes: 60 },
      { subjectId: 'sub_cs', durationSeconds: 3600, durationMinutes: 60 },
      { subjectId: 'sub_cs', durationSeconds: 3600, durationMinutes: 60 },
    ]; // 420 mins in 7 days = 60 mins/day

    const projection = calculateTargetProjections({
      subject,
      currentStudiedMinutes: 300,
      goalTotalMinutes: 600, // 300 mins remaining / 60 mins/day = 5 days
      recentSessions,
      windowDays: 7,
    });

    expect(projection.status).toBe('projected');
    expect(projection.daysRemaining).toBe(5);
    expect(projection.dailyVelocityMinutes).toBe(60);
    expect(projection.disclaimer).toContain('estimate only, not a guarantee');
  });

  it('generates heatmap grid with 16 weeks of cells', () => {
    const grid = generateHeatmapGrid([], 16, ['2026-10-11']);
    expect(grid.length).toBe(16 * 7); // 112 cells
  });
});
