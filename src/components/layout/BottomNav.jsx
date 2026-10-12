import React from 'react';
import {
  LayoutDashboard,
  Timer,
  BookOpen,
  CheckSquare,
  BarChart3,
  Sliders,
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';

export default function BottomNav() {
  const { currentView, setCurrentView } = useNavigation();

  const navItems = [
    { id: 'dashboard', label: 'Today', icon: LayoutDashboard },
    { id: 'focus', label: 'Focus', icon: Timer },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'analytics', label: 'Stats', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Sliders },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-cream-100/95 dark:bg-charcoal-900/95 backdrop-blur-md border-t border-cream-200 dark:border-charcoal-750 px-2 py-1.5 pb-safe"
    >
      <div className="grid grid-cols-6 gap-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
                isActive
                  ? 'text-lilac-700 dark:text-lavender-300 font-semibold'
                  : 'text-espresso-400 dark:text-cream-400 hover:text-espresso-700'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
                {item.id === 'focus' && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-lilac-500 animate-pulse"></span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
