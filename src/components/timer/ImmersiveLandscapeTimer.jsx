import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Cloud,
  CheckCircle2,
} from 'lucide-react';
import { useTimer } from '../../context/TimerContext';
import { formatSecondsToTimer } from '../../utils/timeUtils';

export default function ImmersiveLandscapeTimer({ onClose }) {
  const {
    activeTimer,
    remainingSeconds,
    elapsedStudySeconds,
    pauseTimer,
    resumeTimer,
    stopAndSaveTimer,
    isCloudTimerSynced,
  } = useTimer();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const hideTimerRef = useRef(null);

  const isRunning = activeTimer?.status === 'running';
  const isPaused = activeTimer?.status === 'paused';
  const isCompleted = activeTimer?.status === 'completed';

  // Total planned duration in seconds
  const totalSeconds = activeTimer?.plannedDurationSeconds || 1500;
  const progressRatio = Math.max(0, Math.min(1, (totalSeconds - remainingSeconds) / totalSeconds));
  const progressPercent = Math.round(progressRatio * 100);

  // Auto-hide controls during running sessions after 3.5s of inactivity
  const resetHideTimer = () => {
    setControlsVisible(true);
    clearTimeout(hideTimerRef.current);

    if (isRunning && !showStopConfirm) {
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3500);
    }
  };

  useEffect(() => {
    resetHideTimer();

    const handleActivity = () => resetHideTimer();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      clearTimeout(hideTimerRef.current);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [isRunning, showStopConfirm]);

  // Track Fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err.message);
    }
  };

  const handleStop = () => {
    setShowStopConfirm(true);
    setControlsVisible(true);
  };

  const confirmStop = () => {
    setShowStopConfirm(false);
    stopAndSaveTimer(false, 'manual_stop');
    if (onClose) onClose();
  };

  const displayTime = formatSecondsToTimer(remainingSeconds);

  return (
    <div
      onClick={resetHideTimer}
      className="fixed inset-0 z-50 bg-[#F5EFEB] dark:bg-[#141110] text-[#28211E] dark:text-[#F5EFEB] flex flex-col justify-between pt-safe pb-safe pl-safe pr-safe select-none transition-colors duration-300 overflow-hidden"
    >
      {/* Top Header Bar */}
      <header
        className={`flex items-center justify-between w-full transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="font-serif text-lg tracking-tight font-semibold text-espresso-900 dark:text-cream-50">
            StillHour
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cream-200/70 dark:bg-charcoal-800 text-espresso-600 dark:text-cream-300 flex items-center gap-1.5 border border-cream-300/50 dark:border-charcoal-700">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            {isCloudTimerSynced ? 'Universal Sync' : 'Offline'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
            className="p-2.5 rounded-2xl bg-cream-200/60 dark:bg-charcoal-800 text-espresso-700 dark:text-cream-200 hover:bg-cream-300 dark:hover:bg-charcoal-700 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Exit Landscape Display"
            className="p-2.5 rounded-2xl bg-cream-200/60 dark:bg-charcoal-800 text-espresso-700 dark:text-cream-200 hover:bg-cream-300 dark:hover:bg-charcoal-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Center Stage: Massive StandBy Numerals & Subject Focus */}
      <main className="flex-1 flex flex-col items-center justify-center my-auto px-4 text-center">
        {/* Massive StandBy Clock */}
        <div className="font-mono text-[20vw] sm:text-[18vw] font-extralight tracking-tighter tabular-nums leading-none text-espresso-950 dark:text-cream-50 drop-shadow-sm select-none">
          {displayTime}
        </div>

        {/* Minimal Progress Line */}
        <div className="w-full max-w-xl h-1.5 bg-cream-200/80 dark:bg-charcoal-800 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full bg-lilac-600 dark:bg-lilac-400 transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Subject & Subtitle */}
        <div className="mt-3 flex flex-col items-center">
          <div className="font-serif text-xl sm:text-2xl text-espresso-900 dark:text-cream-50 font-medium tracking-wide">
            {activeTimer?.subjectName || 'Study Session'}
          </div>
          {activeTimer?.taskTitle && (
            <div className="text-xs text-espresso-500 dark:text-cream-400 mt-0.5 truncate max-w-md">
              {activeTimer.taskTitle}
            </div>
          )}
          <div className="text-[11px] font-mono text-espresso-400 dark:text-cream-400 mt-1">
            {isPaused
              ? 'Paused • Time excluded'
              : isCompleted
              ? 'Complete'
              : `Net studied: ${formatSecondsToTimer(elapsedStudySeconds)}`}
          </div>
        </div>
      </main>

      {/* Bottom Floating Controls */}
      <footer
        className={`w-full flex items-center justify-center pb-2 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {showStopConfirm ? (
          <div className="flex items-center gap-3 p-2 bg-cream-100 dark:bg-charcoal-850 rounded-2xl border border-cream-300 dark:border-charcoal-700 shadow-xl animate-in fade-in duration-200">
            <span className="text-xs text-espresso-700 dark:text-cream-300 font-medium pl-3">
              Stop & log session?
            </span>
            <button
              type="button"
              onClick={() => setShowStopConfirm(false)}
              className="px-3.5 py-2 text-xs font-medium rounded-xl text-espresso-600 dark:text-cream-400 hover:bg-cream-200 dark:hover:bg-charcoal-750 transition-colors"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={confirmStop}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
            >
              Stop & Save
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4 bg-cream-200/50 dark:bg-charcoal-850/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-cream-300/60 dark:border-charcoal-700 shadow-lg">
            {isRunning && (
              <button
                type="button"
                onClick={pauseTimer}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-cream-100 dark:bg-charcoal-750 text-espresso-800 dark:text-cream-100 hover:bg-cream-200 dark:hover:bg-charcoal-700 font-medium text-xs transition-colors"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
            )}

            {isPaused && (
              <button
                type="button"
                onClick={resumeTimer}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-lilac-600 text-white hover:bg-lilac-700 font-medium text-xs transition-colors shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleStop}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-cream-100 dark:bg-charcoal-750 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium text-xs transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop & Save</span>
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}
