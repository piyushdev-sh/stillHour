import React, { useState, useEffect } from 'react';
import {
  Timer,
  CheckCircle2,
  TrendingUp,
  Target,
  ArrowRight,
  BookOpen,
  Calendar,
  Sparkles,
  Flame,
  Clock,
  Play,
  Pause,
  Square,
  Award,
  RefreshCw,
  CheckSquare,
  Check,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import { useNavigation } from '../context/NavigationContext';
import { useTimer } from '../context/TimerContext';
import { useAppData } from '../context/AppDataContext';
import { isEligibleStudySession, formatSecondsToTimer } from '../utils/timeUtils';
import { calculateConsistencyStreak } from '../services/planningEngine';

const MOTIVATIONAL_QUOTES = [
  'Small hours. Remarkable progress.',
  'Begin where you are.',
  'Deep work is quiet work.',
  'One focused hour changes the day.',
  'Stillness precedes mastery.',
  'Honor the work in front of you.',
];

const PRESETS = [
  { mins: 25, label: '25m' },
  { mins: 45, label: '45m' },
  { mins: 60, label: '60m' },
  { mins: 90, label: '90m' },
  { mins: 120, label: '2 hours', isDeep: true },
];

export default function DashboardView({ subjects = [], sessions = [], tasks = [] }) {
  const { setCurrentView } = useNavigation();
  const { toggleTask } = useAppData();
  const {
    activeTimer,
    remainingSeconds,
    elapsedStudySeconds,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopAndSaveTimer,
  } = useTimer();

  // Local state for inline quick-start launcher
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || '');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [durationPreset, setDurationPreset] = useState(25);

  // Automatically keep selectedSubjectId in sync with subjects
  useEffect(() => {
    if (subjects.length > 0) {
      if (!selectedSubjectId || !subjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(subjects[0].id);
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [subjects, selectedSubjectId]);

  // Rotating quote index initialized by day-of-year
  const [quoteIndex, setQuoteIndex] = useState(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24)
    );
    return Math.abs(dayOfYear) % MOTIVATIONAL_QUOTES.length;
  });

  const nextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const eligibleSessionsToday = sessions.filter(
    (s) => s.date === todayStr && isEligibleStudySession(s.durationSeconds)
  );
  const totalStudiedMinutesToday = eligibleSessionsToday.reduce(
    (acc, s) => acc + (s.durationMinutes || 0),
    0
  );

  // Target calculation from configured subject targets (or default 120m)
  const targetMinutesToday =
    subjects.reduce((acc, sub) => acc + (sub.dailyTargetMinutes || 0), 0) || 120;
  const progressPercent = Math.min(
    100,
    Math.round((totalStudiedMinutesToday / targetMinutesToday) * 100)
  );
  const isGoalMet = totalStudiedMinutesToday >= targetMinutesToday && targetMinutesToday > 0;
  const minutesDifference = targetMinutesToday - totalStudiedMinutesToday;

  // Streak calculation taking planned rest days into account
  const sessionsByDate = {};
  for (const s of sessions) {
    if (!sessionsByDate[s.date]) sessionsByDate[s.date] = [];
    sessionsByDate[s.date].push(s);
  }

  const recentDates = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  });

  const streakDays = calculateConsistencyStreak({
    recentDates,
    sessionsByDate,
    restDaysOfWeek: ['Sunday'],
    dailyTargetMinutes: Math.min(targetMinutesToday, 60),
  });

  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const isTimerActive = activeTimer && (activeTimer.status === 'running' || activeTimer.status === 'paused');
  const isTimerCompleted = activeTimer && activeTimer.status === 'completed';

  // Handle direct start on dashboard without navigating away
  const handleStartFocus = () => {
    const chosenSubjectId = selectedSubjectId || subjects[0]?.id;
    if (!chosenSubjectId) {
      setCurrentView('subjects');
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

  return (
    <div className="space-y-6">
      {/* 1. Calm Greeting & Rotating Motivational Phrase */}
      <div className="relative overflow-hidden rounded-3xl bg-cream-100/90 dark:bg-charcoal-900 border border-cream-300 dark:border-charcoal-750 p-6 sm:p-7 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lilac-500"></span>
              <span className="text-[11px] font-mono uppercase tracking-widest text-espresso-500 dark:text-cream-400">
                Daily Focus Reflection
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-espresso-900 dark:text-cream-50 tracking-tight">
              "{MOTIVATIONAL_QUOTES[quoteIndex]}"
            </h2>
            <p className="text-xs text-espresso-600 dark:text-cream-300 max-w-xl">
              Consistent, deliberate practice quietly compounds. Begin where you are and let your concentration settle.
            </p>
          </div>

          <button
            type="button"
            onClick={nextQuote}
            title="Cycle motivational reflection"
            className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-espresso-600 dark:text-cream-300 hover:text-espresso-900 dark:hover:text-cream-50 bg-cream-200/60 hover:bg-cream-200 dark:bg-charcoal-800 dark:hover:bg-charcoal-750 border border-cream-300/80 dark:border-charcoal-700 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Next thought</span>
          </button>
        </div>
      </div>

      {/* Understated Session Completion Feedback */}
      {isTimerCompleted && (
        <div className="p-4 sm:p-5 rounded-2xl bg-cream-100 dark:bg-charcoal-850 border border-lilac-300 dark:border-lilac-800 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-lilac-600 text-white flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-serif font-medium text-espresso-900 dark:text-cream-50">
                Session Complete · Focus Recorded
              </h4>
              <p className="text-xs text-espresso-600 dark:text-cream-300">
                {activeTimer.subjectName} session has been saved to today's study progress.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

      {/* 2. Effortless Quick-Start Focus Station (Primary Workspace) */}
      <Card className="p-6 sm:p-7 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-cream-200 dark:border-charcoal-750 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-lilac-600 dark:text-lavender-400" />
              <h3 className="font-serif text-lg font-medium text-espresso-900 dark:text-cream-50">
                Quick-Start Focus
              </h3>
            </div>
            <p className="text-xs text-espresso-500 dark:text-cream-400 mt-0.5">
              Launch a timed study block immediately with one tap
            </p>
          </div>

          {isTimerActive && (
            <Button
              variant="outline"
              size="sm"
              icon={ArrowRight}
              onClick={() => setCurrentView('focus')}
            >
              Open Full Chamber
            </Button>
          )}
        </div>

        {subjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Create your first subject to start"
            description="StillHour requires an assigned subject to track study duration. Add a subject to unlock effortless focus sessions."
            actionLabel="Add Subject"
            actionIcon={BookOpen}
            onAction={() => setCurrentView('subjects')}
          />
        ) : isTimerActive ? (
          /* Live Timer Controls on Dashboard */
          <div className="flex flex-col items-center justify-center text-center py-4 sm:py-6">
            {/* Status indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cream-200/70 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 text-xs font-medium text-espresso-700 dark:text-cream-200 mb-3">
              <span
                className={`w-2 h-2 rounded-full ${
                  activeTimer.status === 'running'
                    ? 'bg-emerald-500 animate-ping'
                    : 'bg-amber-500'
                }`}
              />
              <span>
                {activeTimer.status === 'running'
                  ? `Focusing on ${activeTimer.subjectName}`
                  : `Paused · ${activeTimer.subjectName}`}
              </span>
              {activeTimer.taskTitle && (
                <span className="text-espresso-400 dark:text-cream-400 font-mono text-[10px]">
                  ({activeTimer.taskTitle})
                </span>
              )}
            </div>

            {/* Countdown digits */}
            <div className="font-mono text-5xl sm:text-6xl md:text-7xl font-light tracking-tight text-espresso-900 dark:text-cream-50 tabular-nums my-2">
              {formatSecondsToTimer(remainingSeconds)}
            </div>

            <p className="text-xs font-mono text-espresso-500 dark:text-cream-400 mb-6">
              Net focus time accrued: {formatSecondsToTimer(elapsedStudySeconds)}
              {activeTimer.pauses?.length > 0 && ` · ${activeTimer.pauses.length} pause(s)`}
            </p>

            {/* Live Timer Control Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {activeTimer.status === 'running' ? (
                <Button size="md" variant="secondary" icon={Pause} onClick={pauseTimer}>
                  Pause
                </Button>
              ) : (
                <Button size="md" variant="primary" icon={Play} onClick={resumeTimer}>
                  Resume Focus
                </Button>
              )}
              <Button
                size="md"
                variant="outline"
                icon={Square}
                onClick={() => stopAndSaveTimer(false)}
              >
                Stop & Save
              </Button>
            </div>
          </div>
        ) : (
          /* Idle State: Immediate One-Tap Focus Launcher */
          <div className="space-y-5">
            {/* Subject and Optional Task Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-medium text-espresso-600 dark:text-cream-400 mb-1.5">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-800 text-espresso-900 dark:text-cream-50 text-sm font-medium focus:ring-2 focus:ring-lilac-400 focus:outline-none transition-colors"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.priority})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-espresso-600 dark:text-cream-400 mb-1.5">
                  Linked Task (Optional)
                </label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-800 text-espresso-900 dark:text-cream-50 text-sm font-medium focus:ring-2 focus:ring-lilac-400 focus:outline-none transition-colors"
                >
                  <option value="">None (Unlinked Session)</option>
                  {tasks
                    .filter((t) => !t.completed)
                    .map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Duration Presets with 2 hours as first-class option */}
            <div>
              <label className="block text-xs font-medium text-espresso-600 dark:text-cream-400 mb-2">
                Session Duration
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {PRESETS.map((preset) => {
                  const isSelected = durationPreset === preset.mins;
                  return (
                    <button
                      key={preset.mins}
                      type="button"
                      onClick={() => setDurationPreset(preset.mins)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-medium transition-all text-center border cursor-pointer ${
                        isSelected
                          ? 'bg-lilac-600 text-white dark:bg-lilac-500 dark:text-white border-lilac-600 shadow-xs'
                          : 'bg-cream-50 hover:bg-cream-200/70 text-espresso-700 dark:bg-charcoal-800 dark:hover:bg-charcoal-750 dark:text-cream-300 border-cream-300 dark:border-charcoal-700'
                      } ${preset.isDeep ? 'font-serif' : 'font-mono'}`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{preset.label}</span>
                        {preset.isDeep && (
                          <span
                            className={`text-[9px] uppercase tracking-wider px-1 py-0.2 rounded font-sans ${
                              isSelected
                                ? 'bg-lilac-700 text-lilac-100'
                                : 'bg-cream-200 text-espresso-600 dark:bg-charcoal-700 dark:text-cream-300'
                            }`}
                          >
                            Deep
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Launch Action */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-espresso-500 dark:text-cream-400 font-mono">
                Duration: {durationPreset >= 60 ? `${Math.floor(durationPreset / 60)}h ${durationPreset % 60 ? `${durationPreset % 60}m` : ''}` : `${durationPreset}m`} ({durationPreset * 60}s precision)
              </div>

              <Button
                variant="primary"
                size="lg"
                icon={Play}
                onClick={handleStartFocus}
                className="w-full sm:w-auto px-7 shadow-xs"
              >
                Start Focus Session
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 3. Today's Progress Indicator & Target Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Total Focus Time */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-espresso-500 dark:text-cream-400">
              Focus Logged Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-cream-200/80 dark:bg-charcoal-800 flex items-center justify-center text-lilac-700 dark:text-lavender-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl font-semibold text-espresso-900 dark:text-cream-50 tabular-nums">
              {Math.floor(totalStudiedMinutesToday / 60)}h {totalStudiedMinutesToday % 60}m
            </span>
          </div>
          <p className="text-xs text-espresso-500 dark:text-cream-400 mt-2">
            Target: {Math.floor(targetMinutesToday / 60)}h {targetMinutesToday % 60}m
          </p>
        </Card>

        {/* Daily Goal Comparison & Visual Progress */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-espresso-500 dark:text-cream-400">
              Daily Target Comparison
            </span>
            <div className="w-8 h-8 rounded-xl bg-cream-200/80 dark:bg-charcoal-800 flex items-center justify-center text-sage-600 dark:text-sage-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-serif text-3xl font-semibold text-espresso-900 dark:text-cream-50 tabular-nums">
              {progressPercent}%
            </span>
            <Badge variant={isGoalMet ? 'completed' : 'in_progress'}>
              {isGoalMet ? 'Goal Accomplished' : 'Pacing In Progress'}
            </Badge>
          </div>
          <div className="w-full bg-cream-200 dark:bg-charcoal-750 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isGoalMet ? 'bg-sage-600 dark:bg-sage-500' : 'bg-lilac-600 dark:bg-lilac-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-espresso-500 dark:text-cream-400 mt-2">
            {isGoalMet
              ? 'Daily target reached · Quiet compounding active'
              : `${minutesDifference > 0 ? `${Math.floor(minutesDifference / 60)}h ${minutesDifference % 60}m` : '0m'} remaining to meet target`}
          </p>
        </Card>

        {/* Tasks Checklist Indicator */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-espresso-500 dark:text-cream-400">
              Tasks Completed
            </span>
            <div className="w-8 h-8 rounded-xl bg-cream-200/80 dark:bg-charcoal-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl font-semibold text-espresso-900 dark:text-cream-50 tabular-nums">
              {completedTasksCount}
            </span>
            <span className="text-xs text-espresso-500 dark:text-cream-400">of {tasks.length} total</span>
          </div>
          <p className="text-xs text-espresso-500 dark:text-cream-400 mt-2">
            {tasks.length === 0
              ? 'No tasks scheduled'
              : `${tasks.length - completedTasksCount} pending tasks`}
          </p>
        </Card>

        {/* Calm Consistency Streak (Rest days protected) */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-espresso-500 dark:text-cream-400">
              Consistency Streak
            </span>
            <div className="w-8 h-8 rounded-xl bg-cream-200/80 dark:bg-charcoal-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl font-semibold text-espresso-900 dark:text-cream-50 tabular-nums">
              {streakDays}
            </span>
            <span className="text-xs text-espresso-500 dark:text-cream-400">days active</span>
          </div>
          <p className="text-xs text-espresso-500 dark:text-cream-400 mt-2">
            Protected rest days accounted
          </p>
        </Card>
      </div>

      {/* 4. Subject Breakdown & Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject Pacing Breakdown */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-cream-200 dark:border-charcoal-750">
              <div>
                <h4 className="font-serif text-base font-medium text-espresso-900 dark:text-cream-50">
                  Subject Breakdown & Target Pacing
                </h4>
                <p className="text-xs text-espresso-500 dark:text-cream-400">
                  Daily focus distribution across configured subjects
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('subjects')}
                className="text-xs text-lilac-600 dark:text-lavender-400 hover:underline font-medium cursor-pointer"
              >
                Manage Subjects
              </button>
            </div>

            {subjects.length === 0 ? (
              <p className="text-xs text-espresso-500 dark:text-cream-400 py-4 text-center">
                No subjects defined yet.
              </p>
            ) : (
              <div className="space-y-3">
                {subjects.map((sub) => {
                  const subMins = eligibleSessionsToday
                    .filter((s) => s.subjectId === sub.id)
                    .reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
                  const subTarget = sub.dailyTargetMinutes || 60;
                  const percent = Math.min(100, Math.round((subMins / subTarget) * 100));

                  return (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-xl bg-cream-50 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-750"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-espresso-900 dark:text-cream-50">
                            {sub.name}
                          </span>
                          <Badge variant={sub.priority}>
                            {sub.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <span className="font-mono text-xs text-espresso-600 dark:text-cream-300">
                          {subMins}m / {subTarget}m
                        </span>
                      </div>
                      <div className="w-full bg-cream-200 dark:bg-charcoal-750 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-lilac-600 dark:bg-lilac-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Actionable Today's Tasks */}
        <div>
          <Card>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-cream-200 dark:border-charcoal-750">
              <div>
                <h3 className="font-serif text-base font-medium text-espresso-900 dark:text-cream-50">
                  Action Checklist
                </h3>
                <p className="text-xs text-espresso-500 dark:text-cream-400">
                  Mark off tasks or jump into focus
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('tasks')}
                className="text-xs text-lilac-600 dark:text-lavender-400 hover:underline font-medium cursor-pointer"
              >
                All Tasks
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-espresso-500 dark:text-cream-400 mb-3">
                  No action items scheduled.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentView('tasks')}
                >
                  Create Task
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-cream-50 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-750 cursor-pointer hover:border-lilac-300 transition-all select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                          task.completed
                            ? 'bg-lilac-600 border-lilac-600 text-white'
                            : 'border-cream-300 dark:border-charcoal-700 bg-cream-100 dark:bg-charcoal-800'
                        }`}
                      >
                        {task.completed && <Check className="w-3 h-3" />}
                      </div>
                      <span
                        className={`text-xs truncate ${
                          task.completed
                            ? 'line-through text-espresso-400 dark:text-cream-500'
                            : 'text-espresso-800 dark:text-cream-200'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    <Badge variant={task.completed ? 'completed' : 'not_started'}>
                      {task.completed ? 'Done' : 'Open'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
