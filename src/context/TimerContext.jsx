import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  createNewTimerSession,
  getRemainingSeconds,
  getElapsedStudySeconds,
  pauseTimerState,
  resumeTimerState,
  tickTimerState,
  finalizeSessionRecord,
  checkRecoveryNeeded,
} from '../services/timerEngine';
import {
  fetchActiveTimer,
  startRemoteTimer,
  pauseRemoteTimer,
  resumeRemoteTimer,
  stopRemoteTimer,
  discardRemoteTimer,
} from '../services/timerApi';
import { useAppData } from './AppDataContext';

const TimerContext = createContext();

const ACTIVE_TIMER_KEY = 'stillhour_active_timer';

export function TimerProvider({ children }) {
  const { addSession } = useAppData();

  const [activeTimer, setActiveTimer] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [elapsedStudySeconds, setElapsedStudySeconds] = useState(0);

  const [pendingRecovery, setPendingRecovery] = useState(null);
  const [pendingSwitch, setPendingSwitch] = useState(null);
  const [isLandscapeMode, setIsLandscapeMode] = useState(false);
  const [isCloudTimerSynced, setIsCloudTimerSynced] = useState(true);

  // Keep ref to avoid stale closures in interval
  const activeTimerRef = useRef(activeTimer);
  activeTimerRef.current = activeTimer;

  // Screen Wake Lock API reference
  const wakeLockRef = useRef(null);

  // 1. Initial Load: Check remote authoritative state first, fallback to localStorage
  useEffect(() => {
    let isSubscribed = true;

    async function initializeTimer() {
      try {
        const remote = await fetchActiveTimer();
        if (!isSubscribed) return;

        if (remote.success && remote.activeTimer) {
          const t = remote.activeTimer;
          if (t.status === 'running' || t.status === 'paused' || t.status === 'completed') {
            setActiveTimer(t);
            setIsCloudTimerSynced(true);
            localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(t));
            return;
          }
        }
      } catch (err) {
        console.warn('Initial remote timer fetch error:', err.message);
      }

      // Offline fallback: check localStorage
      try {
        const saved = localStorage.getItem(ACTIVE_TIMER_KEY);
        if (saved && isSubscribed) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.status === 'running' || parsed.status === 'paused')) {
            const recovery = checkRecoveryNeeded(parsed, Date.now());
            if (recovery.needsRecovery) {
              setPendingRecovery(recovery);
              setActiveTimer(pauseTimerState(parsed, parsed.lastTickTimestamp || Date.now()));
            } else {
              setActiveTimer(parsed);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load local active timer:', e);
      }
    }

    initializeTimer();
    return () => {
      isSubscribed = false;
    };
  }, []);

  // 2. Multi-device background synchronization polling
  useEffect(() => {
    let isSubscribed = true;

    async function syncWithRemote() {
      try {
        const res = await fetchActiveTimer();
        if (!isSubscribed || !res.success) return;

        const remote = res.activeTimer;
        const current = activeTimerRef.current;

        // Case A: Remote has an active timer, but local has none
        if (remote && (!current || current.status === 'idle')) {
          setActiveTimer(remote);
          localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(remote));
          setIsCloudTimerSynced(true);
          return;
        }

        // Case B: Remote timer ended on another device, but local is still showing it
        if (!remote && current && (current.status === 'running' || current.status === 'paused')) {
          setActiveTimer(null);
          localStorage.removeItem(ACTIVE_TIMER_KEY);
          setIsCloudTimerSynced(true);
          return;
        }

        // Case C: Both exist for same session - sync status (pause/resume/extend)
        if (remote && current && remote.sessionId === current.sessionId) {
          if (
            remote.status !== current.status ||
            Math.abs((remote.targetEndTimestamp || 0) - (current.targetEndTimestamp || 0)) > 2000
          ) {
            setActiveTimer(remote);
            localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(remote));
          }
          setIsCloudTimerSynced(true);
        } else if (remote && current && remote.sessionId !== current.sessionId) {
          // A different session was started on another device
          setActiveTimer(remote);
          localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(remote));
          setIsCloudTimerSynced(true);
        }
      } catch (err) {
        setIsCloudTimerSynced(false);
      }
    }

    // Polling interval: 3s while active, 8s while idle
    const pollIntervalMs = activeTimer ? 3000 : 8000;
    const interval = setInterval(syncWithRemote, pollIntervalMs);

    // Immediate sync on tab visibility or window focus
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncWithRemote();
      }
    };
    const handleFocus = () => {
      syncWithRemote();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [Boolean(activeTimer)]);

  // 3. Screen Wake Lock: Keeps display on during active study
  useEffect(() => {
    async function handleWakeLock() {
      if ('wakeLock' in navigator) {
        if (activeTimer?.status === 'running') {
          try {
            if (!wakeLockRef.current) {
              wakeLockRef.current = await navigator.wakeLock.request('screen');
              wakeLockRef.current.addEventListener('release', () => {
                wakeLockRef.current = null;
              });
            }
          } catch {}
        } else if (wakeLockRef.current) {
          try {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
          } catch {}
        }
      }
    }

    handleWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [activeTimer?.status]);

  // 4. Main timer tick loop
  useEffect(() => {
    if (!activeTimer) {
      setRemainingSeconds(0);
      setElapsedStudySeconds(0);
      return;
    }

    const updateDisplay = () => {
      const now = Date.now();
      const current = activeTimerRef.current;
      if (!current) return;

      const rem = getRemainingSeconds(current, now);
      const ela = getElapsedStudySeconds(current, now);
      setRemainingSeconds(rem);
      setElapsedStudySeconds(ela);

      // Check for auto-completion at zero
      if (current.status === 'running' && rem <= 0 && !current.isSaved) {
        handleAutoCompletion(current, now);
      }
    };

    updateDisplay();

    if (activeTimer.status !== 'running') {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const current = activeTimerRef.current;
      if (!current || current.status !== 'running') return;

      const updated = tickTimerState(current, now);
      setActiveTimer(updated);
      localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(updated));

      const rem = getRemainingSeconds(updated, now);
      const ela = getElapsedStudySeconds(updated, now);
      setRemainingSeconds(rem);
      setElapsedStudySeconds(ela);

      if (rem <= 0 && !updated.isSaved) {
        handleAutoCompletion(updated, now);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer?.status]);

  // Handle countdown hitting zero
  const handleAutoCompletion = async (timerState, nowMs = Date.now()) => {
    if (!timerState || timerState.isSaved) return;

    const stopResult = await stopRemoteTimer({
      discard: false,
      reason: 'timer_completed',
    });

    if (stopResult.finalizedSession) {
      addSession(stopResult.finalizedSession);
    } else {
      const finalized = finalizeSessionRecord(timerState, nowMs, 'timer_completed');
      if (finalized) {
        addSession(finalized);
      }
    }

    const completedState = {
      ...timerState,
      status: 'completed',
      isSaved: true,
    };

    setActiveTimer(completedState);
    localStorage.removeItem(ACTIVE_TIMER_KEY);
  };

  // Start a new timer session (enforcing single active timer rule)
  const startTimer = async ({ subjectId, subjectName, taskId, taskTitle, durationMinutes }) => {
    const newSessionParams = { subjectId, subjectName, taskId, taskTitle, durationMinutes };

    // If an existing timer is already running or paused locally
    if (activeTimer && (activeTimer.status === 'running' || activeTimer.status === 'paused')) {
      const pausedActive = pauseTimerState(activeTimer, Date.now());
      setActiveTimer(pausedActive);
      pauseRemoteTimer();

      setPendingSwitch({
        activeSession: pausedActive,
        newSessionParams,
      });
      return;
    }

    // Attempt authoritative start on server
    const result = await startRemoteTimer(newSessionParams);

    if (result.conflict) {
      // Another device is already actively running or paused
      setPendingSwitch({
        activeSession: result.activeTimer,
        newSessionParams,
        isRemoteConflict: true,
      });
      return;
    }

    if (result.success && result.activeTimer) {
      setActiveTimer(result.activeTimer);
      setRemainingSeconds(result.activeTimer.plannedDurationSeconds);
      setElapsedStudySeconds(0);
      localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(result.activeTimer));
    } else {
      // Offline fallback: initiate session locally
      initiateLocalSession(newSessionParams);
    }
  };

  const initiateLocalSession = (params) => {
    const session = createNewTimerSession(params);
    setActiveTimer(session);
    setRemainingSeconds(session.plannedDurationSeconds);
    setElapsedStudySeconds(0);
    localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(session));
  };

  // Pause active session
  const pauseTimer = async () => {
    if (!activeTimer || activeTimer.status !== 'running') return;
    const nowMs = Date.now();
    const updated = pauseTimerState(activeTimer, nowMs);
    setActiveTimer(updated);
    localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(updated));
    await pauseRemoteTimer();
  };

  // Resume active session
  const resumeTimer = async () => {
    if (!activeTimer || activeTimer.status !== 'paused') return;
    const nowMs = Date.now();
    const updated = resumeTimerState(activeTimer, nowMs);
    setActiveTimer(updated);
    localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(updated));
    await resumeRemoteTimer();
  };

  // Stop session manually
  const stopAndSaveTimer = async (discard = false, reason = 'manual_stop') => {
    if (!activeTimer) return;
    const current = activeTimer;

    const stopResult = await stopRemoteTimer({ discard, reason });

    if (!discard) {
      if (stopResult.finalizedSession && stopResult.finalizedSession.durationSeconds > 0) {
        addSession(stopResult.finalizedSession);
      } else if (!current.isSaved) {
        const finalized = finalizeSessionRecord(current, Date.now(), reason);
        if (finalized && finalized.durationSeconds > 0) {
          addSession(finalized);
        }
      }
    }

    setActiveTimer(null);
    setRemainingSeconds(0);
    setElapsedStudySeconds(0);
    localStorage.removeItem(ACTIVE_TIMER_KEY);
  };

  // Resolve crash / sleep recovery
  const resolveRecovery = (action) => {
    if (!pendingRecovery) return;
    const { state } = pendingRecovery;
    const now = Date.now();

    if (action === 'resumeVerified') {
      const pausedAt = state.lastTickTimestamp || state.startTimestamp;
      const updated = {
        ...state,
        targetEndTimestamp: state.targetEndTimestamp + (now - pausedAt),
        pauses: [
          ...(state.pauses || []),
          {
            pausedAt,
            pausedAtISO: new Date(pausedAt).toISOString(),
            resumedAt: now,
            resumedAtISO: new Date(now).toISOString(),
          },
        ],
        status: 'running',
        lastTickTimestamp: now,
      };
      setActiveTimer(updated);
      localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(updated));
      resumeRemoteTimer();
    } else if (action === 'creditGap') {
      const updated = {
        ...state,
        status: 'running',
        lastTickTimestamp: now,
        recoveryEvents: [
          ...(state.recoveryEvents || []),
          {
            type: 'gap_credited',
            timestamp: now,
            timestampISO: new Date(now).toISOString(),
          },
        ],
      };
      setActiveTimer(updated);
      localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(updated));
      resumeRemoteTimer();
    } else if (action === 'discard') {
      stopAndSaveTimer(true, 'manual_discard');
    }

    setPendingRecovery(null);
  };

  // Resolve switch confirmation
  const confirmSwitch = async () => {
    if (!pendingSwitch) return;
    const { newSessionParams, activeSession, isRemoteConflict } = pendingSwitch;

    // Save current session before switching if not remote conflict
    if (activeSession && !activeSession.isSaved && !isRemoteConflict) {
      await stopAndSaveTimer(false, 'switched');
    }

    // Force start on server
    const result = await startRemoteTimer({ ...newSessionParams, force: true });
    if (result.success && result.activeTimer) {
      setActiveTimer(result.activeTimer);
      setRemainingSeconds(result.activeTimer.plannedDurationSeconds);
      setElapsedStudySeconds(0);
      localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(result.activeTimer));
    } else {
      initiateLocalSession(newSessionParams);
    }

    setPendingSwitch(null);
  };

  const cancelSwitch = () => {
    if (pendingSwitch?.isRemoteConflict && pendingSwitch?.activeSession) {
      // Adopt and display remote active session
      setActiveTimer(pendingSwitch.activeSession);
      localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(pendingSwitch.activeSession));
    }
    setPendingSwitch(null);
  };

  return (
    <TimerContext.Provider
      value={{
        activeTimer,
        remainingSeconds,
        elapsedStudySeconds,
        pendingRecovery,
        pendingSwitch,
        isLandscapeMode,
        setIsLandscapeMode,
        isCloudTimerSynced,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopAndSaveTimer,
        resolveRecovery,
        confirmSwitch,
        cancelSwitch,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}
