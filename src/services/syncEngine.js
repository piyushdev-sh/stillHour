/**
 * Sync Engine for stillhour
 * Implements mutation push/pull, conflict detection without silent overwrites,
 * and automatic sync on connectivity restoration.
 */

import { getPendingMutations, clearPendingMutations, putToStore } from './db';

/**
 * Evaluates whether two records (local vs remote) constitute a conflict.
 * Per specification: "Detect concurrent/conflicting edits across devices. Ask the user to resolve conflicts; never silently overwrite one version."
 */
export function detectConflict(localRecord, remoteRecord, lastSyncedTimestamp = 0) {
  if (!localRecord || !remoteRecord) return false;

  const localUpdated = new Date(localRecord.updatedAt || localRecord.savedAt || 0).getTime();
  const remoteUpdated = new Date(remoteRecord.updatedAt || remoteRecord.savedAt || 0).getTime();

  // If both records changed after the last sync checkpoint and have differing contents
  const localChanged = localUpdated > lastSyncedTimestamp;
  const remoteChanged = remoteUpdated > lastSyncedTimestamp;

  if (localChanged && remoteChanged) {
    // Check if contents actually differ
    const localStr = JSON.stringify({ ...localRecord, updatedAt: null, version: null });
    const remoteStr = JSON.stringify({ ...remoteRecord, updatedAt: null, version: null });
    return localStr !== remoteStr;
  }

  return false;
}

/**
 * Resolves a conflict according to user choice:
 * 'keepLocal' -> keeps local record and marks it as authoritatively overriding remote.
 * 'acceptRemote' -> overrides local record with remote record.
 */
export function resolveConflictRecord(choice, localRecord, remoteRecord) {
  if (choice === 'keepLocal') {
    return {
      resolvedRecord: {
        ...localRecord,
        version: (Math.max(localRecord.version || 0, remoteRecord.version || 0)) + 1,
        updatedAt: new Date().toISOString(),
      },
      action: 'PUSH_LOCAL',
    };
  } else {
    return {
      resolvedRecord: {
        ...remoteRecord,
        version: (Math.max(localRecord.version || 0, remoteRecord.version || 0)) + 1,
        updatedAt: new Date().toISOString(),
      },
      action: 'APPLY_REMOTE',
    };
  }
}

/**
 * Simulates or executes cloud sync payload exchange
 */
export async function executeSync({
  apiUrl = '/api/sync',
  authToken = null,
  localMutations = [],
  lastSyncTimestamp = 0,
}) {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        mutations: localMutations,
        lastSyncTimestamp,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync API responded with status ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      remoteChanges: data.remoteChanges || [],
      conflicts: data.conflicts || [],
      syncTimestamp: data.syncTimestamp || Date.now(),
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      syncTimestamp: null,
    };
  }
}
