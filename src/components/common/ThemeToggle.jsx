import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ compact = false }) {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'system', label: 'System', icon: Monitor },
    { value: 'dark', label: 'Dark', icon: Moon },
  ];

  return (
    <div
      role="group"
      aria-label="Theme mode selector"
      className="inline-flex items-center p-1 rounded-xl bg-cream-200/70 dark:bg-charcoal-800 border border-cream-300 dark:border-charcoal-700 transition-colors"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            title={`Switch to ${opt.label} theme`}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? 'bg-cream-50 dark:bg-charcoal-700 text-espresso-900 dark:text-cream-50 shadow-xs'
                : 'text-espresso-500 hover:text-espresso-800 dark:text-cream-400 dark:hover:text-cream-100'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {!compact && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
