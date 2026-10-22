/**
 * AppDataContext.jsx
 * 
 * Single source of truth: Vercel KV (via /api/sync).
 * Pure cloud storage without local caching or resurrection bugs.
 * Deletion is immediate, authoritative, and synchronously saved to the cloud.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { cloudFetch, cloudSave } from '../services/cloudStore';

const AppDataContext = createContext();

// How long to debounce background writes for minor state changes (ms)
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
  const [settings,            setSettings]            = useState({
    weeklyTargetHours: 15,
    correctionWindowMinutes: 15,
    carryForwardUnfinished: true,
    idleWarningEnabled: true,
    restDays: ['Sunday'],
  });

  // ── Sync meta ──────────────────────────────────────────────────────────
  const [isSyncing,  setIsSyncing]  = useState(false);
  const [lastSaved,  setLastSaved]  = useState(null);
  const [saveError,  setSaveError]  = useState(null);

  // Keep a ref to always-current state for the debounced writer
  const stateRef = useRef({});
  stateRef.current = { subjects, tasks, sessions, templates, historicalSnapshots, recycleBinItems, settings };

  // Timestamp of the most recent user action (prevents re-fetch race conditions)
  const lastLocalActionRef = useRef(0);

  // Track whether initial load has finished so we don't write on first render
  const isLoadedRef = useRef(false);
  const writeTimerRef = useRef(null);

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
        if (data.settings && typeof data.settings === 'object') {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }

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

  // Re-fetch when user returns to the tab (safely guarded against overwriting fresh actions)
  const refetchFromCloud = useCallback(async () => {
    // If saving right now or if the user performed an action within the last 3.5 seconds, DO NOT overwrite!
    if (isSyncing || Date.now() - lastLocalActionRef.current < 3500) {
      return;
    }

    try {
      setIsSyncing(true);
      const data = await cloudFetch();
      // Double check that user hasn't made a local change while network request was pending
      if (Date.now() - lastLocalActionRef.current < 3500) {
        return;
      }

      setSubjects(           Array.isArray(data.subjects)    ? data.subjects   : []);
      setTasks(              Array.isArray(data.tasks)        ? data.tasks      : []);
      setSessions(           Array.isArray(data.sessions)     ? data.sessions   : []);
      setTemplates(          Array.isArray(data.templates)    ? data.templates  : []);
      setHistoricalSnapshots(typeof data.snapshots === 'object' && data.snapshots ? data.snapshots : {});
      setRecycleBinItems(    Array.isArray(data.recycleBin)   ? data.recycleBin : []);
      if (data.settings && typeof data.settings === 'object') {
        setSettings((prev) => ({ ...prev, ...data.settings }));
      }
      setLastSaved(new Date());
      setSaveError(null);
    } catch (err) {
      console.warn('StillHour: cloud re-fetch ignored:', err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refetchFromCloud();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refetchFromCloud]);

  // ── Debounced write helper ─────────────────────────────────────────────
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

  // Background sync for general changes
  useEffect(() => {
    scheduleWrite();
  }, [sessions, templates, historicalSnapshots]);

  // ── Helper: stamp updatedAt ────────────────────────────────────────────
  const ts = () => new Date().toISOString();

  // ── Subject methods ────────────────────────────────────────────────────
  const addSubject = async (newSub) => {
    lastLocalActionRef.current = Date.now();
    clearTimeout(writeTimerRef.current);

    const item = { ...newSub, updatedAt: ts() };
    const updatedSubjects = [...subjects, item];
    setSubjects(updatedSubjects);

    try {
      setIsSyncing(true);
      await cloudSave({
        subjects: updatedSubjects,
        tasks,
        sessions,
        templates,
        snapshots: historicalSnapshots,
        recycleBin: recycleBinItems,
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to save added subject:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateSubject = async (id, updates) => {
    lastLocalActionRef.current = Date.now();
    clearTimeout(writeTimerRef.current);

    const updatedSubjects = subjects.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: ts() } : s));
    setSubjects(updatedSubjects);

    try {
      setIsSyncing(true);
      await cloudSave({
        subjects: updatedSubjects,
        tasks,
        sessions,
        templates,
        snapshots: historicalSnapshots,
        recycleBin: recycleBinItems,
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to update subject:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Immediate authoritative delete
  const deleteSubject = async (id) => {
    lastLocalActionRef.current = Date.now();
    clearTimeout(writeTimerRef.current);

    const updatedSubjects = subjects.filter((s) => s.id !== id);
    const updatedTasks = tasks.map((t) => (t.linkedSubjectId === id ? { ...t, linkedSubjectId: null } : t));
    
    setSubjects(updatedSubjects);
    setTasks(updatedTasks);

    const existing = subjects.find((s) => s.id === id);
    let updatedBin = recycleBinItems;
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
      updatedBin = [binItem, ...recycleBinItems];
      setRecycleBinItems(updatedBin);
    }

    try {
      setIsSyncing(true);
      await cloudSave({
        subjects: updatedSubjects,
        tasks: updatedTasks,
        sessions,
        templates,
        snapshots: historicalSnapshots,
        recycleBin: updatedBin,
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to save deleted subject to cloud:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Task methods ───────────────────────────────────────────────────────
  const addTask = async (newTask) => {
    lastLocalActionRef.current = Date.now();
    clearTimeout(writeTimerRef.current);

    const item = { ...newTask, updatedAt: ts() };
    const updatedTasks = [item, ...tasks];
    setTasks(updatedTasks);

    try {
      setIsSyncing(true);
      await cloudSave({
        subjects,
        tasks: updatedTasks,
        sessions,
        templates,
        snapshots: historicalSnapshots,
        recycleBin: recycleBinItems,
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to add task:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleTask = async (id) => {
    lastLocalActionRef.current = Date.now();
    clearTimeout(writeTimerRef.current);

    const updatedTasks = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed, updatedAt: ts() } : t));
    setTasks(updatedTasks);

    try {
      setIsSyncing(true);
      await cloudSave({
        subjects,
        tasks: updatedTasks,
        sessions,
        templates,
        snapshots: historicalSnapshots,
        recycleBin: recycleBinItems,
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to toggle task:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteTask = async (id) => {
    lastLocalActionRef.current = Date.now();
    clearTimeout(writeTimerRef.current);

    const existing = tasks.find((t) => t.id === id);
    const updatedTasks = tasks.filter((t) => t.id !== id);
    setTasks(updatedTasks);

    let updatedBin = recycleBinItems;
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
      updatedBin = [binItem, ...recycleBinItems];
      setRecycleBinItems(updatedBin);
    }

    try {
      setIsSyncing(true);
      await cloudSave({
        subjects,
        tasks: updatedTasks,
        sessions,
        templates,
        snapshots: historicalSnapshots,
        recycleBin: updatedBin,
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const carryForwardTasks = (taskIds, targetDateStr = new Date().toISOString().slice(0, 10)) => {
    lastLocalActionRef.current = Date.now();
    setTasks((prev) =>
      prev.map((t) =>
        taskIds.includes(t.id)
          ? { ...t, date: targetDateStr, carriedForwardAt: ts() }
          : t
      )
    );
  };

  // ── Recycle bin ────────────────────────────────────────────────────────
  const restoreFromBin = async (binId) => {
    lastLocalActionRef.current = Date.now();
    const binItem = recycleBinItems.find((b) => b.id === binId);
    if (!binItem) return;

    let updatedSubjects = subjects;
    let updatedTasks = tasks;
    const updatedBin = recycleBinItems.filter((b) => b.id !== binId);

    if (binItem.originalStore === 'subjects') {
      updatedSubjects = [...subjects, binItem.payload];
      setSubjects(updatedSubjects);
    } else if (binItem.originalStore === 'tasks') {
      updatedTasks = [binItem.payload, ...tasks];
      setTasks(updatedTasks);
    }
    setRecycleBinItems(updatedBin);

    try {
      setIsSyncing(true);
      await cloudSave({
        subjects: updatedSubjects,
        tasks: updatedTasks,
        sessions,
        templates,
        snapshots: historicalSnapshots,
        recycleBin: updatedBin,
      });
      setLastSaved(new Date());
    } finally {
      setIsSyncing(false);
    }
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
  const addSession = async (session) => {
    lastLocalActionRef.current = Date.now();
    if (sessions.some((s) => s.id === session.id)) return;
    const updatedSessions = [session, ...sessions];
    setSessions(updatedSessions);

    try {
      setIsSyncing(true);
      await cloudSave({
        subjects,
        tasks,
        sessions: updatedSessions,
        templates,
        snapshots: historicalSnapshots,
        recycleBin: recycleBinItems,
      });
      setLastSaved(new Date());
    } finally {
      setIsSyncing(false);
    }
  };

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

  // ── Settings methods ───────────────────────────────────────────────────
  const updateSettings = async (updates) => {
    lastLocalActionRef.current = Date.now();
    clearTimeout(writeTimerRef.current);
    const updatedSettings = { ...settings, ...updates };
    setSettings(updatedSettings);

    try {
      setIsSyncing(true);
      await cloudSave({
        subjects,
        tasks,
        sessions,
        templates,
        snapshots: historicalSnapshots,
        recycleBin: recycleBinItems,
        settings: updatedSettings,
      });
      setLastSaved(new Date());
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Backup / Reset ─────────────────────────────────────────────────────
  const restoreFromJSONBackup = async (data) => {
    if (!data || typeof data !== 'object') throw new Error('Invalid backup file');
    const source = data.data && typeof data.data === 'object' ? data.data : data;
    const newSubjects = Array.isArray(source.subjects) ? source.subjects : [];
    const newTasks = Array.isArray(source.tasks) ? source.tasks : [];
    const newSessions = Array.isArray(source.sessions) ? source.sessions : [];
    const newTemplates = Array.isArray(source.templates) ? source.templates : [];
    const newSettings = source.settings && typeof source.settings === 'object' ? source.settings : settings;
    const newSnapshots = typeof source.snapshots === 'object' && source.snapshots ? source.snapshots : {};
    const newRecycleBin = Array.isArray(source.recycleBin) ? source.recycleBin : [];

    setSubjects(newSubjects);
    setTasks(newTasks);
    setSessions(newSessions);
    setTemplates(newTemplates);
    setSettings(newSettings);
    setHistoricalSnapshots(newSnapshots);
    setRecycleBinItems(newRecycleBin);

    await cloudSave({
      subjects: newSubjects,
      tasks: newTasks,
      sessions: newSessions,
      templates: newTemplates,
      snapshots: newSnapshots,
      recycleBin: newRecycleBin,
      settings: newSettings,
    });
    return true;
  };

  const resetAllData = async () => {
    const empty = { subjects: [], tasks: [], sessions: [], templates: [], snapshots: {}, recycleBin: [], settings: {} };
    setSubjects([]);
    setTasks([]);
    setSessions([]);
    setTemplates([]);
    setHistoricalSnapshots({});
    setRecycleBinItems([]);
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
        settings,

        // Sync meta
        isSyncing,
        lastSaved,
        saveError,
        cloudConfigured: true,
        syncStatus: saveError ? 'error' : isSyncing ? 'syncing' : 'synced',
        lastSyncTime: lastSaved,

        // Subject actions
        addSubject,
        updateSubject,
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

        // Settings
        updateSettings,

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
