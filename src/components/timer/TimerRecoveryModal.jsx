import React from 'react';
import { AlertCircle, Clock, RotateCcw, Check, Trash2 } from 'lucide-react';
import Button from '../common/Button';

export default function TimerRecoveryModal({ recoveryData, onResolve }) {
  if (!recoveryData) return null;

  const { state, gapSeconds } = recoveryData;
  const gapMinutes = Math.round(gapSeconds / 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-cream-100 dark:bg-charcoal-850 rounded-3xl border border-cream-300 dark:border-charcoal-700 p-6 sm:p-8 max-w-lg w-full shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h3 className="font-serif text-xl font-medium text-espresso-900 dark:text-cream-50 mb-1">
          Unconfirmed Timer Gap Detected
        </h3>
        <p className="text-xs text-espresso-600 dark:text-cream-300 leading-relaxed mb-4">
          stillhour detected that your study session for <strong className="text-espresso-900 dark:text-cream-50">{state.subjectName}</strong> was interrupted when the app or device went to sleep. A gap of ~<strong>{gapMinutes}m ({gapSeconds}s)</strong> occurred.
        </p>

        <div className="p-3.5 rounded-xl bg-cream-50 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-750 text-xs space-y-1.5 text-espresso-600 dark:text-cream-300 mb-6">
          <div className="flex justify-between">
            <span>Subject:</span>
            <span className="font-medium text-espresso-800 dark:text-cream-100">{state.subjectName}</span>
          </div>
          <div className="flex justify-between">
            <span>Session Started:</span>
            <span className="font-mono">{new Date(state.startTimestamp).toLocaleTimeString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Last Verified Active Tick:</span>
            <span className="font-mono">{new Date(state.lastTickTimestamp).toLocaleTimeString()}</span>
          </div>
        </div>

        <p className="text-xs font-medium text-espresso-700 dark:text-cream-200 mb-3">
          How would you like to handle this unconfirmed time?
        </p>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => onResolve('resumeVerified')}
            className="w-full text-left p-3.5 rounded-2xl border border-lilac-200 dark:border-lilac-800 bg-lilac-50/50 dark:bg-lilac-950/20 hover:bg-lilac-100/60 dark:hover:bg-lilac-900/30 transition-all flex items-start gap-3"
          >
            <div className="p-1 rounded-lg bg-lilac-600 text-white mt-0.5">
              <Check className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-espresso-900 dark:text-cream-50">
                Resume with Verified Study Time (Recommended)
              </span>
              <span className="text-[11px] text-espresso-500 dark:text-cream-400">
                Treats the gap as paused time. Retains previously recorded study time and continues countdown.
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onResolve('creditGap')}
            className="w-full text-left p-3.5 rounded-2xl border border-cream-200 dark:border-charcoal-700 hover:bg-cream-100/50 dark:hover:bg-charcoal-800 transition-all flex items-start gap-3"
          >
            <div className="p-1 rounded-lg bg-cream-200 dark:bg-charcoal-700 text-espresso-700 dark:text-cream-200 mt-0.5">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-espresso-900 dark:text-cream-50">
                I was studying during this gap
              </span>
              <span className="text-[11px] text-espresso-500 dark:text-cream-400">
                Credits the offline duration into your study time up to the planned target.
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onResolve('discard')}
            className="w-full text-left p-3.5 rounded-2xl border border-rose-200/60 dark:border-rose-900/40 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all flex items-start gap-3"
          >
            <div className="p-1 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 mt-0.5">
              <Trash2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-rose-800 dark:text-rose-300">
                Discard Interrupted Session
              </span>
              <span className="text-[11px] text-espresso-500 dark:text-cream-400">
                Clears this session from active tracking without logging study time.
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
