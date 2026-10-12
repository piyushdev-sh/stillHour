import React from 'react';

export default function Card({
  children,
  className = '',
  hover = false,
  onClick,
  ...props
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border bg-cream-100 dark:bg-charcoal-850 border-cream-300 dark:border-charcoal-750 text-espresso-900 dark:text-cream-50 p-5 transition-all shadow-[0_1px_3px_rgba(40,33,30,0.04)] ${
        hover ? 'hover:border-lilac-300 dark:hover:border-lilac-700 hover:shadow-[0_4px_12px_rgba(40,33,30,0.06)] cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
