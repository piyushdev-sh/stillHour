import React, { createContext, useContext, useState } from 'react';

const NavigationContext = createContext();

export function NavigationProvider({ children }) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [navigationParams, setNavigationParams] = useState(null);

  const navigateTo = (view, params = null) => {
    setCurrentView(view);
    setNavigationParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <NavigationContext.Provider value={{ currentView, setCurrentView: navigateTo, navigationParams }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
