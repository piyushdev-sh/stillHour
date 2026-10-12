import React from 'react';

export default function Badge({ variant = 'neutral', children, className = '' }) {
  const styles = {
    // Priority badges
    high: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
    medium: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
    low: 'bg-sage-50 text-sage-700 border-sage-200/80 dark:bg-sage-950/40 dark:text-sage-300 dark:border-sage-900/60',

    // Status badges
    not_started: 'bg-cream-100 text-espresso-600 border-cream-300 dark:bg-charcoal-800 dark:text-cream-400 dark:border-charcoal-700',
    in_progress: 'bg-lilac-50 text-lilac-700 border-lilac-200 dark:bg-lilac-950/40 dark:text-lilac-300 dark:border-lilac-800',
    completed: 'bg-sage-100 text-sage-800 border-sage-200 dark:bg-sage-900/40 dark:text-sage-200 dark:border-sage-800',

    // Generic
    lilac: 'bg-lilac-100/80 text-lilac-800 border-lilac-200 dark:bg-lilac-900/40 dark:text-lilac-200 dark:border-lilac-700',
    neutral: 'bg-cream-100 text-espresso-700 border-cream-200 dark:bg-charcoal-800 dark:text-cream-300 dark:border-charcoal-700',
    sync_ok: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    sync_pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  }[variant] || 'bg-cream-100 text-espresso-700 border-cream-200 dark:bg-charcoal-800 dark:text-cream-300 dark:border-charcoal-700';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${styles} ${className}`}
    >
      {children}
    </span>
  );
}
