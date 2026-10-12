/**
 * AppDataContext.jsx
 * 
 * Single source of truth: Vercel KV (via /api/sync).
 * No IndexedDB. No localStorage. Every change is immediately written to the cloud.
 * On load the app fetches the current state from the cloud.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { cloudFetch, cloudSave } from '../services/cloudStore';

const AppDataContext = createContext();

// How long to debounce writes after a change (ms)
const WRITE_DEBOUNCE_MS = 600;

export function AppDataProvider({ children }) {
  // ── Loading / error states ─────────────────────────────────────────────
  const [loadState, setLoadState] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [loadError, setLoadError] = useState(null);

  // ── Core data ──────────────────────────────────────────────────────────
  const [subjects,            setSubjects]            = useState([]);
  const [tasks,               setTasks]               = useState([]);
  const [sessions,            setSessions]            = useState([]);
  const [templates,           setTemplates]           = useState([]);
  const [historicalSnapshots, setHistoricalSnapshots] = useState({});
  const [recycleBinItems,     setRecycleBinItems]     = useState([]);

  // ── Sync meta ──────────────────────────────────────────────────────────
  const [isSyncing,  setIsSyncing]  = useState(false);
  const [lastSaved,  setLastSaved]  = useState(null);
  const [saveError,  setSaveError]  = useState(null);

  // Keep a ref to always-current state for the debounced writer
  const stateRef = useRef({});
  stateRef.current = { subjects, tasks, sessions, templates, historicalSnapshots, recycleBinItems };

  // Track whether initial load has finished so we don't write on first render
  const isLoadedRef = useRef(false);

  // ── Initial load from cloud ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoadState('loading');
        const data = await cloudFetch();
        if (cancelled) return;

        setSubjects(           Array.isArray(data.subjects)    ? data.subjects   : []);
        setTasks(              Array.isArray(data.tasks)        ? data.tasks      : []);
        setSessions(           Array.isArray(data.sessions)     ? data.sessions   : []);
        setTemplates(          Array.isArray(data.templates)    ? data.templates  : []);
        setHistoricalSnapshots(typeof data.snapshots === 'object' && data.snapshots ? data.snapshots : {});
        setRecycleBinItems(    Array.isArray(data.recycleBin)   ? data.recycleBin : []);

        isLoadedRef.current = true;
        setLoadState('ready');
      } catch (err) {
        if (cancelled) return;
        setLoadError(err.message);
        setLoadState('error');
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Re-fetch when user returns to the tab / window
  const refetchFromCloud = useCallback(async () => {
    if (isSyncing) return;
    try {
      setIsSyncing(true);
      const data = await cloudFetch();
      setSubjects(           Array.isArray(data.subjects)    ? data.subjects   : []);
      setTasks(              Array.isArray(data.tasks)        ? data.tasks      : []);
      setSessions(           Array.isArray(data.sessions)     ? data.sessions   : []);
      setTemplates(          Array.isArray(data.templates)    ? data.templates  : []);
      setHistoricalSnapshots(typeof data.snapshots === 'object' && data.snapshots ? data.snapshots : {});
      setRecycleBinItems(    Array.isArray(data.recycleBin)   ? data.recycleBin : []);
      setLastSaved(new Date());
      setSaveError(null);
    } catch (err) {
      // Silently ignore — user is likely offline momentarily
      console.warn('StillHour: cloud re-fetch failed:', err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refetchFromCloud();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', refetchFromCloud);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', refetchFromCloud);
    };
  }, [refetchFromCloud]);

  // ── Debounced write to cloud ───────────────────────────────────────────
  const writeTimerRef = useRef(null);

  const scheduleWrite = useCallback(() => {
    if (!isLoadedRef.current) return;
    clearTimeout(writeTimerRef.current);
    writeTimerRef.current = setTimeout(async () => {
      try {
        setIsSyncing(true);
        setSaveError(null);
        await cloudSave(stateRef.current);
        setLastSaved(new Date());
      } catch (err) {
        setSaveError(err.message);
        console.error('StillHour: cloud save failed:', err.message);
      } finally {
        setIsSyncing(false);
      }
    }, WRITE_DEBOUNCE_MS);
  }, []);

  // Trigger a write whenever any data changes (after first load)
  useEffect(() => { scheduleWrite(); }, [subjects, tasks, sessions, templates, historicalSnapshots, recycleBinItems]);

  // ── Helper: stamp updatedAt ────────────────────────────────────────────
  const ts = () => new Date().toISOString();

  // ── Subject methods ────────────────────────────────────────────────────
  const addSubject = (newSub) =>
    setSubjects((prev) => [...prev, { ...newSub, updatedAt: ts() }]);

  const updateSubject = (id, updates) =>
    setSubjects((prev) =>
      prev.map((s) => s.id === id ? { ...s, ...updates, updatedAt: ts() } : s)
    );

  const archiveSubject = (id) =>
    setSubjects((prev) =>
      prev.map((s) => s.id === id ? { ...s, archived: !s.archived, updatedAt: ts() } : s)
    );

  const deleteSubject = (id) => {
    const existing = subjects.find((s) => s.id === id);
    if (existing) {
      const nowMs = Date.now();
      const binItem = {
        id:                 `bin_sub_${id}_${nowMs}`,
        originalStore:      'subjects',
        originalId:         id,
        payload:            existing,
        deletionTimestamp:  nowMs,
        expirationTimestamp: nowMs + 30 * 24 * 60 * 60 * 1000,
      };
      setRecycleBinItems((prev) => [binItem, ...prev]);
    }
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setTasks((prev) => prev.map((t) => (t.linkedSubjectId === id ? { ...t, linkedSubjectId: null } : t)));
  };

  // ── Task methods ───────────────────────────────────────────────────────
  const addTask = (newTask) =>
    setTasks((prev) => [{ ...newTask, updatedAt: ts() }, ...prev]);

  const toggleTask = (id) =>
    setTasks((prev) =>
      prev.map((t) => t.id === id ? { ...t, completed: !t.completed, updatedAt: ts() } : t)
    );

  const deleteTask = (id) => {
    const existing = tasks.find((t) => t.id === id);
    if (existing) {
      const nowMs = Date.now();
      const binItem = {
        id:                  `bin_task_${id}_${nowMs}`,
        originalStore:       'tasks',
        originalId:          id,
        payload:             existing,
        deletionTimestamp:   nowMs,
        expirationTimestamp: nowMs + 30 * 24 * 60 * 60 * 1000,
      };
      setRecycleBinItems((prev) => [binItem, ...prev]);
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const carryForwardTasks = (taskIds, targetDateStr = new Date().toISOString().slice(0, 10)) =>
    setTasks((prev) =>
      prev.map((t) =>
        taskIds.includes(t.id)
          ? { ...t, date: targetDateStr, carriedForwardAt: ts() }
          : t
      )
    );

  // ── Recycle bin ────────────────────────────────────────────────────────
  const restoreFromBin = (binId) => {
    const binItem = recycleBinItems.find((b) => b.id === binId);
    if (!binItem) return;
    if (binItem.originalStore === 'subjects')
      setSubjects((prev) => [...prev, binItem.payload]);
    else if (binItem.originalStore === 'tasks')
      setTasks((prev) => [binItem.payload, ...prev]);
    setRecycleBinItems((prev) => prev.filter((b) => b.id !== binId));
  };

  // ── Template methods ───────────────────────────────────────────────────
  const saveTemplate = (template) =>
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === template.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...template, updatedAt: ts() };
        return copy;
      }
      return [...prev, { ...template, updatedAt: ts() }];
    });

  const deleteTemplate = (id) =>
    setTemplates((prev) => prev.filter((t) => t.id !== id));

  // ── Session methods ────────────────────────────────────────────────────
  const addSession = (session) =>
    setSessions((prev) => {
      if (prev.some((s) => s.id === session.id)) return prev;
      return [session, ...prev];
    });

  const updateSession = (id, updates) =>
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
          correctedAt: ts(),
        };
      })
    );

  // ── Backup / Reset ─────────────────────────────────────────────────────
  const restoreFromJSONBackup = (data) => {
    if (!data || typeof data !== 'object') throw new Error('Invalid backup file');
    if (Array.isArray(data.subjects))  setSubjects(data.subjects);
    if (Array.isArray(data.tasks))     setTasks(data.tasks);
    if (Array.isArray(data.sessions))  setSessions(data.sessions);
    if (Array.isArray(data.templates)) setTemplates(data.templates);
    return true;
  };

  const resetAllData = async () => {
    const empty = { subjects: [], tasks: [], sessions: [], templates: [], snapshots: {}, recycleBin: [] };
    setSubjects([]);
    setTasks([]);
    setSessions([]);
    setTemplates([]);
    setHistoricalSnapshots({});
    setRecycleBinItems([]);
    // Immediately wipe cloud too
    await cloudSave(empty);
  };

  // Manual sync trigger exposed to UI
  const triggerManualSync = refetchFromCloud;
  const syncWithCloud     = refetchFromCloud;

  return (
    <AppDataContext.Provider
      value={{
        // Load state
        loadState,
        loadError,

        // Data
        subjects,
        tasks,
        sessions,
        templates,
        historicalSnapshots,
        recycleBinItems,

        // Sync meta
        isSyncing,
        lastSaved,
        saveError,
        cloudConfigured: true,  // always true in pure-cloud mode
        syncStatus: saveError ? 'error' : isSyncing ? 'syncing' : 'synced',
        lastSyncTime: lastSaved,

        // Subject actions
        addSubject,
        updateSubject,
        archiveSubject,
        deleteSubject,

        // Task actions
        addTask,
        toggleTask,
        deleteTask,
        carryForwardTasks,

        // Recycle bin
        restoreFromBin,

        // Templates
        saveTemplate,
        deleteTemplate,

        // Sessions
        addSession,
        updateSession,

        // Sync
        syncWithCloud,
        triggerManualSync,

        // Backup / Reset
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
  if (!context) throw new Error('useAppData must be used within an AppDataProvider');
  return context;
}
