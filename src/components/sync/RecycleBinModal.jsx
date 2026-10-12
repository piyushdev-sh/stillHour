import React from 'react';
import { Trash2, RotateCcw, AlertCircle, X } from 'lucide-react';
import Button from '../common/Button';

export default function RecycleBinModal({
  isOpen,
  onClose,
  recycleBinItems = [],
  onRestore,
  onPermanentDelete,
}) {
  if (!isOpen) return null;

  const nowMs = Date.now();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-cream-100 dark:bg-charcoal-850 rounded-3xl border border-cream-300 dark:border-charcoal-700 p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-cream-200 dark:border-charcoal-750">
          <div>
            <h3 className="font-serif text-xl font-medium text-espresso-900 dark:text-cream-50 m-0">
              30-Day Recycle Bin
            </h3>
            <p className="text-xs text-espresso-500 dark:text-cream-400 mt-0.5">
              Deleted records remain restorable for 30 days before permanent deletion.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-espresso-400 hover:text-espresso-700 dark:hover:text-cream-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {recycleBinItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-espresso-400 dark:text-cream-400 italic">
              Recycle bin is empty. No deleted items currently pending expiration.
            </div>
          ) : (
            recycleBinItems.map((item) => {
              const msRemaining = Math.max(0, item.expirationTimestamp - nowMs);
              const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-cream-50 dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-750 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-medium text-espresso-900 dark:text-cream-50">
                      {item.payload?.name || item.payload?.title || 'Unnamed Record'}
                    </div>
                    <div className="text-[11px] text-espresso-500 dark:text-cream-400 mt-0.5">
                      Type: {item.originalStore} · Deleted {new Date(item.deletionTimestamp).toLocaleDateString()}
                    </div>
                    <div className="text-[10px] text-amber-700 dark:text-amber-400 font-mono mt-1">
                      Permanent removal in {daysRemaining} day{daysRemaining > 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={RotateCcw}
                      onClick={() => onRestore(item.id)}
                    >
                      Restore
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-3 border-t border-cream-200 dark:border-charcoal-750 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
