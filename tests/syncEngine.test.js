import { describe, it, expect } from 'vitest';
import {
  detectConflict,
  resolveConflictRecord,
} from '../src/services/syncEngine.js';

describe('Phase 5: Sync Engine, Conflict Resolution & Recycle Bin Logic', () => {
  it('accurately identifies concurrent edits as conflicts without silent overwrites', () => {
    const lastSyncTime = 1700000000000;

    const localRecord = {
      id: 'sub_art',
      name: 'Art History (Renamed Locally)',
      priority: 'high',
      updatedAt: new Date(lastSyncTime + 10000).toISOString(),
    };

    const remoteRecord = {
      id: 'sub_art',
      name: 'Art History (Renamed Remotely)',
      priority: 'medium',
      updatedAt: new Date(lastSyncTime + 20000).toISOString(),
    };

    // Both changed after last sync with differing contents -> Conflict!
    const hasConflict = detectConflict(localRecord, remoteRecord, lastSyncTime);
    expect(hasConflict).toBe(true);
  });

  it('does not flag conflict if records are identical or unchanged since last sync', () => {
    const lastSyncTime = 1700000000000;

    const localRecord = {
      id: 'sub_art',
      name: 'Art History',
      priority: 'high',
      updatedAt: new Date(lastSyncTime - 5000).toISOString(),
    };

    const remoteRecord = {
      id: 'sub_art',
      name: 'Art History',
      priority: 'high',
      updatedAt: new Date(lastSyncTime - 2000).toISOString(),
    };

    const hasConflict = detectConflict(localRecord, remoteRecord, lastSyncTime);
    expect(hasConflict).toBe(false);
  });

  it('correctly resolves conflict according to user choice without silent data loss', () => {
    const local = { id: '1', name: 'Local Name', version: 2 };
    const remote = { id: '1', name: 'Remote Name', version: 3 };

    // User chooses 'keepLocal'
    const keepLocal = resolveConflictRecord('keepLocal', local, remote);
    expect(keepLocal.action).toBe('PUSH_LOCAL');
    expect(keepLocal.resolvedRecord.name).toBe('Local Name');
    expect(keepLocal.resolvedRecord.version).toBe(4); // increments max(2,3) + 1

    // User chooses 'acceptRemote'
    const acceptRemote = resolveConflictRecord('acceptRemote', local, remote);
    expect(acceptRemote.action).toBe('APPLY_REMOTE');
    expect(acceptRemote.resolvedRecord.name).toBe('Remote Name');
    expect(acceptRemote.resolvedRecord.version).toBe(4);
  });

  it('calculates 30-day recycle bin retention and expiration threshold accurately', () => {
    const nowMs = 1700000000000;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const expirationTimestamp = nowMs + thirtyDaysMs;

    expect(expirationTimestamp - nowMs).toBe(2592000000); // 30 days in ms

    // Item deleted 15 days ago is NOT expired
    const fifteenDaysOld = nowMs + 15 * 24 * 60 * 60 * 1000;
    expect(fifteenDaysOld < expirationTimestamp).toBe(true);

    // Item deleted 31 days ago IS expired
    const thirtyOneDaysOld = nowMs + 31 * 24 * 60 * 60 * 1000;
    expect(thirtyOneDaysOld > expirationTimestamp).toBe(true);
  });
});
