import React from 'react';

export default function BrandWordmark({
  size = 'md',
  showTagline = true,
  className = '',
  onClick,
}) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Distinctive Hourglass Emblem */}
      <div
        className={`relative shrink-0 flex items-center justify-center rounded-2xl bg-espresso-900 dark:bg-charcoal-800 border border-espresso-800 dark:border-charcoal-700 text-cream-50 shadow-sm ${
          isSm ? 'w-8 h-8' : isLg ? 'w-12 h-12' : 'w-10 h-10'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${isSm ? 'w-4 h-4' : isLg ? 'w-6 h-6' : 'w-5 h-5'}`}
        >
          {/* Subtle hourglass contour */}
          <path
            d="M6 3H18M6 21H18M7 3.5C7 9 12 12 12 12C12 12 17 9 17 3.5M7 20.5C7 15 12 12 12 12C12 12 17 15 17 20.5"
            stroke="#C5B2D4"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Gentle falling drop / quiet center point */}
          <circle cx="12" cy="12" r="1.5" fill="#EFE8DD" />
          <path
            d="M10.5 17.5C10.5 16.5 13.5 16.5 13.5 17.5"
            stroke="#8C739E"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Typographic Wordmark */}
      <div className="flex flex-col">
        <div className="flex items-baseline">
          <span
            className={`font-serif font-semibold tracking-[-0.03em] leading-none text-espresso-900 dark:text-cream-50 ${
              isSm ? 'text-lg' : isLg ? 'text-2xl' : 'text-xl'
            }`}
          >
            StillHour
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-lilac-500 ml-1 inline-block"></span>
        </div>

        {showTagline && (
          <span
            className={`font-sans tracking-wide text-espresso-500 dark:text-cream-400 mt-0.5 ${
              isSm ? 'text-[9px]' : isLg ? 'text-xs' : 'text-[11px]'
            }`}
          >
            quiet study space
          </span>
        )}
      </div>
    </div>
  );
}
