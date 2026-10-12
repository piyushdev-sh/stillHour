import React, { useState } from 'react';
import {
  Sliders,
  Moon,
  Sun,
  Monitor,
  Calendar,
  Clock,
  ShieldAlert,
  Database,
  Download,
  Upload,
  RefreshCw,
  Bell,
  Trash2,
  RotateCcw,
  Cloud,
  CloudOff,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import ThemeToggle from '../components/common/ThemeToggle';
import RecycleBinModal from '../components/sync/RecycleBinModal';
import { useTheme } from '../context/ThemeContext';
import { useAppData } from '../context/AppDataContext';

export default function SettingsView({
  subjects = [],
  sessions = [],
  tasks = [],
  onResetAllData,
  recycleBinItems = [],
  onRestoreFromBin,
  syncStatus = 'synced',
  onManualSync,
}) {
  const { theme, setTheme } = useTheme();
  const { cloudConfigured, lastSyncTime, syncWithCloud } = useAppData();

  // Settings State
  const [weeklyTargetHours, setWeeklyTargetHours] = useState(15);
  const [correctionWindowMinutes, setCorrectionWindowMinutes] = useState(15);
  const [carryForwardUnfinished, setCarryForwardUnfinished] = useState(true);
  const [idleWarningEnabled, setIdleWarningEnabled] = useState(true);
  const [restDays, setRestDays] = useState(['Sunday']);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [acknowledgedBackup, setAcknowledgedBackup] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const toggleRestDay = (day) => {
    if (restDays.includes(day)) {
      setRestDays(restDays.filter((d) => d !== day));
    } else {
      setRestDays([...restDays, day]);
    }
  };

  const handleExportBackup = () => {
    const data = {
      app: 'stillhour',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      subjects,
      tasks,
      sessions,
      settings: {
        weeklyTargetHours,
        correctionWindowMinutes,
        carryForwardUnfinished,
        restDays,
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stillhour-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileRestore = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result);
        if (onRestoreBackup) {
          onRestoreBackup(parsed);
          alert('Backup restored successfully!');
        }
      } catch (err) {
        alert('Failed to parse backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleSyncClick = async () => {
    setIsSyncing(true);
    try {
      if (syncWithCloud) {
        await syncWithCloud();
      } else if (onManualSync) {
        await onManualSync();
      }
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const handleReset = () => {
    if (acknowledgedBackup && onResetAllData) {
      onResetAllData();
      setShowResetConfirm(false);
      setAcknowledgedBackup(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h3 className="font-serif text-xl font-medium text-espresso-900 dark:text-cream-50 m-0">
          Targets, Preferences & Data Safety
        </h3>
        <p className="text-xs text-espresso-500 dark:text-cream-400 mt-0.5">
          Configure study pacing, rest days, timer correction limits, and offline backups.
        </p>
      </div>

      {/* Theme & Visual Experience */}
      <Card>
        <div className="flex items-center justify-between pb-4 border-b border-cream-200 dark:border-charcoal-750">
          <div>
            <h4 className="font-medium text-base text-espresso-900 dark:text-cream-50">
              Appearance Theme
            </h4>
            <p className="text-xs text-espresso-500 dark:text-cream-400">
              Warm beige (light) or deep charcoal (dark)
            </p>
          </div>
          <ThemeToggle />
        </div>
        <p className="text-xs text-espresso-500 dark:text-cream-400 mt-3">
          Theme preference is stored locally and remembered across sessions.
        </p>
      </Card>

      {/* Target & Consistency Configuration */}
      <Card>
        <h4 className="font-medium text-base text-espresso-900 dark:text-cream-50 mb-1">
          Study Targets & Schedule
        </h4>
        <p className="text-xs text-espresso-500 dark:text-cream-400 mb-6">
          Daily totals are calculated dynamically from subject allocations.
        </p>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-espresso-700 dark:text-cream-300 mb-1">
                Weekly Target Goal (Hours)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={weeklyTargetHours}
                onChange={(e) => setWeeklyTargetHours(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-900 text-espresso-900 dark:text-cream-50 text-sm focus:ring-2 focus:ring-lilac-400 focus:outline-none"
              />
              <span className="text-[11px] text-espresso-400 dark:text-cream-400 mt-1 block">
                Tracked against weekly actual study time.
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-espresso-700 dark:text-cream-300 mb-1">
                Session Correction Window (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={correctionWindowMinutes}
                onChange={(e) => setCorrectionWindowMinutes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-cream-300 dark:border-charcoal-700 bg-cream-50 dark:bg-charcoal-900 text-espresso-900 dark:text-cream-50 text-sm focus:ring-2 focus:ring-lilac-400 focus:outline-none"
              />
              <span className="text-[11px] text-espresso-400 dark:text-cream-400 mt-1 block">
                Window allowed to adjust timer-generated sessions after completion.
              </span>
            </div>
          </div>

          {/* Planned Rest Days */}
          <div>
            <label className="block text-xs font-medium text-espresso-700 dark:text-cream-300 mb-2">
              Planned Rest Days (Excluded from consistency streak expectations)
            </label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map((day) => {
                const isSelected = restDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleRestDay(day)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-lilac-600 text-white dark:bg-lilac-500 dark:text-white border-lilac-600'
                        : 'bg-cream-100 text-espresso-700 dark:bg-charcoal-800 dark:text-cream-300 border-cream-200 dark:border-charcoal-700'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Carry-forward toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-cream-200 dark:border-charcoal-750">
            <div>
              <span className="text-sm font-medium text-espresso-800 dark:text-cream-200 block">
                Carry forward unfinished tasks
              </span>
              <span className="text-xs text-espresso-500 dark:text-cream-400">
                Prompt to move pending daily tasks to the next morning at midnight.
              </span>
            </div>
            <input
              type="checkbox"
              checked={carryForwardUnfinished}
              onChange={(e) => setCarryForwardUnfinished(e.target.checked)}
              className="w-4 h-4 rounded text-lilac-600 focus:ring-lilac-400 border-cream-300 dark:border-charcoal-700"
            />
          </div>
        </div>
      </Card>

      {/* Persistence, Sync & Data Safety */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-base text-espresso-900 dark:text-cream-50">
            Multi-Device Cloud Sync & Storage
          </h4>
          <Button
            size="sm"
            variant="outline"
            icon={RefreshCw}
            onClick={handleSyncClick}
            disabled={isSyncing}
          >
            {isSyncing ? 'Syncing...' : 'Sync Cloud Now'}
          </Button>
        </div>
        <p className="text-xs text-espresso-500 dark:text-cream-400 mb-4">
          All study data is saved locally in IndexedDB first, and automatically synchronized across your devices via Vercel KV.
        </p>

        <div className="p-4 rounded-xl bg-cream-50 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-750 space-y-3 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-espresso-700 dark:text-cream-300 font-medium">Multi-Device Cloud Sync</span>
            {cloudConfigured ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Active (Vercel KV)
              </span>
            ) : (
              <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
                <CloudOff className="w-3.5 h-3.5" />
                Local Only
              </span>
            )}
          </div>

          <div className="text-[11px] text-espresso-600 dark:text-cream-300 leading-relaxed">
            {cloudConfigured
              ? 'All of your devices (phones, tablets, laptops) share the exact same study sessions, subjects, and tasks automatically.'
              : 'To sync across all devices, create a free Vercel KV database in the Vercel Dashboard under Storage -> Create Database -> KV, and connect it to stillHour.'}
          </div>

          {lastSyncTime && (
            <div className="flex items-center justify-between text-[11px] text-espresso-400 dark:text-cream-400 pt-2 border-t border-cream-200/60 dark:border-charcoal-800 font-mono">
              <span>Last Synchronized:</span>
              <span>{new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-espresso-700 dark:text-cream-300 font-medium">Local Offline Engine</span>
            <span className="text-sage-600 dark:text-sage-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> IndexedDB Active
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-espresso-700 dark:text-cream-300 font-medium">30-day Recycle Bin</span>
            <div className="flex items-center gap-2">
              <span className="text-espresso-500 dark:text-cream-400 font-mono">
                {recycleBinItems.length} deleted items
              </span>
              <Button
                size="sm"
                variant="secondary"
                icon={RotateCcw}
                onClick={() => setShowRecycleBin(true)}
              >
                Inspect Bin
              </Button>
            </div>
          </div>
        </div>

        {/* Backup & Export Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 pb-4 border-b border-cream-200 dark:border-charcoal-750">
          <div>
            <span className="text-xs font-semibold text-espresso-800 dark:text-cream-100 block">
              Complete JSON Migration & Backup
            </span>
            <span className="text-[11px] text-espresso-500 dark:text-cream-400">
              Export full app dataset or restore from a previous JSON backup file.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={Download}
              onClick={handleExportBackup}
            >
              Export
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileRestore}
              />
              <span className="inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 active:scale-[0.98] select-none text-xs px-3 py-1.5 gap-1.5 border border-cream-300 hover:bg-cream-100/60 text-espresso-700 dark:border-charcoal-700 dark:hover:bg-charcoal-800 dark:text-cream-200">
                <Upload className="w-3.5 h-3.5" />
                Restore JSON
              </span>
            </label>
          </div>
        </div>

        {/* Specification Mandated Disclaimer */}
        <p className="text-[11px] text-espresso-400 dark:text-cream-400 mt-4 leading-relaxed italic">
          Notice: Backups and cloud sync reduce risk but do not eliminate service outages, account loss, or user error. Keep regular exported copies.
        </p>

        {/* Danger Zone: Full Data Reset */}
        <div className="pt-4 mt-4 border-t border-cream-200 dark:border-charcoal-750 flex items-center justify-between">
          <div>
            <h5 className="text-sm font-medium text-rose-700 dark:text-rose-400">
              Clear & Reset Data
            </h5>
            <p className="text-xs text-espresso-500 dark:text-cream-400">
              Permanently clear subjects, tasks, and historical session logs.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={() => setShowResetConfirm(true)}
          >
            Reset All
          </Button>
        </div>
      </Card>

      {/* Recycle Bin Modal */}
      <RecycleBinModal
        isOpen={showRecycleBin}
        onClose={() => setShowRecycleBin(false)}
        recycleBinItems={recycleBinItems}
        onRestore={onRestoreFromBin}
      />

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-cream-100 dark:bg-charcoal-850 rounded-3xl border border-rose-300 dark:border-rose-900/60 p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-medium text-espresso-900 dark:text-cream-50 mb-2">
              Confirm Complete Data Reset
            </h3>
            <p className="text-xs text-espresso-600 dark:text-cream-300 leading-relaxed mb-4">
              Per stillhour data safety requirements, a destructive reset requires explicit confirmation. Please download a backup before resetting.
            </p>

            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                icon={Download}
                onClick={handleExportBackup}
                className="w-full justify-center"
              >
                Download Safety Backup First
              </Button>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-cream-100/70 dark:bg-charcoal-800 border border-cream-200 dark:border-charcoal-700 cursor-pointer mb-6">
              <input
                type="checkbox"
                checked={acknowledgedBackup}
                onChange={(e) => setAcknowledgedBackup(e.target.checked)}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-400"
              />
              <span className="text-xs text-espresso-700 dark:text-cream-300">
                I understand this action cannot be undone and acknowledge that I have backed up my data if needed.
              </span>
            </label>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={!acknowledgedBackup}
                onClick={handleReset}
              >
                Permanently Delete Data
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
