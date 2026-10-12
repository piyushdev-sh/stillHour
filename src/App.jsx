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
import ConflictResolutionModal from './components/sync/ConflictResolutionModal';

function MainRouter() {
  const { currentView } = useNavigation();
  const {
    subjects,
    tasks,
    sessions,
    recycleBinItems,
    syncStatus,
    activeConflict,
    addSubject,
    updateSubject,
    archiveSubject,
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
    resolveConflict,
    restoreFromJSONBackup,
    resetAllData,
  } = useAppData();

  const {
    pendingRecovery,
    resolveRecovery,
    pendingSwitch,
    confirmSwitch,
    cancelSwitch,
  } = useTimer();

  return (
    <>
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
            onArchiveSubject={archiveSubject}
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
            onResetAllData={resetAllData}
            recycleBinItems={recycleBinItems}
            onRestoreFromBin={restoreFromBin}
            syncStatus={syncStatus}
            onManualSync={triggerManualSync}
            onRestoreBackup={restoreFromJSONBackup}
          />
        )}
      </AppShell>

      {/* Crash / Sleep Recovery Dialog */}
      {pendingRecovery && (
        <TimerRecoveryModal
          recoveryData={pendingRecovery}
          onResolve={resolveRecovery}
        />
      )}

      {/* Switch Timer Confirmation Dialog */}
      {pendingSwitch && (
        <SwitchTimerConfirmModal
          pendingSwitch={pendingSwitch}
          onConfirm={confirmSwitch}
          onCancel={cancelSwitch}
        />
      )}

      {/* Conflict Resolution Dialog (No Silent Overwrite) */}
      {activeConflict && (
        <ConflictResolutionModal
          conflict={activeConflict}
          onResolve={resolveConflict}
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
            <MainRouter />
          </TimerProvider>
        </AppDataProvider>
      </NavigationProvider>
    </ThemeProvider>
  );
}
