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

  // Keep ref to avoid stale closures in interval
  const activeTimerRef = useRef(activeTimer);
  activeTimerRef.current = activeTimer;

  // 1. Initial Load: Check for restored timer state and recovery need
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_TIMER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.status === 'running' || parsed.status === 'paused')) {
          const recovery = checkRecoveryNeeded(parsed, Date.now());
          if (recovery.needsRecovery) {
            setPendingRecovery(recovery);
            // Pause it in background while user decides
            setActiveTimer(pauseTimerState(parsed, parsed.lastTickTimestamp || Date.now()));
          } else {
            setActiveTimer(parsed);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load active timer:', e);
    }
  }, []);

  // 2. Main timer tick loop
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

      // Check for completion at zero
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
  const handleAutoCompletion = (timerState, nowMs = Date.now()) => {
    if (!timerState || timerState.isSaved) return;

    const finalized = finalizeSessionRecord(timerState, nowMs);
    if (finalized) {
      addSession(finalized);
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
  const startTimer = ({ subjectId, subjectName, taskId, taskTitle, durationMinutes }) => {
    const newSessionParams = { subjectId, subjectName, taskId, taskTitle, durationMinutes };

    // If an existing timer is already running or paused, ask for confirmation
    if (activeTimer && (activeTimer.status === 'running' || activeTimer.status === 'paused')) {
      const pausedActive = pauseTimerState(activeTimer, Date.now());
      setActiveTimer(pausedActive);
      localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(pausedActive));

      setPendingSwitch({
        activeSession: pausedActive,
        newSessionParams,
      });
      return;
    }

    initiateSession(newSessionParams);
  };

  const initiateSession = (params) => {
    const session = createNewTimerSession(params);
    setActiveTimer(session);
    setRemainingSeconds(session.plannedDurationSeconds);
    setElapsedStudySeconds(0);
    localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(session));
  };

  // Pause active session
  const pauseTimer = () => {
    if (!activeTimer || activeTimer.status !== 'running') return;
    const updated = pauseTimerState(activeTimer, Date.now());
    setActiveTimer(updated);
    localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(updated));
  };

  // Resume active session
  const resumeTimer = () => {
    if (!activeTimer || activeTimer.status !== 'paused') return;
    const updated = resumeTimerState(activeTimer, Date.now());
    setActiveTimer(updated);
    localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(updated));
  };

  // Stop session manually
  const stopAndSaveTimer = (discard = false) => {
    if (!activeTimer) return;

    if (!discard && !activeTimer.isSaved) {
      const finalized = finalizeSessionRecord(activeTimer, Date.now());
      if (finalized && finalized.durationSeconds > 0) {
        addSession(finalized);
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
    const { state, gapSeconds } = pendingRecovery;
    const now = Date.now();

    if (action === 'resumeVerified') {
      // Treat gap as pause interval
      const pausedAt = state.lastTickTimestamp || state.startTimestamp;
      const updated = {
        ...state,
        targetEndTimestamp: state.targetEndTimestamp + (now - pausedAt),
        pauses: [...(state.pauses || []), { pausedAt, resumedAt: now }],
        status: 'running',
        lastTickTimestamp: now,
      };
      setActiveTimer(updated);
      localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(updated));
    } else if (action === 'creditGap') {
      // Credit gap as studied time
      const updated = {
        ...state,
        status: 'running',
        lastTickTimestamp: now,
      };
      setActiveTimer(updated);
      localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(updated));
    } else if (action === 'discard') {
      setActiveTimer(null);
      localStorage.removeItem(ACTIVE_TIMER_KEY);
    }

    setPendingRecovery(null);
  };

  // Resolve switch confirmation
  const confirmSwitch = () => {
    if (!pendingSwitch) return;
    // Save current session before switching
    if (activeTimer && !activeTimer.isSaved) {
      const finalized = finalizeSessionRecord(activeTimer, Date.now());
      if (finalized && finalized.durationSeconds > 0) {
        addSession(finalized);
      }
    }

    initiateSession(pendingSwitch.newSessionParams);
    setPendingSwitch(null);
  };

  const cancelSwitch = () => {
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
