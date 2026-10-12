import React, { useState } from 'react';
import {
  Plus,
  CheckSquare,
  Square,
  Clock,
  Sparkles,
  ArrowRightCircle,
  Trash2,
  Calendar,
  Layers,
  Play,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import CarryForwardPrompt from '../components/planning/CarryForwardPrompt';
import ScheduleTemplateModal from '../components/planning/ScheduleTemplateModal';
import { getUnfinishedTasksForCarryForward } from '../services/planningEngine';
import { useNavigation } from '../context/NavigationContext';
import { useTimer } from '../context/TimerContext';

export default function TasksView({
  tasks = [],
  subjects = [],
  templates = [],
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onCarryForwardTasks,
  onSaveTemplate,
  onDeleteTemplate,
}) {
  const { setCurrentView } = useNavigation();
  const { startTimer } = useTimer();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [dismissCarryForward, setDismissCarryForward] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState('checklist'); // 'checklist' | 'timed'
  const [linkedSubjectId, setLinkedSubjectId] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Check for unfinished tasks from previous dates
  const unfinishedPastTasks = getUnfinishedTasksForCarryForward(tasks, todayStr);

  const handleCarryForward = () => {
    if (onCarryForwardTasks && unfinishedPastTasks.length > 0) {
      onCarryForwardTasks(unfinishedPastTasks.map((t) => t.id), todayStr);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (onAddTask) {
      onAddTask({
        id: 'task_' + Date.now(),
        title: title.trim(),
        taskType,
        linkedSubjectId: linkedSubjectId || null,
        estimatedMinutes: taskType === 'timed' ? Number(estimatedMinutes) : null,
        completed: false,
        date: todayStr,
        carryForward: true,
      });
    }

    setTitle('');
    setTaskType('checklist');
    setLinkedSubjectId('');
    setShowAddModal(false);
  };

  const handleStartTemplateBlock = (tpl) => {
    startTimer({
      subjectId: tpl.subjectId,
      subjectName: tpl.subjectName,
      taskId: null,
      taskTitle: tpl.taskSuggestion || null,
      durationMinutes: 45, // default focus block
    });
    setCurrentView('focus');
  };

  const todayTasks = tasks.filter((t) => t.date === todayStr);
  const completedCount = todayTasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-6">
      {/* Carry Forward Prompt */}
      {!dismissCarryForward && unfinishedPastTasks.length > 0 && (
        <CarryForwardPrompt
          unfinishedTasks={unfinishedPastTasks}
          onCarryForward={handleCarryForward}
          onDismiss={() => setDismissCarryForward(true)}
        />
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-xl font-medium text-espresso-900 dark:text-cream-50 m-0">
            Daily Study Tasks & Schedule
          </h3>
          <p className="text-xs text-espresso-500 dark:text-cream-400 mt-0.5">
            {completedCount} of {todayTasks.length} items completed for today ({todayStr}).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={Layers}
            onClick={() => setShowTemplateModal(true)}
          >
            Schedule Templates ({templates.length})
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setShowAddModal(true)}
          >
            Add Task
          </Button>
        </div>
      </div>

      {/* Schedule Template Blocks Preview (if any) */}
      {templates.length > 0 && (
        <Card className="bg-cream-100/40 dark:bg-charcoal-900/40 border-dashed">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-espresso-600 dark:text-cream-300">
              Today's Scheduled Blocks
            </span>
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="text-xs text-lilac-600 dark:text-lavender-400 hover:underline"
            >
              Configure
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-3 rounded-xl bg-cream-50 dark:bg-charcoal-850 border border-cream-200 dark:border-charcoal-750 flex items-center justify-between gap-2 shadow-xs text-xs"
              >
                <div>
                  <div className="font-medium text-espresso-900 dark:text-cream-50">
                    {tpl.title}
                  </div>
                  <div className="text-[11px] text-espresso-500 dark:text-cream-400 mt-0.5">
                    {tpl.startTime} - {tpl.endTime} · {tpl.subjectName}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Play}
                  onClick={() => handleStartTemplateBlock(tpl)}
                >
                  Focus
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Task list or empty state */}
      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks scheduled"
          description="Keep your study sessions focused by breaking them down into concise daily action items and timed blocks."
          actionLabel="Create Daily Task"
          actionIcon={Plus}
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const subject = subjects.find((s) => s.id === task.linkedSubjectId);
            return (
              <div
                key={task.id}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  task.completed
                    ? 'bg-cream-100/50 dark:bg-charcoal-900/40 border-cream-200/60 dark:border-charcoal-800 opacity-75'
                    : 'bg-cream-100 dark:bg-charcoal-850 border-cream-200 dark:border-charcoal-750 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => onToggleTask && onToggleTask(task.id)}
                    className="text-espresso-400 hover:text-lilac-600 dark:text-cream-400 dark:hover:text-lavender-400 transition-colors"
                  >
                    {task.completed ? (
                      <CheckSquare className="w-5 h-5 text-lilac-600 dark:text-lavender-400" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium truncate ${
                        task.completed
                          ? 'line-through text-espresso-400 dark:text-cream-400'
                          : 'text-espresso-900 dark:text-cream-50'
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[11px] font-mono text-espresso-400 dark:text-cream-400">
                        {task.date}
                      </span>
                      {subject && (
                        <span className="text-[11px] text-espresso-500 dark:text-cream-400 bg-cream-100 dark:bg-charcoal-800 px-2 py-0.5 rounded-md">
                          {subject.name}
                        </span>
                      )}
                      {task.taskType === 'timed' && (
                        <span className="text-[11px] text-espresso-500 dark:text-cream-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.estimatedMinutes}m planned
                        </span>
                      )}
                      {task.carriedForwardAt && (
                        <span className="text-[10px] text-lilac-600 dark:text-lavender-400 font-mono">
                          Carried forward
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title="Delete task"
                    onClick={() => onDeleteTask && onDeleteTask(task.id)}
                    className="p-1.5 text-espresso-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-cream-100 dark:bg-charcoal-850 rounded-3xl border border-cream-300 dark:border-charcoal-700 p-6 sm:p-8 max-w-md w-full shadow-xl">
            <h3 className="font-serif text-xl font-medium text-espresso-900 dark:text-cream-50 mb-1">
              Add Daily Task
            </h3>
            <p className="text-xs text-espresso-500 dark:text-cream-400 mb-6">
              Plan what you want to accomplish today.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-espresso-600 dark:text-cream-300 mb-1">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Read Chapter 4, Practice 20 Flashcards"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-900 text-espresso-900 dark:text-cream-50 text-sm focus:ring-2 focus:ring-lilac-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-espresso-600 dark:text-cream-300 mb-1">
                    Task Format
                  </label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-900 text-espresso-900 dark:text-cream-50 text-xs focus:ring-2 focus:ring-lilac-400 focus:outline-none"
                  >
                    <option value="checklist">Checklist Item</option>
                    <option value="timed">Timed Task</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-espresso-600 dark:text-cream-300 mb-1">
                    Associate Subject
                  </label>
                  <select
                    value={linkedSubjectId}
                    onChange={(e) => setLinkedSubjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-900 text-espresso-900 dark:text-cream-50 text-xs focus:ring-2 focus:ring-lilac-400 focus:outline-none"
                  >
                    <option value="">No subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {taskType === 'timed' && (
                <div>
                  <label className="block text-xs font-medium text-espresso-600 dark:text-cream-300 mb-1">
                    Estimated Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    step="5"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-900 text-espresso-900 dark:text-cream-50 text-sm focus:ring-2 focus:ring-lilac-400 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Template Modal */}
      <ScheduleTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        subjects={subjects}
        templates={templates}
        onSaveTemplate={onSaveTemplate}
        onDeleteTemplate={onDeleteTemplate}
      />
    </div>
  );
}
