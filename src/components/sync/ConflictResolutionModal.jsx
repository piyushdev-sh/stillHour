import React from 'react';
import { AlertTriangle, ArrowRightLeft, Check, Cloud, HardDrive } from 'lucide-react';
import Button from '../common/Button';

export default function ConflictResolutionModal({ conflict, onResolve }) {
  if (!conflict) return null;

  const { storeName, localRecord, remoteRecord } = conflict;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-cream-100 dark:bg-charcoal-850 rounded-3xl border border-cream-300 dark:border-charcoal-700 p-6 sm:p-8 max-w-2xl w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-medium text-espresso-900 dark:text-cream-50 m-0">
              Sync Conflict Detected
            </h3>
            <p className="text-xs text-espresso-500 dark:text-cream-400 mt-0.5">
              Concurrent changes were detected for this {storeName.slice(0, -1)}. Please select which version to preserve.
            </p>
          </div>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
          {/* Local Record */}
          <div className="p-4 rounded-2xl bg-cream-50 dark:bg-charcoal-900 border-2 border-lilac-300 dark:border-lilac-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-lilac-800 dark:text-lavender-300 mb-2">
                <HardDrive className="w-4 h-4" />
                <span>Local Version (This Device)</span>
              </div>
              <div className="space-y-1.5 text-xs text-espresso-700 dark:text-cream-200">
                <div><strong>Name / Title:</strong> {localRecord.name || localRecord.title}</div>
                <div><strong>Updated:</strong> {new Date(localRecord.updatedAt || localRecord.savedAt).toLocaleString()}</div>
                {localRecord.priority && <div><strong>Priority:</strong> {localRecord.priority}</div>}
                {localRecord.dailyTargetMinutes && <div><strong>Daily Target:</strong> {localRecord.dailyTargetMinutes}m</div>}
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              className="w-full mt-4"
              onClick={() => onResolve('keepLocal')}
            >
              Keep Local Version
            </Button>
          </div>

          {/* Remote Record */}
          <div className="p-4 rounded-2xl bg-cream-50 dark:bg-charcoal-900 border border-cream-300 dark:border-charcoal-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-espresso-700 dark:text-cream-300 mb-2">
                <Cloud className="w-4 h-4" />
                <span>Remote Cloud Version</span>
              </div>
              <div className="space-y-1.5 text-xs text-espresso-700 dark:text-cream-200">
                <div><strong>Name / Title:</strong> {remoteRecord.name || remoteRecord.title}</div>
                <div><strong>Updated:</strong> {new Date(remoteRecord.updatedAt || remoteRecord.savedAt).toLocaleString()}</div>
                {remoteRecord.priority && <div><strong>Priority:</strong> {remoteRecord.priority}</div>}
                {remoteRecord.dailyTargetMinutes && <div><strong>Daily Target:</strong> {remoteRecord.dailyTargetMinutes}m</div>}
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full mt-4"
              onClick={() => onResolve('acceptRemote')}
            >
              Accept Remote Version
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-espresso-400 dark:text-cream-400 text-center">
          stillhour never silently overwrites records. Your choice here resolves the conflict and updates the sync log.
        </p>
      </div>
    </div>
  );
}
