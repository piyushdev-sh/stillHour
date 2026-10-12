import React, { useState } from 'react';
import { Clock, Plus, Trash2, Calendar, BookOpen } from 'lucide-react';
import Button from '../common/Button';

export default function ScheduleTemplateModal({
  isOpen,
  onClose,
  subjects = [],
  templates = [],
  onSaveTemplate,
  onDeleteTemplate,
}) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || '');
  const [taskSuggestion, setTaskSuggestion] = useState('');

  if (!isOpen) return null;

  const handleAddBlock = (e) => {
    e.preventDefault();
    if (!title.trim() || !selectedSubjectId) return;

    const sub = subjects.find((s) => s.id === selectedSubjectId);
    onSaveTemplate({
      id: 'block_' + Date.now(),
      title: title.trim(),
      startTime,
      endTime,
      subjectId: selectedSubjectId,
      subjectName: sub ? sub.name : 'Study',
      taskSuggestion: taskSuggestion.trim(),
    });

    setTitle('');
    setTaskSuggestion('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-cream-100 dark:bg-charcoal-850 rounded-3xl border border-cream-300 dark:border-charcoal-700 p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-serif text-xl font-medium text-espresso-900 dark:text-cream-50 mb-1">
          Daily Schedule Templates
        </h3>
        <p className="text-xs text-espresso-500 dark:text-cream-400 mb-6">
          Define reusable focus blocks and suggested subjects for your day.
        </p>

        {/* Existing Blocks */}
        <div className="space-y-2.5 mb-6">
          <label className="block text-xs font-semibold text-espresso-700 dark:text-cream-300">
            Configured Daily Blocks ({templates.length})
          </label>
          {templates.length === 0 ? (
            <p className="text-xs text-espresso-400 dark:text-cream-400 italic py-2">
              No time blocks added. Create one below to structure your study rhythm.
            </p>
          ) : (
            templates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-3 rounded-xl bg-cream-50 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-750 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-medium text-espresso-900 dark:text-cream-50 flex items-center gap-2">
                    <span>{tpl.title}</span>
                    <span className="font-mono text-[11px] text-lilac-700 dark:text-lavender-300">
                      {tpl.startTime} - {tpl.endTime}
                    </span>
                  </div>
                  <div className="text-[11px] text-espresso-500 dark:text-cream-400 mt-0.5">
                    Subject: {tpl.subjectName}
                    {tpl.taskSuggestion && ` · Suggestion: ${tpl.taskSuggestion}`}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteTemplate(tpl.id)}
                  className="p-1 text-espresso-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* New Block Form */}
        <form onSubmit={handleAddBlock} className="pt-4 border-t border-cream-200 dark:border-charcoal-750 space-y-3.5">
          <span className="block text-xs font-semibold text-espresso-700 dark:text-cream-300">
            Add New Focus Block
          </span>

          <div>
            <label className="block text-xs text-espresso-500 dark:text-cream-400 mb-1">
              Block Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Morning Deep Work, Afternoon Problem Sets"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-900 text-espresso-900 dark:text-cream-50 text-xs focus:ring-2 focus:ring-lilac-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-espresso-500 dark:text-cream-400 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-900 text-espresso-900 dark:text-cream-50 text-xs focus:ring-2 focus:ring-lilac-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-espresso-500 dark:text-cream-400 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-900 text-espresso-900 dark:text-cream-50 text-xs focus:ring-2 focus:ring-lilac-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-espresso-500 dark:text-cream-400 mb-1">
              Associated Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-900 text-espresso-900 dark:text-cream-50 text-xs focus:ring-2 focus:ring-lilac-400 focus:outline-none"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-espresso-500 dark:text-cream-400 mb-1">
              Task Suggestion (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Review lecture flashcards"
              value={taskSuggestion}
              onChange={(e) => setTaskSuggestion(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-900 text-espresso-900 dark:text-cream-50 text-xs focus:ring-2 focus:ring-lilac-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" variant="primary" size="sm" icon={Plus}>
              Save Block
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
