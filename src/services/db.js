/**
 * Client-Side IndexedDB Repository for stillhour
 * Uses the 'idb' library to provide versioned object stores,
 * an offline sync mutation queue, and a 30-day soft-delete recycle bin.
 */

import { openDB } from 'idb';

const DB_NAME = 'stillhour_db';
const DB_VERSION = 1;

export const STORES = {
  SUBJECTS: 'subjects',
  TASKS: 'tasks',
  SESSIONS: 'sessions',
  TEMPLATES: 'templates',
  TARGET_SNAPSHOTS: 'targetSnapshots',
  RECYCLE_BIN: 'recycleBin',
  SYNC_QUEUE: 'syncQueue',
  SETTINGS: 'settings',
};

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // 1. Subjects Store
        if (!db.objectStoreNames.contains(STORES.SUBJECTS)) {
          const store = db.createObjectStore(STORES.SUBJECTS, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
          store.createIndex('archived', 'archived');
        }

        // 2. Tasks Store
        if (!db.objectStoreNames.contains(STORES.TASKS)) {
          const store = db.createObjectStore(STORES.TASKS, { keyPath: 'id' });
          store.createIndex('date', 'date');
          store.createIndex('completed', 'completed');
        }

        // 3. Sessions Store
        if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
          const store = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
          store.createIndex('date', 'date');
          store.createIndex('subjectId', 'subjectId');
          store.createIndex('startTimestamp', 'startTimestamp');
        }

        // 4. Schedule Templates
        if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
          db.createObjectStore(STORES.TEMPLATES, { keyPath: 'id' });
        }

        // 5. Target Snapshots (immutable past dates)
        if (!db.objectStoreNames.contains(STORES.TARGET_SNAPSHOTS)) {
          db.createObjectStore(STORES.TARGET_SNAPSHOTS, { keyPath: 'date' });
        }

        // 6. 30-day Soft-Delete Recycle Bin
        if (!db.objectStoreNames.contains(STORES.RECYCLE_BIN)) {
          const store = db.createObjectStore(STORES.RECYCLE_BIN, { keyPath: 'id' });
          store.createIndex('deletionTimestamp', 'deletionTimestamp');
          store.createIndex('expirationTimestamp', 'expirationTimestamp');
        }

        // 7. Offline Sync Mutation Queue
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const store = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
        }

        // 8. User Settings & Meta
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Generic Read Operations
 */
export async function getAllFromStore(storeName) {
  try {
    const db = await getDB();
    return await db.getAll(storeName);
  } catch (e) {
    console.error(`IndexedDB getAll error on ${storeName}:`, e);
    return [];
  }
}

export async function getFromStore(storeName, key) {
  try {
    const db = await getDB();
    return await db.get(storeName, key);
  } catch (e) {
    console.error(`IndexedDB get error on ${storeName}:`, e);
    return null;
  }
}

/**
 * Put with Mutation Logging for Offline Sync
 */
export async function putToStore(storeName, item, recordMutation = true) {
  try {
    const db = await getDB();
    const itemWithTime = {
      ...item,
      updatedAt: item.updatedAt || new Date().toISOString(),
      version: (item.version || 0) + 1,
    };
    await db.put(storeName, itemWithTime);

    if (recordMutation && storeName !== STORES.SYNC_QUEUE && storeName !== STORES.RECYCLE_BIN) {
      await enqueueMutation({
        id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        action: 'UPSERT',
        storeName,
        entityId: item.id || item.date || item.key,
        payload: itemWithTime,
        timestamp: Date.now(),
      });
    }

    return itemWithTime;
  } catch (e) {
    console.error(`IndexedDB put error on ${storeName}:`, e);
    throw e;
  }
}

/**
 * Soft Delete into 30-Day Recycle Bin
 * Per specification: "Deleted records go to a recycle bin for 30 days before permanent removal."
 */
export async function softDeleteFromStore(storeName, id) {
  try {
    const db = await getDB();
    const existing = await db.get(storeName, id);

    if (existing) {
      const nowMs = Date.now();
      const expirationMs = nowMs + 30 * 24 * 60 * 60 * 1000; // 30 days in ms

      const binItem = {
        id: `bin_${id}_${nowMs}`,
        originalStore: storeName,
        originalId: id,
        payload: existing,
        deletionTimestamp: nowMs,
        expirationTimestamp: expirationMs,
      };

      await db.put(STORES.RECYCLE_BIN, binItem);
      await db.delete(storeName, id);

      await enqueueMutation({
        id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        action: 'DELETE',
        storeName,
        entityId: id,
        timestamp: nowMs,
      });

      return binItem;
    }
  } catch (e) {
    console.error(`IndexedDB soft-delete error:`, e);
    throw e;
  }
}

/**
 * Restores an item from the Recycle Bin back to its original store
 */
export async function restoreFromRecycleBin(binId) {
  try {
    const db = await getDB();
    const binItem = await db.get(STORES.RECYCLE_BIN, binId);
    if (!binItem) return null;

    await db.put(binItem.originalStore, binItem.payload);
    await db.delete(STORES.RECYCLE_BIN, binId);

    await enqueueMutation({
      id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      action: 'UPSERT',
      storeName: binItem.originalStore,
      entityId: binItem.originalId,
      payload: binItem.payload,
      timestamp: Date.now(),
    });

    return binItem.payload;
  } catch (e) {
    console.error(`IndexedDB restore error:`, e);
    throw e;
  }
}

/**
 * Purges expired items from the Recycle Bin (> 30 days old)
 */
export async function purgeExpiredRecycleBin(nowMs = Date.now()) {
  try {
    const db = await getDB();
    const allBinItems = await db.getAll(STORES.RECYCLE_BIN);
    const expired = allBinItems.filter((item) => item.expirationTimestamp <= nowMs);

    for (const item of expired) {
      await db.delete(STORES.RECYCLE_BIN, item.id);
    }
    return expired.length;
  } catch (e) {
    console.error(`IndexedDB purge error:`, e);
    return 0;
  }
}

/**
 * Mutation Queue Operations
 */
export async function enqueueMutation(mutation) {
  try {
    const db = await getDB();
    await db.put(STORES.SYNC_QUEUE, mutation);
  } catch (e) {
    console.error('Failed to enqueue mutation:', e);
  }
}

export async function getPendingMutations() {
  try {
    const db = await getDB();
    return await db.getAll(STORES.SYNC_QUEUE);
  } catch (e) {
    return [];
  }
}

export async function clearPendingMutations(mutationIds = []) {
  try {
    const db = await getDB();
    for (const id of mutationIds) {
      await db.delete(STORES.SYNC_QUEUE, id);
    }
  } catch (e) {
    console.error('Failed to clear mutations:', e);
  }
}
