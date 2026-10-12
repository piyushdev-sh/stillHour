import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  FileSpreadsheet,
  FileJson,
  Clock,
  Edit2,
  Lock,
  Search,
  Filter,
  X,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import CalendarHeatmap from '../components/analytics/CalendarHeatmap';
import SubjectBarChart from '../components/analytics/SubjectBarChart';
import WeeklySummaryCard from '../components/analytics/WeeklySummaryCard';
import ProjectionsCard from '../components/analytics/ProjectionsCard';

import {
  filterSessionsByRange,
  calculatePlannedVsActual,
  generateWeeklySummary,
} from '../services/analyticsEngine';
import { isEligibleStudySession, formatSecondsToTimer } from '../utils/timeUtils';

export default function AnalyticsView({
  subjects = [],
  sessions = [],
  onUpdateSession,
  correctionWindowMinutes = 15,
}) {
  const [period, setPeriod] = useState('all'); // 'today' | 'week' | 'month' | 'all'
  const [selectedHeatmapDate, setSelectedHeatmapDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');

  // Editing state
  const [editingSession, setEditingSession] = useState(null);
  const [editedMinutes, setEditedMinutes] = useState(25);
  const [editedNotes, setEditedNotes] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);

  // Compute period date bounds
  let startDateBound = null;
  const now = new Date();
  if (period === 'today') {
    startDateBound = todayStr;
  } else if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    startDateBound = d.toISOString().slice(0, 10);
  } else if (period === 'month') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    startDateBound = d.toISOString().slice(0, 10);
  }

  // Filter sessions by range, heatmap date, subject, and search query
  const eligibleSessions = sessions.filter((s) => isEligibleStudySession(s.durationSeconds));

  const filteredSessions = sessions.filter((s) => {
    if (selectedHeatmapDate && s.date !== selectedHeatmapDate) return false;
    if (!selectedHeatmapDate && startDateBound && s.date < startDateBound) return false;
    if (selectedSubjectFilter && s.subjectId !== selectedSubjectFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSubject = (s.subjectName || '').toLowerCase().includes(q);
      const matchTask = (s.taskTitle || '').toLowerCase().includes(q);
      const matchNotes = (s.notes || '').toLowerCase().includes(q);
      if (!matchSubject && !matchTask && !matchNotes) return false;
    }
    return true;
  });

  const validFilteredSessions = filteredSessions.filter((s) => isEligibleStudySession(s.durationSeconds));
  const totalStudiedMinutes = validFilteredSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

  // Planned vs actual calculation
  const daysInScope = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 14;
  const plannedVsActualData = calculatePlannedVsActual(subjects, filteredSessions, daysInScope);

  // Weekly comparison summary
  const lastWeekDate = new Date(now);
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const twoWeeksAgoDate = new Date(now);
  twoWeeksAgoDate.setDate(twoWeeksAgoDate.getDate() - 14);

  const currentWeekSessions = sessions.filter((s) => s.date >= lastWeekDate.toISOString().slice(0, 10));
  const previousWeekSessions = sessions.filter(
    (s) =>
      s.date >= twoWeeksAgoDate.toISOString().slice(0, 10) &&
      s.date < lastWeekDate.toISOString().slice(0, 10)
  );

  const weeklySummary = generateWeeklySummary({
    currentWeekSessions,
    previousWeekSessions,
    subjects,
  });

  // Export handlers
  const exportCSV = () => {
    const headers = 'ID,Date,Subject,LinkedTask,DurationSeconds,DurationMinutes,IsEligible,Notes,SavedAt\n';
    const rows = filteredSessions
      .map(
        (s) =>
          `"${s.id}","${s.date}","${s.subjectName || ''}","${s.taskTitle || ''}",${s.durationSeconds || 0},${
            s.durationMinutes || 0
          },${isEligibleStudySession(s.durationSeconds)},"${(s.notes || '').replace(/"/g, '""')}","${s.savedAt || ''}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stillhour-report-${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const data = {
      app: 'stillhour',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      subjects,
      sessions,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stillhour-backup-${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isWithinCorrectionWindow = (session) => {
    if (!session || !session.endTimestamp) return false;
    const windowMs = correctionWindowMinutes * 60 * 1000;
    return Date.now() - session.endTimestamp <= windowMs;
  };

  const handleOpenEdit = (session) => {
    setEditingSession(session);
    setEditedMinutes(Math.max(1, Math.round(session.durationSeconds / 60)));
    setEditedNotes(session.notes || '');
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingSession || !onUpdateSession) return;

    const newDurationSeconds = Math.max(1, Number(editedMinutes) * 60);
    onUpdateSession(editingSession.id, {
      durationSeconds: newDurationSeconds,
      notes: editedNotes,
    });

    setEditingSession(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Period Filter & Export Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-xl font-medium text-espresso-900 dark:text-cream-50 m-0">
            Study Analytics & History
          </h3>
          <p className="text-xs text-espresso-500 dark:text-cream-400 mt-0.5">
            Calm reflections on study rhythms, target performance, and subject distribution.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="inline-flex p-1 rounded-xl bg-cream-200/80 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 text-xs">
            {['today', 'week', 'month', 'all'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPeriod(p);
                  setSelectedHeatmapDate(null);
                }}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                  period === p && !selectedHeatmapDate
                    ? 'bg-cream-50 dark:bg-charcoal-700 text-espresso-900 dark:text-cream-50 shadow-xs'
                    : 'text-espresso-600 dark:text-cream-400 hover:text-espresso-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" icon={FileSpreadsheet} onClick={exportCSV}>
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" icon={FileJson} onClick={exportJSON}>
            Backup JSON
          </Button>
        </div>
      </div>

      {/* Active Heatmap Filter Badge */}
      {selectedHeatmapDate && (
        <div className="p-3 rounded-xl bg-lilac-100/90 dark:bg-charcoal-850 border border-lilac-300 dark:border-lilac-700 flex items-center justify-between text-xs">
          <span className="font-medium text-espresso-800 dark:text-cream-100">
            Filtering by selected calendar day: <strong>{selectedHeatmapDate}</strong>
          </span>
          <button
            type="button"
            onClick={() => setSelectedHeatmapDate(null)}
            className="flex items-center gap-1 text-lilac-700 dark:text-lavender-300 hover:underline"
          >
            <X className="w-3.5 h-3.5" />
            Clear Filter
          </button>
        </div>
      )}

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <span className="text-xs font-medium text-espresso-500 dark:text-cream-400">Total Valid Study Time</span>
          <div className="font-serif text-3xl font-semibold text-espresso-900 dark:text-cream-50 mt-1 tabular-nums">
            {Math.floor(totalStudiedMinutes / 60)}h {totalStudiedMinutes % 60}m
          </div>
          <p className="text-xs text-espresso-400 dark:text-cream-400 mt-1">
            Excludes sessions shorter than 60s
          </p>
        </Card>

        <Card>
          <span className="text-xs font-medium text-espresso-500 dark:text-cream-400">Target Adherence Ratio</span>
          <div className="font-serif text-3xl font-semibold text-espresso-900 dark:text-cream-50 mt-1 tabular-nums">
            {plannedVsActualData.overallRatio}%
          </div>
          <p className="text-xs text-espresso-400 dark:text-cream-400 mt-1">
            Actual vs planned study time
          </p>
        </Card>

        <Card>
          <span className="text-xs font-medium text-espresso-500 dark:text-cream-400">Recorded Sessions</span>
          <div className="font-serif text-3xl font-semibold text-espresso-900 dark:text-cream-50 mt-1 tabular-nums">
            {validFilteredSessions.length}
          </div>
          <p className="text-xs text-espresso-400 dark:text-cream-400 mt-1">
            In selected scope
          </p>
        </Card>
      </div>

      {/* Calendar Consistency Heatmap */}
      <CalendarHeatmap
        sessions={sessions}
        onSelectDate={(d) => setSelectedHeatmapDate(d)}
        selectedDate={selectedHeatmapDate}
      />

      {/* Subject Distribution & Weekly Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubjectBarChart subjectBreakdown={plannedVsActualData.subjects} />
        <WeeklySummaryCard summary={weeklySummary} />
      </div>

      {/* Target Completion Projections */}
      <ProjectionsCard subjects={subjects} recentSessions={sessions} />

      {/* Auditable Session Log with Search & Filter */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-cream-200 dark:border-charcoal-750">
          <div>
            <h4 className="font-serif text-base font-medium text-espresso-900 dark:text-cream-50">
              Auditable Session Log ({filteredSessions.length})
            </h4>
            <p className="text-xs text-espresso-500 dark:text-cream-400">
              Corrections allowed within {correctionWindowMinutes}m of completion.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Subject filter */}
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-800 text-xs text-espresso-800 dark:text-cream-200"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Search query */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-espresso-400" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-800 text-xs text-espresso-800 dark:text-cream-200 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-espresso-400 dark:text-cream-400">
            No sessions match the selected filters.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {filteredSessions.map((sess) => {
              const isEligible = isEligibleStudySession(sess.durationSeconds);
              const canEdit = isWithinCorrectionWindow(sess);

              return (
                <div
                  key={sess.id}
                  className="p-3.5 rounded-2xl bg-cream-50 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-espresso-900 dark:text-cream-50">
                        {sess.subjectName}
                      </span>
                      {sess.taskTitle && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cream-200 dark:bg-charcoal-800 text-espresso-600 dark:text-cream-300">
                          Task: {sess.taskTitle}
                        </span>
                      )}
                      {!isEligible && (
                        <Badge variant="neutral">
                          &lt; 60s (Excluded from totals)
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-espresso-400 dark:text-cream-400 mt-1 flex items-center gap-2">
                      <span>{sess.date}</span>
                      <span>•</span>
                      <span className="font-mono">
                        {formatSecondsToTimer(sess.durationSeconds)} ({sess.durationSeconds}s)
                      </span>
                      {sess.notes && (
                        <span className="text-espresso-500 italic">
                          "{sess.notes}"
                        </span>
                      )}
                      {sess.correctedAt && (
                        <span className="text-lilac-600 dark:text-lavender-400 font-mono">
                          [Corrected]
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canEdit ? (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={Edit2}
                        onClick={() => handleOpenEdit(sess)}
                      >
                        Adjust
                      </Button>
                    ) : (
                      <span className="text-[11px] text-espresso-400 dark:text-cream-400 flex items-center gap-1 font-mono">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Session Correction Modal */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-cream-100 dark:bg-charcoal-850 rounded-3xl border border-cream-300 dark:border-charcoal-700 p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="font-serif text-xl font-medium text-espresso-900 dark:text-cream-50 mb-1">
              Adjust Recent Study Session
            </h3>
            <p className="text-xs text-espresso-500 dark:text-cream-400 mb-5">
              Subject: <strong>{editingSession.subjectName}</strong>. Arbitrary creation is disallowed, but minor corrections within the {correctionWindowMinutes}-minute window are permitted.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-espresso-600 dark:text-cream-300 mb-1">
                  Adjusted Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={editedMinutes}
                  onChange={(e) => setEditedMinutes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-900 text-espresso-900 dark:text-cream-50 text-sm focus:ring-2 focus:ring-lilac-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-espresso-600 dark:text-cream-300 mb-1">
                  Correction Reason / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ended 2 minutes early due to unexpected interruption"
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-900 text-espresso-900 dark:text-cream-50 text-sm focus:ring-2 focus:ring-lilac-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={() => setEditingSession(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save Correction
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
