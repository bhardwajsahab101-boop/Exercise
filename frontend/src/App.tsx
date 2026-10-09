import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { QuickLogModal } from './components/QuickLogModal';
import { EditWorkoutModal } from './components/EditWorkoutModal';
import { ToastContainer } from './components/Toast';
import type { ToastMessage } from './components/Toast';

import { Overview } from './pages/Overview';
import { ActivityLog } from './pages/ActivityLog';
import { Progress } from './pages/Progress';
import { ExerciseFolder } from './pages/ExerciseFolder';
import { ExerciseDetailPage } from './pages/ExerciseDetailPage';
import { Settings } from './pages/Settings';

import type { Workout, UserGoal, UserProfile, ExerciseType } from './types/workout';
import { 
  getLocalWorkouts, 
  addLocalWorkout, 
  updateLocalWorkout, 
  deleteLocalWorkout, 
  getLocalGoals, 
  saveLocalGoals,
  saveLocalWorkouts
} from './services/storage';
import { supabase } from './services/supabase';
import { api } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedExerciseType, setSelectedExerciseType] = useState<ExerciseType>('run');

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [goals, setGoals] = useState<UserGoal>(getLocalGoals());
  
  // Auth state
  const [user, setUser] = useState<UserProfile>({ authenticated: false });

  // Modals state
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [quickLogInitialExercise, setQuickLogInitialExercise] = useState<ExerciseType>('run');
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);

  // Network & Sync state
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Load initial data from database / storage
  useEffect(() => {
    const loadedWorkouts = getLocalWorkouts();
    setWorkouts(loadedWorkouts);
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addToast('success', 'Back online! Syncing workouts with database...');
    };
    const handleOffline = () => {
      setIsOnline(false);
      addToast('info', 'Working in offline mode. Changes saved locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Supabase Auth listener
  useEffect(() => {
    const checkSessionAndFetch = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          setUser({
            email: data.session.user.email,
            id: data.session.user.id,
            authenticated: true,
          });
          // Fetch user's real workouts from Supabase / API database
          try {
            const remoteWorkouts = await api.getWorkouts();
            if (remoteWorkouts && Array.isArray(remoteWorkouts)) {
              setWorkouts(remoteWorkouts);
              saveLocalWorkouts(remoteWorkouts);
            }
          } catch (e) {
            // Keep local data if API not reachable
          }
        }
      } catch (err) {
        // Auth not initialized or offline
      }
    };

    checkSessionAndFetch();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email,
          id: session.user.id,
          authenticated: true,
        });
        addToast('success', `Signed in as ${session.user.email}`);

        try {
          const remoteWorkouts = await api.getWorkouts();
          if (remoteWorkouts && Array.isArray(remoteWorkouts)) {
            setWorkouts(remoteWorkouts);
            saveLocalWorkouts(remoteWorkouts);
          }
        } catch (e) {
          // Keep current
        }
      } else {
        setUser({ authenticated: false });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Toast helper
  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Workout Handlers
  const handleSaveNewWorkout = async (workoutData: Partial<Workout>) => {
    const newLocalItem = addLocalWorkout(workoutData);
    setWorkouts(getLocalWorkouts());
    addToast('success', 'Workout saved!');

    if (isOnline && user.authenticated) {
      try {
        const createdOnServer = await api.createWorkout(workoutData);
        updateLocalWorkout(newLocalItem.id, { synced: true, id: createdOnServer.id });
        setWorkouts(getLocalWorkouts());
      } catch (err: any) {
        console.warn('API sync deferred to background queue:', err.message);
      }
    }
  };

  const handleUpdateWorkout = async (id: string, updatedData: Partial<Workout>) => {
    updateLocalWorkout(id, updatedData);
    setWorkouts(getLocalWorkouts());
    addToast('success', 'Workout updated!');

    if (isOnline && user.authenticated && !id.startsWith('loc-')) {
      try {
        await api.updateWorkout(id, updatedData);
      } catch (err: any) {
        console.warn('API update failed:', err.message);
      }
    }
  };

  const handleDeleteWorkout = async (id: string) => {
    deleteLocalWorkout(id);
    setWorkouts(getLocalWorkouts());
    addToast('info', 'Workout deleted');

    if (isOnline && user.authenticated && !id.startsWith('loc-')) {
      try {
        await api.deleteWorkout(id);
      } catch (err: any) {
        console.warn('API delete failed:', err.message);
      }
    }
  };

  const handleUpdateGoals = (newGoals: UserGoal) => {
    setGoals(newGoals);
    saveLocalGoals(newGoals);
    addToast('success', 'Goals updated!');
  };

  const handleManualSync = async () => {
    if (!user.authenticated) {
      addToast('info', 'Please sign in with Supabase first to sync with the database.');
      return;
    }

    try {
      const remoteWorkouts = await api.getWorkouts();
      if (remoteWorkouts && remoteWorkouts.length > 0) {
        const syncedRemote = remoteWorkouts.map((w) => ({ ...w, synced: true }));
        setWorkouts(syncedRemote);
        saveLocalWorkouts(syncedRemote);
        addToast('success', `Synced ${remoteWorkouts.length} workouts from database!`);
      } else {
        const unsynced = workouts.filter((w) => w.synced === false);
        if (unsynced.length > 0) {
          await api.syncBatch(unsynced);
          const updated = workouts.map((w) => ({ ...w, synced: true }));
          setWorkouts(updated);
          saveLocalWorkouts(updated);
          addToast('success', `Uploaded ${unsynced.length} pending workouts to database!`);
        } else {
          addToast('info', 'Database is up to date!');
        }
      }
    } catch (err: any) {
      addToast('error', `Sync failed: ${err.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser({ authenticated: false });
      addToast('info', 'Signed out successfully.');
    } catch (err: any) {
      addToast('error', 'Sign out failed');
    }
  };

  const handleOpenQuickLogWithExercise = (ex: ExerciseType) => {
    setQuickLogInitialExercise(ex);
    setIsQuickLogOpen(true);
  };

  const handleOpenExerciseDetail = (type: ExerciseType) => {
    setSelectedExerciseType(type);
    setActiveTab('exercise-detail');
  };

  const pendingSyncCount = workouts.filter((w) => w.synced === false).length;

  return (
    <div className="app-container">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <Navbar
        activeTab={activeTab === 'exercise-detail' ? 'exercises' : activeTab}
        setActiveTab={setActiveTab}
        onOpenQuickLog={() => handleOpenQuickLogWithExercise('run')}
        isOnline={isOnline}
        user={user}
        pendingSyncCount={pendingSyncCount}
      />

      <main className="main-viewport">
        {activeTab === 'overview' && (
          <Overview
            workouts={workouts}
            goals={goals}
            onOpenQuickLog={() => handleOpenQuickLogWithExercise('run')}
            onNavigateToTab={setActiveTab}
            onEditWorkout={setEditingWorkout}
            onDeleteWorkout={handleDeleteWorkout}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityLog
            workouts={workouts}
            goals={goals}
            onOpenQuickLog={() => handleOpenQuickLogWithExercise('run')}
            onEditWorkout={setEditingWorkout}
            onDeleteWorkout={handleDeleteWorkout}
          />
        )}

        {activeTab === 'progress' && (
          <Progress workouts={workouts} goals={goals} />
        )}

        {activeTab === 'exercises' && (
          <ExerciseFolder
            workouts={workouts}
            goals={goals}
            onQuickLogExercise={handleOpenQuickLogWithExercise}
            onSelectExercise={handleOpenExerciseDetail}
          />
        )}

        {activeTab === 'exercise-detail' && (
          <ExerciseDetailPage
            exerciseType={selectedExerciseType}
            workouts={workouts}
            goals={goals}
            onBack={() => setActiveTab('exercises')}
            onOpenQuickLog={handleOpenQuickLogWithExercise}
            onEditWorkout={setEditingWorkout}
            onDeleteWorkout={handleDeleteWorkout}
          />
        )}

        {activeTab === 'settings' && (
          <Settings
            goals={goals}
            onUpdateGoals={handleUpdateGoals}
            user={user}
            onSignOut={handleSignOut}
            onManualSync={handleManualSync}
            workouts={workouts}
            pendingSyncCount={pendingSyncCount}
          />
        )}
      </main>

      <QuickLogModal
        isOpen={isQuickLogOpen}
        onClose={() => setIsQuickLogOpen(false)}
        onSave={handleSaveNewWorkout}
        initialExercise={quickLogInitialExercise}
        unitDistance={goals.unit_distance}
      />

      <EditWorkoutModal
        workout={editingWorkout}
        isOpen={Boolean(editingWorkout)}
        onClose={() => setEditingWorkout(null)}
        onSave={handleUpdateWorkout}
        unitDistance={goals.unit_distance}
      />
    </div>
  );
};

export default App;
