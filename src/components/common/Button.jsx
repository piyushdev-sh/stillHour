import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  disabled = false,
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-5 py-3 gap-2.5',
    icon: 'p-2',
  }[size] || 'text-sm px-4 py-2.5 gap-2';

  const variantStyles = {
    primary: 'bg-lilac-600 hover:bg-lilac-700 text-white shadow-sm dark:bg-lilac-500 dark:hover:bg-lilac-600',
    secondary: 'bg-cream-100 hover:bg-cream-200 text-espresso-800 border border-cream-300 dark:bg-charcoal-800 dark:hover:bg-charcoal-750 dark:text-cream-100 dark:border-charcoal-700',
    outline: 'border border-cream-300 hover:bg-cream-100/60 text-espresso-700 dark:border-charcoal-700 dark:hover:bg-charcoal-800 dark:text-cream-200',
    ghost: 'text-espresso-600 hover:bg-cream-200/50 hover:text-espresso-900 dark:text-cream-400 dark:hover:bg-charcoal-800 dark:hover:text-cream-100',
    danger: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
    sage: 'bg-sage-100 hover:bg-sage-200 text-sage-800 border border-sage-200 dark:bg-sage-900/40 dark:text-sage-200 dark:border-sage-800',
  }[variant] || '';

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />}
      {children}
    </button>
  );
}
