import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  getAllFromStore,
  putToStore,
  softDeleteFromStore,
  restoreFromRecycleBin,
  purgeExpiredRecycleBin,
  STORES,
} from '../services/db';
import {
  detectConflict,
  resolveConflictRecord,
  executeSync,
  fetchCloudDatabase,
  pushFullCloudDatabase,
} from '../services/syncEngine';

const AppDataContext = createContext();

const STORAGE_KEYS = {
  SUBJECTS: 'stillhour_subjects',
  TASKS: 'stillhour_tasks',
  SESSIONS: 'stillhour_sessions',
  TEMPLATES: 'stillhour_templates',
  SNAPSHOTS: 'stillhour_target_snapshots',
  BIN: 'stillhour_recycle_bin',
  SETTINGS: 'stillhour_settings',
  LAST_SYNC: 'stillhour_last_cloud_sync',
};

export function AppDataProvider({ children }) {
  // Subjects start strictly EMPTY as per specification
  const [subjects, setSubjects] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    return saved ? JSON.parse(saved) : [];
  });

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
    return saved ? JSON.parse(saved) : [];
  });

  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return saved ? JSON.parse(saved) : [];
  });

  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    return saved ? JSON.parse(saved) : [];
  });

  const [historicalSnapshots, setHistoricalSnapshots] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SNAPSHOTS);
    return saved ? JSON.parse(saved) : {};
  });

  const [recycleBinItems, setRecycleBinItems] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BIN);
    return saved ? JSON.parse(saved) : [];
  });

  const [syncStatus, setSyncStatus] = useState('synced');
  const [cloudConfigured, setCloudConfigured] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return saved ? new Date(saved) : null;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeConflict, setActiveConflict] = useState(null);

  // Keep ref of current state for network sync callbacks without stale closures
  const stateRef = useRef({ subjects, tasks, sessions, templates, historicalSnapshots });
  stateRef.current = { subjects, tasks, sessions, templates, historicalSnapshots };

  // Persistence to localStorage & IndexedDB
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
    subjects.forEach((s) => putToStore(STORES.SUBJECTS, s, false).catch(() => {}));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    tasks.forEach((t) => putToStore(STORES.TASKS, t, false).catch(() => {}));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    sessions.forEach((s) => putToStore(STORES.SESSIONS, s, false).catch(() => {}));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
    templates.forEach((tpl) => putToStore(STORES.TEMPLATES, tpl, false).catch(() => {}));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify(historicalSnapshots));
  }, [historicalSnapshots]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BIN, JSON.stringify(recycleBinItems));
  }, [recycleBinItems]);

  // Cloud sync handler: merges remote data and pushes local changes
  const syncWithCloud = async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      // 1. Fetch remote cloud state from /api/sync (Vercel KV / Upstash)
      const pullRes = await fetchCloudDatabase('/api/sync');

      if (pullRes && pullRes.kvConfigured) {
        setCloudConfigured(true);

        if (pullRes.data) {
          const remote = pullRes.data;

          // Merge subjects: union by id, preferring newer updatedAt
          if (Array.isArray(remote.subjects) && remote.subjects.length > 0) {
            setSubjects((prev) => {
              const map = new Map();
              prev.forEach((s) => map.set(s.id, s));
              remote.subjects.forEach((s) => {
                const cur = map.get(s.id);
                if (!cur || new Date(s.updatedAt || 0) >= new Date(cur.updatedAt || 0)) {
                  map.set(s.id, s);
                }
              });
              return Array.from(map.values());
            });
          }

          // Merge tasks: union by id, preferring newer updatedAt
          if (Array.isArray(remote.tasks) && remote.tasks.length > 0) {
            setTasks((prev) => {
              const map = new Map();
              prev.forEach((t) => map.set(t.id, t));
              remote.tasks.forEach((t) => {
                const cur = map.get(t.id);
                if (!cur || new Date(t.updatedAt || 0) >= new Date(cur.updatedAt || 0)) {
                  map.set(t.id, t);
                }
              });
              return Array.from(map.values());
            });
          }

          // Merge sessions: union by id
          if (Array.isArray(remote.sessions) && remote.sessions.length > 0) {
            setSessions((prev) => {
              const map = new Map();
              prev.forEach((sess) => map.set(sess.id, sess));
              remote.sessions.forEach((sess) => map.set(sess.id, sess));
              return Array.from(map.values());
            });
          }

          // Merge templates: union by id
          if (Array.isArray(remote.templates) && remote.templates.length > 0) {
            setTemplates((prev) => {
              const map = new Map();
              prev.forEach((tpl) => map.set(tpl.id, tpl));
              remote.templates.forEach((tpl) => map.set(tpl.id, tpl));
              return Array.from(map.values());
            });
          }

          // Merge historical snapshots
          if (remote.snapshots && typeof remote.snapshots === 'object') {
            setHistoricalSnapshots((prev) => ({ ...prev, ...remote.snapshots }));
          }
        }

        // 2. Push full current local state to ensure cloud has any local offline additions
        const pushRes = await pushFullCloudDatabase({
          apiUrl: '/api/sync',
          fullState: stateRef.current,
        });

        if (pushRes && pushRes.success) {
          const now = new Date();
          setLastSyncTime(now);
          localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now.toISOString());
          setSyncStatus('synced');
        }
      } else {
        setCloudConfigured(false);
        setSyncStatus('synced'); // local IndexedDB is synced
      }
    } catch (err) {
      console.warn('Sync error:', err);
      setSyncStatus('offline');
    } finally {
      setIsSyncing(false);
    }
  };

  // Connectivity & Tab Focus listeners for seamless multi-device updates
  useEffect(() => {
    // Initial sync on app launch
    syncWithCloud();

    const handleOnline = () => {
      setSyncStatus('synced');
      syncWithCloud();
    };

    const handleOffline = () => {
      setSyncStatus('offline');
    };

    // When user returns to StillHour tab/window on their laptop/phone
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncWithCloud();
      }
    };

    const handleFocus = () => {
      syncWithCloud();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Initial purge of items > 30 days
    const now = Date.now();
    setRecycleBinItems((prev) => prev.filter((item) => item.expirationTimestamp > now));
    purgeExpiredRecycleBin(now).catch(() => {});

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Debounced auto-push when data changes locally
  useEffect(() => {
    if (!cloudConfigured) return;

    const timer = setTimeout(() => {
      pushFullCloudDatabase({
        apiUrl: '/api/sync',
        fullState: stateRef.current,
      })
        .then((res) => {
          if (res && res.success) {
            const now = new Date();
            setLastSyncTime(now);
            localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now.toISOString());
            setSyncStatus('synced');
          }
        })
        .catch(() => {});
    }, 1200);

    return () => clearTimeout(timer);
  }, [subjects, tasks, sessions, templates, historicalSnapshots, cloudConfigured]);

  // Subject methods
  const addSubject = (newSub) => {
    const item = { ...newSub, updatedAt: new Date().toISOString() };
    setSubjects((prev) => [...prev, item]);
  };

  const updateSubject = (id, updates) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s))
    );
  };

  const archiveSubject = (id) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, archived: !s.archived, updatedAt: new Date().toISOString() } : s))
    );
  };

  // Soft delete subject into 30-day recycle bin
  const deleteSubject = (id) => {
    const existing = subjects.find((s) => s.id === id);
    if (existing) {
      const nowMs = Date.now();
      const binItem = {
        id: `bin_sub_${id}_${nowMs}`,
        originalStore: 'subjects',
        originalId: id,
        payload: existing,
        deletionTimestamp: nowMs,
        expirationTimestamp: nowMs + 30 * 24 * 60 * 60 * 1000,
      };
      setRecycleBinItems((prev) => [binItem, ...prev]);
    }
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  };

  // Task methods
  const addTask = (newTask) => {
    const item = { ...newTask, updatedAt: new Date().toISOString() };
    setTasks((prev) => [item, ...prev]);
  };

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() } : t))
    );
  };

  // Soft delete task into 30-day recycle bin
  const deleteTask = (id) => {
    const existing = tasks.find((t) => t.id === id);
    if (existing) {
      const nowMs = Date.now();
      const binItem = {
        id: `bin_task_${id}_${nowMs}`,
        originalStore: 'tasks',
        originalId: id,
        payload: existing,
        deletionTimestamp: nowMs,
        expirationTimestamp: nowMs + 30 * 24 * 60 * 60 * 1000,
      };
      setRecycleBinItems((prev) => [binItem, ...prev]);
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const carryForwardTasks = (taskIds, targetDateStr = new Date().toISOString().slice(0, 10)) => {
    setTasks((prev) =>
      prev.map((t) =>
        taskIds.includes(t.id)
          ? { ...t, date: targetDateStr, carriedForwardAt: new Date().toISOString() }
          : t
      )
    );
  };

  // Recycle bin restoration
  const restoreFromBin = (binId) => {
    const binItem = recycleBinItems.find((b) => b.id === binId);
    if (!binItem) return;

    if (binItem.originalStore === 'subjects') {
      setSubjects((prev) => [...prev, binItem.payload]);
    } else if (binItem.originalStore === 'tasks') {
      setTasks((prev) => [binItem.payload, ...prev]);
    }

    setRecycleBinItems((prev) => prev.filter((b) => b.id !== binId));
  };

  // Template methods
  const saveTemplate = (template) => {
    setTemplates((prev) => {
      const existingIdx = prev.findIndex((t) => t.id === template.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = { ...template, updatedAt: new Date().toISOString() };
        return copy;
      }
      return [...prev, { ...template, updatedAt: new Date().toISOString() }];
    });
  };

  const deleteTemplate = (id) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    softDeleteFromStore(STORES.TEMPLATES, id).catch(() => {});
  };

  // Session methods
  const addSession = (session) => {
    setSessions((prev) => {
      const exists = prev.some((s) => s.id === session.id);
      if (exists) return prev;
      return [session, ...prev];
    });
  };

  // Session correction within 15-min window
  const updateSession = (id, updates) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const newDurationSec = updates.durationSeconds !== undefined ? updates.durationSeconds : s.durationSeconds;
        return {
          ...s,
          ...updates,
          durationSeconds: newDurationSec,
          durationMinutes: Math.round(newDurationSec / 60),
          isEligible: newDurationSec >= 60,
          correctedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Conflict resolution handler
  const resolveConflict = (choice) => {
    if (!activeConflict) return;
    const { localRecord, remoteRecord, storeName } = activeConflict;
    const { resolvedRecord } = resolveConflictRecord(choice, localRecord, remoteRecord);

    if (storeName === 'subjects') {
      setSubjects((prev) => prev.map((s) => (s.id === resolvedRecord.id ? resolvedRecord : s)));
    } else if (storeName === 'tasks') {
      setTasks((prev) => prev.map((t) => (t.id === resolvedRecord.id ? resolvedRecord : t)));
    }

    setActiveConflict(null);
    setSyncStatus('synced');
  };

  // Backup Restoration
  const restoreFromJSONBackup = (data) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid backup file');
    }
    if (Array.isArray(data.subjects)) setSubjects(data.subjects);
    if (Array.isArray(data.tasks)) setTasks(data.tasks);
    if (Array.isArray(data.sessions)) setSessions(data.sessions);
    if (Array.isArray(data.templates)) setTemplates(data.templates);
    return true;
  };

  const resetAllData = () => {
    setSubjects([]);
    setTasks([]);
    setSessions([]);
    setTemplates([]);
    setHistoricalSnapshots({});
    setRecycleBinItems([]);
    localStorage.removeItem(STORAGE_KEYS.SUBJECTS);
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    localStorage.removeItem(STORAGE_KEYS.TEMPLATES);
    localStorage.removeItem(STORAGE_KEYS.SNAPSHOTS);
    localStorage.removeItem(STORAGE_KEYS.BIN);
    localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
  };

  return (
    <AppDataContext.Provider
      value={{
        subjects,
        tasks,
        sessions,
        templates,
        historicalSnapshots,
        recycleBinItems,
        syncStatus,
        cloudConfigured,
        lastSyncTime,
        isSyncing,
        activeConflict,
        addSubject,
        updateSubject,
        archiveSubject,
        deleteSubject,
        addTask,
        toggleTask,
        deleteTask,
        carryForwardTasks,
        restoreFromBin,
        saveTemplate,
        deleteTemplate,
        addSession,
        updateSession,
        syncWithCloud,
        triggerManualSync: syncWithCloud,
        resolveConflict,
        restoreFromJSONBackup,
        resetAllData,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
