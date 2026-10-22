import React from 'react';
import { Smartphone, ArrowRightLeft, ShieldAlert } from 'lucide-react';
import Button from '../common/Button';

export default function SwitchTimerConfirmModal({ pendingSwitch, onConfirm, onCancel }) {
  if (!pendingSwitch) return null;

  const { activeSession, newSessionParams, isRemoteConflict } = pendingSwitch;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-cream-100 dark:bg-charcoal-850 rounded-3xl border border-cream-300 dark:border-charcoal-700 p-6 sm:p-8 max-w-md w-full shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-lilac-100 dark:bg-charcoal-750 text-lilac-700 dark:text-lavender-300 flex items-center justify-center mb-4">
          {isRemoteConflict ? <Smartphone className="w-6 h-6" /> : <ArrowRightLeft className="w-6 h-6" />}
        </div>

        <h3 className="font-serif text-xl font-medium text-espresso-900 dark:text-cream-50 mb-1">
          {isRemoteConflict ? 'Session Active on Another Device' : 'Switch Active Focus Session?'}
        </h3>
        <p className="text-xs text-espresso-600 dark:text-cream-300 leading-relaxed mb-4">
          {isRemoteConflict
            ? `Your account has an active focus session for "${activeSession.subjectName}" running on another device. To protect your data accuracy, only one timer runs at a time.`
            : `Only one study timer may accrue time at once. Your current session for "${activeSession.subjectName}" will be stopped and saved.`}
        </p>

        <div className="p-3.5 rounded-xl bg-cream-50 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-750 text-xs space-y-1.5 text-espresso-600 dark:text-cream-300 mb-6">
          <div className="flex items-center justify-between">
            <span>Active session:</span>
            <strong className="text-espresso-800 dark:text-cream-100">{activeSession.subjectName}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span>New requested:</span>
            <strong className="text-espresso-800 dark:text-cream-100">
              {newSessionParams.subjectName} ({newSessionParams.durationMinutes}m)
            </strong>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <Button variant="ghost" onClick={onCancel}>
            {isRemoteConflict ? 'View Active Session' : 'Keep Current Timer'}
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {isRemoteConflict ? 'Override & Start Here' : 'Save & Switch Timer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
