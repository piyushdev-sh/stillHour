import React from 'react';
import { ArrowRight, CheckCircle2, Calendar, Clock, AlertCircle } from 'lucide-react';
import Button from '../common/Button';

export default function CarryForwardPrompt({
  unfinishedTasks = [],
  onCarryForward,
  onDismiss,
}) {
  if (unfinishedTasks.length === 0) return null;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-lilac-100/80 dark:bg-charcoal-850 border border-lilac-200 dark:border-lilac-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-lilac-600 text-white shrink-0 mt-0.5">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-espresso-900 dark:text-cream-50">
            Carry Unfinished Tasks Forward?
          </h4>
          <p className="text-xs text-espresso-600 dark:text-cream-300 mt-0.5 leading-relaxed">
            You have <strong className="text-espresso-900 dark:text-cream-50">{unfinishedTasks.length} pending task{unfinishedTasks.length > 1 ? 's' : ''}</strong> from previous study sessions:
            {' '}
            <span className="italic">"{unfinishedTasks.map((t) => t.title).slice(0, 2).join('", "')}"{unfinishedTasks.length > 2 ? '...' : ''}</span>.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Keep on Past Dates
        </Button>
        <Button
          size="sm"
          variant="primary"
          icon={ArrowRight}
          onClick={onCarryForward}
        >
          Carry Forward to Today
        </Button>
      </div>
    </div>
  );
}
