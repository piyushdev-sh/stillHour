import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { AppDataProvider, useAppData } from './context/AppDataContext';
import { TimerProvider, useTimer } from './context/TimerContext';
import AppShell from './components/layout/AppShell';

import DashboardView from './views/DashboardView';
import FocusView from './views/FocusView';
import SubjectsView from './views/SubjectsView';
import TasksView from './views/TasksView';
import AnalyticsView from './views/AnalyticsView';
import SettingsView from './views/SettingsView';

import TimerRecoveryModal from './components/timer/TimerRecoveryModal';
import SwitchTimerConfirmModal from './components/timer/SwitchTimerConfirmModal';

// Cloud loading gate — shown while fetching data on first load
function CloudLoadingGate({ children }) {
  const { loadState, loadError } = useAppData();

  if (loadState === 'loading') {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-bg, #FAF8F5)',
        gap: '1rem',
        fontFamily: 'inherit',
      }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"
          style={{ animation: 'spin 2s linear infinite' }}>
          <circle cx="24" cy="24" r="20" stroke="#D4C5B4" strokeWidth="3" />
          <circle cx="24" cy="24" r="13" stroke="#B5A090" strokeWidth="2.5" />
          <circle cx="24" cy="24" r="6" stroke="#8C6D52" strokeWidth="2" />
          <circle cx="24" cy="24" r="2.5" fill="#4A3728" />
        </svg>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#8C7B6A', fontSize: '0.875rem', margin: 0 }}>Loading your data…</p>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-bg, #FAF8F5)',
        gap: '1rem',
        fontFamily: 'inherit',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" stroke="#C0392B" strokeWidth="2.5" />
          <line x1="16" y1="16" x2="32" y2="32" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="32" y1="16" x2="16" y2="32" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <p style={{ color: '#4A3728', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
          Could not connect to your data
        </p>
        <p style={{ color: '#8C7B6A', fontSize: '0.8rem', margin: 0, maxWidth: '28ch' }}>
          {loadError === 'KV_NOT_CONFIGURED'
            ? 'Vercel KV is not linked yet. Connect it in your Vercel dashboard → Storage.'
            : `Error: ${loadError}`}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 1.25rem',
            borderRadius: '6px',
            border: 'none',
            background: '#4A3728',
            color: '#FAF8F5',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return children;
}

import ImmersiveLandscapeTimer from './components/timer/ImmersiveLandscapeTimer';

function MainRouter() {
  const { currentView } = useNavigation();
  const {
    subjects,
    tasks,
    sessions,
    recycleBinItems,
    syncStatus,
    settings,
    updateSettings,
    addSubject,
    updateSubject,
    deleteSubject,
    addTask,
    toggleTask,
    deleteTask,
    carryForwardTasks,
    restoreFromBin,
    templates,
    saveTemplate,
    deleteTemplate,
    addSession,
    updateSession,
    triggerManualSync,
    restoreFromJSONBackup,
    resetAllData,
  } = useAppData();

  const {
    activeTimer,
    isLandscapeMode,
    setIsLandscapeMode,
    pendingRecovery,
    resolveRecovery,
    pendingSwitch,
    confirmSwitch,
    cancelSwitch,
  } = useTimer();

  // Automatically activate StandBy landscape display when device is rotated horizontally during active session
  useEffect(() => {
    const checkOrientation = () => {
      const isLandscape = window.innerWidth > window.innerHeight && window.innerHeight < 600;
      if (isLandscape && activeTimer && (activeTimer.status === 'running' || activeTimer.status === 'paused')) {
        setIsLandscapeMode(true);
      }
    };

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [activeTimer, setIsLandscapeMode]);

  return (
    <>
      {isLandscapeMode && activeTimer && (
        <ImmersiveLandscapeTimer onClose={() => setIsLandscapeMode(false)} />
      )}
      <AppShell>
        {currentView === 'dashboard' && (
          <DashboardView subjects={subjects} sessions={sessions} tasks={tasks} />
        )}
        {currentView === 'focus' && (
          <FocusView subjects={subjects} tasks={tasks} />
        )}
        {currentView === 'subjects' && (
          <SubjectsView
            subjects={subjects}
            onAddSubject={addSubject}
            onUpdateSubject={updateSubject}
            onDeleteSubject={deleteSubject}
          />
        )}
        {currentView === 'tasks' && (
          <TasksView
            tasks={tasks}
            subjects={subjects}
            templates={templates}
            onAddTask={addTask}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
            onCarryForwardTasks={carryForwardTasks}
            onSaveTemplate={saveTemplate}
            onDeleteTemplate={deleteTemplate}
          />
        )}
        {currentView === 'analytics' && (
          <AnalyticsView
            subjects={subjects}
            sessions={sessions}
            onUpdateSession={updateSession}
          />
        )}
        {currentView === 'settings' && (
          <SettingsView
            subjects={subjects}
            sessions={sessions}
            tasks={tasks}
            settings={settings}
            onUpdateSettings={updateSettings}
            onResetAllData={resetAllData}
            recycleBinItems={recycleBinItems}
            onRestoreFromBin={restoreFromBin}
            syncStatus={syncStatus}
            onManualSync={triggerManualSync}
            onRestoreBackup={restoreFromJSONBackup}
          />
        )}
      </AppShell>

      {pendingRecovery && (
        <TimerRecoveryModal recoveryData={pendingRecovery} onResolve={resolveRecovery} />
      )}
      {pendingSwitch && (
        <SwitchTimerConfirmModal
          pendingSwitch={pendingSwitch}
          onConfirm={confirmSwitch}
          onCancel={cancelSwitch}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NavigationProvider>
        <AppDataProvider>
          <TimerProvider>
            <CloudLoadingGate>
              <MainRouter />
            </CloudLoadingGate>
          </TimerProvider>
        </AppDataProvider>
      </NavigationProvider>
    </ThemeProvider>
  );
}
