import React from 'react';
import {
  LayoutDashboard,
  Timer,
  BookOpen,
  CheckSquare,
  BarChart3,
  Sliders,
  CheckCircle2,
  CloudOff,
  Sparkles,
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useAppData } from '../../context/AppDataContext';
import ThemeToggle from '../common/ThemeToggle';
import BrandWordmark from '../common/BrandWordmark';

export default function Sidebar() {
  const { currentView, setCurrentView } = useNavigation();
  const { syncStatus, cloudConfigured, isSyncing } = useAppData();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'focus', label: 'Focus', icon: Timer, badge: 'Active' },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Targets & Settings', icon: Sliders },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 border-r border-cream-200 dark:border-charcoal-750 bg-cream-100/60 dark:bg-charcoal-900 h-screen sticky top-0 px-4 py-6 select-none">
      {/* Brand */}
      <div className="px-2 mb-8">
        <BrandWordmark size="md" />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-lilac-600 text-white shadow-sm dark:bg-lilac-500 dark:text-white'
                  : 'text-espresso-700 hover:bg-cream-200/70 dark:text-cream-300 dark:hover:bg-charcoal-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-espresso-500 dark:text-cream-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.id === 'focus' && (
                <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                  isActive ? 'bg-lilac-700/60 text-lilac-100' : 'bg-cream-200 text-espresso-600 dark:bg-charcoal-750 dark:text-cream-300'
                }`}>
                  Live
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info & Controls */}
      <div className="pt-4 border-t border-cream-200 dark:border-charcoal-750 space-y-4">
        {/* Offline / Cloud State indicator */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-cream-50 dark:bg-charcoal-850 border border-cream-200/80 dark:border-charcoal-750 text-xs">
          <div className="flex items-center gap-2">
            {cloudConfigured ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            ) : syncStatus === 'synced' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-sage-600 dark:text-sage-400" />
            ) : (
              <CloudOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            )}
            <span className="text-espresso-600 dark:text-cream-300 font-medium">
              {isSyncing ? 'Syncing...' : cloudConfigured ? 'All Devices Synced' : 'Offline local'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-espresso-400 dark:text-cream-400">
            {cloudConfigured ? 'Vercel KV' : 'Local'}
          </span>
        </div>

        {/* Theme control */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-espresso-500 dark:text-cream-400">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
