import React from 'react';
import { AlertCircle, ArrowRightLeft } from 'lucide-react';
import Button from '../common/Button';

export default function SwitchTimerConfirmModal({ pendingSwitch, onConfirm, onCancel }) {
  if (!pendingSwitch) return null;

  const { activeSession, newSessionParams } = pendingSwitch;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-cream-100 dark:bg-charcoal-850 rounded-3xl border border-cream-300 dark:border-charcoal-700 p-6 sm:p-8 max-w-md w-full shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-4">
          <ArrowRightLeft className="w-6 h-6" />
        </div>

        <h3 className="font-serif text-xl font-medium text-espresso-900 dark:text-cream-50 mb-1">
          Switch Active Focus Session?
        </h3>
        <p className="text-xs text-espresso-600 dark:text-cream-300 leading-relaxed mb-4">
          Only one study timer may accrue time at once. Your current session for <strong className="text-espresso-900 dark:text-cream-50">{activeSession.subjectName}</strong> has been paused.
        </p>

        <div className="p-3.5 rounded-xl bg-cream-50 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-750 text-xs space-y-1 text-espresso-600 dark:text-cream-300 mb-6">
          <div>Current: <strong className="text-espresso-800 dark:text-cream-100">{activeSession.subjectName}</strong></div>
          <div>New: <strong className="text-espresso-800 dark:text-cream-100">{newSessionParams.subjectName}</strong> ({newSessionParams.durationMinutes}m)</div>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <Button variant="ghost" onClick={onCancel}>
            Keep Current Timer
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Save & Switch Timer
          </Button>
        </div>
      </div>
    </div>
  );
}
