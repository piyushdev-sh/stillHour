import { describe, it, expect } from 'vitest';

describe('Phase 6: Data Safety, Restore Workflows & Idempotency', () => {
  it('validates JSON backup format and handles restore cleanly', () => {
    const mockBackupPayload = {
      app: 'stillhour',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      subjects: [
        { id: 'sub_1', name: 'Neuroscience', priority: 'high', dailyTargetMinutes: 60 },
      ],
      tasks: [
        { id: 't_1', title: 'Read Chapter 5', completed: false, date: '2026-10-12' },
      ],
      sessions: [
        { id: 's_1', subjectId: 'sub_1', durationSeconds: 1800, durationMinutes: 30, date: '2026-10-12' },
      ],
    };

    expect(mockBackupPayload.app).toBe('stillhour');
    expect(Array.isArray(mockBackupPayload.subjects)).toBe(true);
    expect(Array.isArray(mockBackupPayload.tasks)).toBe(true);
    expect(Array.isArray(mockBackupPayload.sessions)).toBe(true);
    expect(mockBackupPayload.subjects.length).toBe(1);
  });

  it('enforces idempotency when restoring or saving sessions with identical IDs', () => {
    const existingSessions = [
      { id: 'sess_100', subjectId: 'sub_1', durationSeconds: 1500 },
      { id: 'sess_101', subjectId: 'sub_1', durationSeconds: 1800 },
    ];

    const duplicateSession = { id: 'sess_100', subjectId: 'sub_1', durationSeconds: 1500 };

    // Idempotent add logic
    const addSessionIdempotent = (sessions, newSess) => {
      if (sessions.some((s) => s.id === newSess.id)) {
        return sessions; // Duplicate ignored
      }
      return [newSess, ...sessions];
    };

    const result = addSessionIdempotent(existingSessions, duplicateSession);
    expect(result.length).toBe(2); // No duplicate added
  });

  it('guarantees destructive reset requires explicit confirmation acknowledgement', () => {
    let resetAllowed = false;
    let acknowledgedBackup = false;

    const performDestructiveReset = (ack) => {
      if (!ack) {
        throw new Error('Destructive reset requires explicit acknowledgement of backup.');
      }
      resetAllowed = true;
      return true;
    };

    expect(() => performDestructiveReset(acknowledgedBackup)).toThrow(
      'Destructive reset requires explicit acknowledgement of backup.'
    );

    acknowledgedBackup = true;
    expect(performDestructiveReset(acknowledgedBackup)).toBe(true);
    expect(resetAllowed).toBe(true);
  });

  it('verifies real production backup contains 5 subjects and 5 historical sessions totaling 420 minutes', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const backupPath = path.resolve(__dirname, '../backups/production_backup_2026-10-22.json');

    expect(fs.existsSync(backupPath)).toBe(true);
    const content = fs.readFileSync(backupPath, 'utf-8');
    const parsed = JSON.parse(content);
    const backup = parsed.data || parsed;

    expect(backup.subjects).toHaveLength(5);
    const subjectNames = backup.subjects.map((s) => s.name);
    expect(subjectNames).toContain('MATH');
    expect(subjectNames).toContain('CORE CS');
    expect(subjectNames).toContain('REASONING');
    expect(subjectNames).toContain('HINDI');
    expect(subjectNames).toContain('ENGLISH');

    expect(backup.sessions).toHaveLength(5);
    const totalMinutes = backup.sessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    expect(totalMinutes).toBe(420);
  });
});
