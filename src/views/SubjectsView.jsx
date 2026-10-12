import React, { useState } from 'react';
import {
  Plus,
  BookOpen,
  Archive,
  MoreVertical,
  CheckCircle2,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';

export default function SubjectsView({ subjects = [], onAddSubject, onUpdateSubject, onArchiveSubject }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterArchived, setFilterArchived] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('medium'); // 'high' | 'medium' | 'low'
  const [status, setStatus] = useState('not_started'); // 'not_started' | 'in_progress' | 'completed'
  const [dailyTargetMinutes, setDailyTargetMinutes] = useState(60);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (onAddSubject) {
      onAddSubject({
        id: 'sub_' + Date.now(),
        name: name.trim(),
        priority,
        status,
        dailyTargetMinutes: Number(dailyTargetMinutes) || 60,
        archived: false,
        createdAt: new Date().toISOString(),
      });
    }

    setName('');
    setPriority('medium');
    setStatus('not_started');
    setDailyTargetMinutes(60);
    setShowAddModal(false);
  };

  const visibleSubjects = subjects.filter((s) => (filterArchived ? s.archived : !s.archived));

  return (
    <div className="space-y-6">
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-xl font-medium text-espresso-900 dark:text-cream-50 m-0">
            Study Disciplines
          </h3>
          <p className="text-xs text-espresso-500 dark:text-cream-400 mt-0.5">
            Define subjects and set individual daily targets. Initial list is empty by design.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterArchived(!filterArchived)}
          >
            {filterArchived ? 'View Active' : 'View Archived'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setShowAddModal(true)}
          >
            Add Subject
          </Button>
        </div>
      </div>

      {/* Subject list or Empty State */}
      {visibleSubjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={filterArchived ? 'No archived subjects' : 'No subjects created yet'}
          description={
            filterArchived
              ? 'Archived subjects will be stored here for historical records without cluttering your daily tracker.'
              : 'stillhour is designed for personal, distraction-free study. Add your subjects to configure daily targets and unlock timer tracking.'
          }
          actionLabel={filterArchived ? null : 'Create Your First Subject'}
          actionIcon={Plus}
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleSubjects.map((sub) => (
            <Card key={sub.id} hover className="relative group">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h4 className="font-medium text-base text-espresso-900 dark:text-cream-50">
                    {sub.name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Badge variant={sub.priority}>
                      {sub.priority.toUpperCase()}
                    </Badge>
                    <Badge variant={sub.status}>
                      {sub.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                <button
                  type="button"
                  title="Archive subject"
                  onClick={() => onArchiveSubject && onArchiveSubject(sub.id)}
                  className="p-1 rounded-lg text-espresso-400 hover:text-espresso-700 dark:hover:text-cream-200 transition-colors"
                >
                  <Archive className="w-4 h-4" />
                </button>
              </div>

              <div className="pt-3 border-t border-cream-200 dark:border-charcoal-750 flex items-center justify-between text-xs text-espresso-500 dark:text-cream-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Target: {Math.floor(sub.dailyTargetMinutes / 60)}h {sub.dailyTargetMinutes % 60}m/day
                </span>
                <span className="font-mono text-[11px]">
                  0h studied
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-cream-100 dark:bg-charcoal-850 rounded-3xl border border-cream-300 dark:border-charcoal-700 p-6 sm:p-8 max-w-md w-full shadow-xl">
            <h3 className="font-serif text-xl font-medium text-espresso-900 dark:text-cream-50 mb-1">
              Add New Subject
            </h3>
            <p className="text-xs text-espresso-500 dark:text-cream-400 mb-6">
              Create an area of study to track time and calculate targets.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-espresso-600 dark:text-cream-300 mb-1">
                  Subject Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cognitive Psychology, Macroeconomics, Rust"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-900 text-espresso-900 dark:text-cream-50 text-sm focus:ring-2 focus:ring-lilac-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-espresso-600 dark:text-cream-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-900 text-espresso-900 dark:text-cream-50 text-xs focus:ring-2 focus:ring-lilac-400 focus:outline-none"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-espresso-600 dark:text-cream-300 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-900 text-espresso-900 dark:text-cream-50 text-xs focus:ring-2 focus:ring-lilac-400 focus:outline-none"
                  >
                    <option value="not_started">Not started</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-espresso-600 dark:text-cream-300 mb-1">
                  Daily Target (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="720"
                  step="5"
                  value={dailyTargetMinutes}
                  onChange={(e) => setDailyTargetMinutes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-900 text-espresso-900 dark:text-cream-50 text-sm focus:ring-2 focus:ring-lilac-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save Subject
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
