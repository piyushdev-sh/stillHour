import React from 'react';
import Button from './Button';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-3xl border border-dashed border-cream-300 dark:border-charcoal-700 bg-cream-100/40 dark:bg-charcoal-900/40 my-4 ${className}`}
    >
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-lilac-100 dark:bg-charcoal-800 border border-lilac-200 dark:border-charcoal-700 flex items-center justify-center text-lilac-600 dark:text-lavender-400 mb-4 shadow-sm">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <h3 className="font-serif text-xl font-normal text-espresso-900 dark:text-cream-50 mb-2">
        {title}
      </h3>
      <p className="text-sm text-espresso-500 dark:text-cream-400 max-w-md leading-relaxed mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction} icon={actionIcon}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
