import React from 'react';
import { Sparkles, Play, ShieldCheck } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import ThemeToggle from '../common/ThemeToggle';
import Button from '../common/Button';

import BrandWordmark from '../common/BrandWordmark';

export default function Header() {
  const { currentView, setCurrentView } = useNavigation();

  const titleMap = {
    dashboard: { title: 'Today’s Overview', subtitle: 'Calm study cadence and daily targets' },
    focus: { title: 'Focus Chamber', subtitle: 'Uninterrupted single-subject study timer' },
    subjects: { title: 'Subjects', subtitle: 'Organize study disciplines and priorities' },
    tasks: { title: 'Daily Tasks', subtitle: 'Actionable study checklist and timed tasks' },
    analytics: { title: 'Analytics & Insights', subtitle: 'Consistency heatmap, trends, and reports' },
    settings: { title: 'Targets & Settings', subtitle: 'Preferences, schedule templates, and backup' },
  };

  const currentInfo = titleMap[currentView] || { title: 'StillHour', subtitle: 'Quiet study space' };

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 bg-cream-50/90 dark:bg-charcoal-950/90 backdrop-blur-md border-b border-cream-200/80 dark:border-charcoal-750 px-4 sm:px-8 py-3.5 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3">
        {/* On mobile screens where sidebar is hidden, show BrandWordmark */}
        <div className="lg:hidden">
          <BrandWordmark size="sm" showTagline={false} onClick={() => setCurrentView('dashboard')} />
        </div>

        <div className="hidden lg:block">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-serif font-medium text-espresso-900 dark:text-cream-50 m-0 leading-tight">
              {currentInfo.title}
            </h2>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-mono text-espresso-500 dark:text-cream-400 bg-cream-200/70 dark:bg-charcoal-800 rounded-md">
              {todayFormatted}
            </span>
          </div>
          <p className="hidden sm:block text-xs text-espresso-500 dark:text-cream-400 mt-0.5">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {currentView !== 'focus' && (
          <Button
            size="sm"
            variant="primary"
            icon={Play}
            onClick={() => setCurrentView('focus')}
            className="hidden sm:inline-flex"
          >
            Start Focus
          </Button>
        )}
        <div className="lg:hidden">
          <ThemeToggle compact />
        </div>
      </div>
    </header>
  );
}
