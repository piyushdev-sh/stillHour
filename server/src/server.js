import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory cloud simulation store for single-user study tracker
const cloudDatabase = {
  subjects: new Map(),
  tasks: new Map(),
  sessions: new Map(),
  templates: new Map(),
  targetSnapshots: new Map(),
  lastBackupTime: new Date().toISOString(),
  schemaVersion: 1,
};

// Auth token verification middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // In local dev/offline mode, we allow guest local authentication
    req.user = { uid: 'local_user', email: 'user@stillhour.app' };
    return next();
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (token) {
    req.user = { uid: 'authenticated_user', token };
    return next();
  }

  res.status(401).json({ error: 'Unauthorized: Invalid token' });
};

// 1. Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    app: 'stillhour-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 2. Sync Endpoint: Processes mutations and surfaces conflict detection
app.post('/api/sync', authenticate, (req, res) => {
  const { mutations = [], lastSyncTimestamp = 0 } = req.body;
  const conflicts = [];
  const processedIds = [];

  for (const mut of mutations) {
    const { action, storeName, entityId, payload, timestamp } = mut;
    const store = cloudDatabase[storeName];

    if (!store) {
      continue;
    }

    if (action === 'UPSERT' && payload) {
      const existing = store.get(entityId);
      // Conflict detection: if remote record exists and was updated after lastSyncTimestamp
      if (existing && existing.updatedAt && new Date(existing.updatedAt).getTime() > lastSyncTimestamp) {
        const localUpdated = new Date(payload.updatedAt || 0).getTime();
        const remoteUpdated = new Date(existing.updatedAt).getTime();

        if (localUpdated !== remoteUpdated) {
          conflicts.push({
            id: entityId,
            storeName,
            localRecord: payload,
            remoteRecord: existing,
          });
          continue; // Do not overwrite conflicting record without user choice
        }
      }

      store.set(entityId, payload);
      processedIds.push(mut.id);
    } else if (action === 'DELETE') {
      store.delete(entityId);
      processedIds.push(mut.id);
    }
  }

  // Gather remote changes that were updated on server after client's last sync
  const remoteChanges = [];
  for (const [storeName, map] of Object.entries(cloudDatabase)) {
    if (map instanceof Map) {
      for (const [id, record] of map.entries()) {
        const recTime = new Date(record.updatedAt || record.savedAt || 0).getTime();
        if (recTime > lastSyncTimestamp && !processedIds.includes(id)) {
          remoteChanges.push({ storeName, record });
        }
      }
    }
  }

  res.json({
    success: true,
    processedCount: processedIds.length,
    processedIds,
    conflicts,
    remoteChanges,
    syncTimestamp: Date.now(),
  });
});

// 3. Cloud Backup Status
app.get('/api/backup/status', authenticate, (req, res) => {
  res.json({
    status: 'healthy',
    lastBackupTime: cloudDatabase.lastBackupTime,
    schemaVersion: cloudDatabase.schemaVersion,
    itemCounts: {
      subjects: cloudDatabase.subjects.size,
      tasks: cloudDatabase.tasks.size,
      sessions: cloudDatabase.sessions.size,
    },
  });
});

// 4. Cloud Backup Export & Restore
app.post('/api/backup', authenticate, (req, res) => {
  const { action, backupData } = req.body;

  if (action === 'RESTORE' && backupData) {
    // Restore collections
    if (Array.isArray(backupData.subjects)) {
      cloudDatabase.subjects.clear();
      backupData.subjects.forEach((s) => cloudDatabase.subjects.set(s.id, s));
    }
    if (Array.isArray(backupData.tasks)) {
      cloudDatabase.tasks.clear();
      backupData.tasks.forEach((t) => cloudDatabase.tasks.set(t.id, t));
    }
    if (Array.isArray(backupData.sessions)) {
      cloudDatabase.sessions.clear();
      backupData.sessions.forEach((sess) => cloudDatabase.sessions.set(sess.id, sess));
    }

    cloudDatabase.lastBackupTime = new Date().toISOString();
    return res.json({ success: true, message: 'Cloud database restored successfully' });
  }

  // Action: EXPORT
  const exportPayload = {
    app: 'stillhour',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    subjects: Array.from(cloudDatabase.subjects.values()),
    tasks: Array.from(cloudDatabase.tasks.values()),
    sessions: Array.from(cloudDatabase.sessions.values()),
  };

  cloudDatabase.lastBackupTime = new Date().toISOString();
  res.json({ success: true, backup: exportPayload });
});

app.listen(PORT, () => {
  console.log(`stillhour backend API running on port ${PORT}`);
});
