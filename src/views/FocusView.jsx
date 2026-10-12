import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Coffee,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Sparkles,
  Award,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { useNavigation } from '../context/NavigationContext';
import { useTimer } from '../context/TimerContext';
import { formatSecondsToTimer } from '../utils/timeUtils';

export default function FocusView({ subjects = [], tasks = [] }) {
  const { setCurrentView } = useNavigation();
  const {
    activeTimer,
    remainingSeconds,
    elapsedStudySeconds,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopAndSaveTimer,
  } = useTimer();

  // Local selection state for when no timer is running
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || '');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [durationPreset, setDurationPreset] = useState(25); // minutes
  const [isPomodoro, setIsPomodoro] = useState(false);

  // Keep selectedSubjectId valid if subjects are deleted
  useEffect(() => {
    if (subjects.length > 0) {
      if (!selectedSubjectId || !subjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(subjects[0].id);
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [subjects, selectedSubjectId]);

  const presets = [
    { mins: 25, label: '25m' },
    { mins: 45, label: '45m' },
    { mins: 60, label: '60m' },
    { mins: 90, label: '90m' },
    { mins: 120, label: '2 hours', isDeep: true },
  ];

  const isTimerActive = activeTimer && (activeTimer.status === 'running' || activeTimer.status === 'paused');
  const isTimerCompleted = activeTimer && activeTimer.status === 'completed';

  const handleStart = () => {
    const chosenSubjectId = selectedSubjectId || subjects[0]?.id;
    if (!chosenSubjectId) {
      alert('Please create and select a subject before starting a study session.');
      return;
    }

    const subObj = subjects.find((s) => s.id === chosenSubjectId);
    const taskObj = tasks.find((t) => t.id === selectedTaskId);

    startTimer({
      subjectId: chosenSubjectId,
      subjectName: subObj ? subObj.name : 'Study',
      taskId: selectedTaskId || null,
      taskTitle: taskObj ? taskObj.title : null,
      durationMinutes: durationPreset,
    });
  };

  const displayTime = isTimerActive
    ? formatSecondsToTimer(remainingSeconds)
    : isTimerCompleted
    ? '00:00'
    : formatSecondsToTimer(durationPreset * 60);

  const currentSubjectName = isTimerActive
    ? activeTimer.subjectName
    : subjects.find((s) => s.id === selectedSubjectId)?.name || 'Select subject';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Subject Check Warning */}
      {subjects.length === 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-amber-900 dark:text-amber-200">
              No subjects registered yet
            </h4>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
              Every study session requires an assigned subject. Please create at least one subject to log study duration.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCurrentView('subjects')}
          >
            Create Subject
          </Button>
        </div>
      )}

      {/* Completion Banner */}
      {isTimerCompleted && (
        <div className="p-5 rounded-3xl bg-lilac-100/70 dark:bg-charcoal-850 border border-lilac-300 dark:border-lilac-800 text-center animate-in fade-in duration-300">
          <div className="inline-flex p-2 rounded-2xl bg-lilac-600 text-white mb-2 shadow-sm">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-lg font-medium text-espresso-900 dark:text-cream-50">
            Study Session Complete
          </h3>
          <p className="text-xs text-espresso-600 dark:text-cream-300 mt-1 max-w-md mx-auto">
            Your study time has been recorded to history and applied to your daily target. Take a calm breath.
          </p>
          <div className="mt-4">
            <Button
              size="sm"
              variant="primary"
              onClick={() => stopAndSaveTimer(true)}
            >
              Start Another Block
            </Button>
          </div>
        </div>
      )}

      {/* Main Focus Card */}
      <Card className="text-center py-10 px-6 sm:px-12 relative overflow-hidden">
        {/* Subtle decorative aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-lilac-200/30 dark:bg-lilac-900/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Configuration Bar: Subject & Task Selector */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3 mb-6 max-w-xl mx-auto">
          {/* Subject Dropdown */}
          <div className="w-full sm:w-1/2 text-left">
            <label className="block text-xs font-medium text-espresso-500 dark:text-cream-400 mb-1">
              Study Subject <span className="text-rose-500">*</span>
            </label>
            {isTimerActive ? (
              <div className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-100/60 dark:bg-charcoal-800 text-espresso-900 dark:text-cream-50 text-sm font-medium flex items-center justify-between">
                <span>{activeTimer.subjectName}</span>
                <Badge variant="lilac">Locked</Badge>
              </div>
            ) : (
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={subjects.length === 0}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-800 text-espresso-900 dark:text-cream-50 text-sm font-medium focus:ring-2 focus:ring-lilac-400 focus:outline-none"
              >
                {subjects.length === 0 ? (
                  <option value="">No subjects created</option>
                ) : (
                  subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.priority})
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* Optional Task Dropdown */}
          <div className="w-full sm:w-1/2 text-left">
            <label className="block text-xs font-medium text-espresso-500 dark:text-cream-400 mb-1">
              Optional Task Link
            </label>
            {isTimerActive ? (
              <div className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-100/60 dark:bg-charcoal-800 text-espresso-900 dark:text-cream-50 text-sm font-medium truncate">
                {activeTimer.taskTitle || 'None (Unlinked Session)'}
              </div>
            ) : (
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-800 text-espresso-900 dark:text-cream-50 text-sm font-medium focus:ring-2 focus:ring-lilac-400 focus:outline-none"
              >
                <option value="">None (Unlinked Session)</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Large Countdown Display */}
        <div className="relative z-10 my-6">
          <div className="font-mono text-7xl sm:text-8xl md:text-9xl font-light tracking-tight text-espresso-900 dark:text-cream-50 tabular-nums select-none">
            {displayTime}
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                activeTimer?.status === 'running'
                  ? 'bg-emerald-500 animate-ping'
                  : activeTimer?.status === 'paused'
                  ? 'bg-amber-500'
                  : 'bg-cream-300 dark:bg-charcoal-700'
              }`}
            />
            <span className="text-xs uppercase tracking-widest font-mono text-espresso-400 dark:text-cream-400">
              {activeTimer?.status === 'running'
                ? `Studying ${currentSubjectName}`
                : activeTimer?.status === 'paused'
                ? 'Paused (Duration Excluded)'
                : 'Ready'}
            </span>
          </div>

          {/* Elapsed Time & Pauses Counter */}
          {isTimerActive && (
            <p className="text-xs font-mono text-espresso-500 dark:text-cream-400 mt-2">
              Net study accrued: {formatSecondsToTimer(elapsedStudySeconds)} | {activeTimer.pauses?.length || 0} pauses
            </p>
          )}
        </div>

        {/* Duration Presets (Only interactive when idle) */}
        {!isTimerActive && (
          <div className="relative z-10 flex items-center justify-center gap-2 mb-8 flex-wrap">
            {presets.map((preset) => (
              <button
                key={preset.mins}
                type="button"
                onClick={() => setDurationPreset(preset.mins)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                  durationPreset === preset.mins
                    ? 'bg-lilac-600 text-white dark:bg-lilac-500 dark:text-white shadow-sm ring-1 ring-lilac-500'
                    : 'bg-cream-100 hover:bg-cream-200 text-espresso-700 dark:bg-charcoal-800 dark:hover:bg-charcoal-750 dark:text-cream-300 border border-cream-200 dark:border-charcoal-700'
                } ${preset.isDeep ? 'font-serif tracking-tight' : ''}`}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsPomodoro(!isPomodoro)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                isPomodoro
                  ? 'bg-lilac-100 dark:bg-charcoal-750 border-lilac-300 text-lilac-800 dark:text-lavender-300'
                  : 'bg-cream-100 dark:bg-charcoal-800 border-cream-200 dark:border-charcoal-700 text-espresso-600 dark:text-cream-400'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Pomodoro Mode</span>
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="relative z-10 flex items-center justify-center gap-4">
          {!isTimerActive && (
            <Button
              size="lg"
              variant="primary"
              icon={Play}
              onClick={handleStart}
              disabled={subjects.length === 0}
              className="px-8 shadow-md"
            >
              Start Focus Session
            </Button>
          )}

          {activeTimer?.status === 'running' && (
            <div className="flex items-center gap-3">
              <Button
                size="lg"
                variant="secondary"
                icon={Pause}
                onClick={pauseTimer}
              >
                Pause
              </Button>
              <Button
                size="lg"
                variant="danger"
                icon={Square}
                onClick={() => stopAndSaveTimer(false)}
              >
                Stop & Save
              </Button>
            </div>
          )}

          {activeTimer?.status === 'paused' && (
            <div className="flex items-center gap-3">
              <Button
                size="lg"
                variant="primary"
                icon={Play}
                onClick={resumeTimer}
              >
                Resume
              </Button>
              <Button
                size="lg"
                variant="outline"
                icon={Square}
                onClick={() => stopAndSaveTimer(false)}
              >
                Stop & Save ({formatSecondsToTimer(elapsedStudySeconds)})
              </Button>
            </div>
          )}
        </div>

        <p className="text-[11px] text-espresso-400 dark:text-cream-400 mt-8">
          Accurate timestamps exclude pause time. Sessions shorter than 60s remain in history but are excluded from study totals and targets.
        </p>
      </Card>
    </div>
  );
}
