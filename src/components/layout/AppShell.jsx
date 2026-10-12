import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen flex bg-cream-50 dark:bg-charcoal-950 text-espresso-800 dark:text-cream-100 transition-colors">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto pb-24 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
