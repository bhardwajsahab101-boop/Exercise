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
import { SharedProgressView } from './pages/SharedProgressView';

import type { Workout, UserGoal, UserProfile, ExerciseType } from './types/workout';
import { 
  getLocalWorkouts, 
  saveLocalWorkouts, 
  addLocalWorkout,
  getLocalGoals, 
  saveLocalGoals 
} from './services/storage';
import { supabase } from './services/supabase';
import { api } from './services/api';

export const App: React.FC = () => {
  // Family sharing route detection
  const [shareToken] = useState<string | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
      const token = path.replace('/share/', '').split('/')[0].trim();
      if (token) return token;
    }

    const params = new URLSearchParams(window.location.search);
    const shareParam = params.get('share');
    if (shareParam) return shareParam.trim();

    if (window.location.hash.startsWith('#share=')) {
      return window.location.hash.replace('#share=', '').trim();
    }

    return null;
  });

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

  // Sync unsynced local workouts and fetch fresh cloud list via NestJS API
  const syncAndFetchWorkouts = async (authenticatedUser?: UserProfile) => {
    const activeAuth = authenticatedUser || user;
    if (activeAuth.authenticated) {
      // 1. Sync any pending offline workouts
      const local = getLocalWorkouts();
      const unsynced = local.filter((w) => !w.synced);
      if (unsynced.length > 0) {
        try {
          const syncResult = await api.syncBatch(unsynced);
          addToast(
            'success',
            `Synced ${syncResult.syncedCount || unsynced.length} offline workout(s) to cloud database!`,
          );
        } catch (syncErr: any) {
          console.error('Initial sync error:', syncErr);
          addToast('error', `Sync failed: ${syncErr.message}`);
        }
      }

      // 2. Fetch full list of remote workouts from NestJS API
      try {
        const remoteData = await api.getWorkouts();
        setWorkouts(remoteData);
        saveLocalWorkouts(remoteData);
        return;
      } catch (err: any) {
        console.warn('Could not fetch from backend API:', err.message);
        addToast('error', `Failed to load cloud workouts: ${err.message}`);
      }
    }

    // Fallback to local cache if offline or unauthenticated
    setWorkouts(getLocalWorkouts());
  };

  useEffect(() => {
    syncAndFetchWorkouts();
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncAndFetchWorkouts();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Supabase Auth listener & Magic Link Callback handler
  useEffect(() => {
    const checkSessionAndFetch = async () => {
      try {
        // 1. Detect errors from Supabase Auth URL parameters or hash
        const urlParams = new URLSearchParams(window.location.search);
        const hashStr = window.location.hash.startsWith('#')
          ? window.location.hash.substring(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(hashStr);

        const errorDesc =
          urlParams.get('error_description') ||
          hashParams.get('error_description') ||
          urlParams.get('error') ||
          hashParams.get('error');

        if (errorDesc) {
          addToast('error', `Sign-in error: ${decodeURIComponent(errorDesc)}`);
        }

        // 2. Exchange PKCE code if present in query
        const code = urlParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            addToast('error', `Session exchange failed: ${exchangeError.message}`);
          }
        }

        // 3. Clean up tokens and codes from the browser address bar
        if (window.location.hash.includes('access_token=') || code || errorDesc) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }

        // 4. Retrieve current active session
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) {
          console.error('Session error:', sessionErr);
        }

        if (sessionData?.session?.user) {
          const profile: UserProfile = {
            email: sessionData.session.user.email,
            id: sessionData.session.user.id,
            authenticated: true,
          };
          setUser(profile);
          await syncAndFetchWorkouts(profile);
        }
      } catch (err) {
        // Offline or uninitialized
      }
    };

    checkSessionAndFetch();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile: UserProfile = {
          email: session.user.email,
          id: session.user.id,
          authenticated: true,
        };
        setUser(profile);
        if (event === 'SIGNED_IN') {
          addToast('success', `Signed in as ${session.user.email}`);
        }
        await syncAndFetchWorkouts(profile);
      } else if (event === 'SIGNED_OUT') {
        setUser({ authenticated: false });
        setWorkouts(getLocalWorkouts());
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

  /**
   * Save Workout Handler: Awaits direct database write in Supabase.
   * Throws if unauthenticated or if Supabase database query fails.
   */
  const handleSaveNewWorkout = async (workoutData: Partial<Workout>): Promise<void> => {
    if (!user.authenticated) {
      // Offline mode: save locally with synced: false
      const localItem = addLocalWorkout(workoutData);
      setWorkouts((prev) => [localItem, ...prev.filter((w) => w.id !== localItem.id)]);
      addToast('info', 'Saved locally (offline). Connect Supabase in Settings to sync with cloud.');
      return;
    }

    try {
      // Direct cloud database write via NestJS API
      const createdRecord = await api.createWorkout(workoutData);
      
      const updatedList = [createdRecord, ...workouts.filter((w) => w.id !== createdRecord.id)];
      setWorkouts(updatedList);
      saveLocalWorkouts(updatedList);

      addToast('success', 'Workout saved to cloud database!');
    } catch (err: any) {
      console.error('Save workout failed:', err);
      addToast('error', `Failed to save to cloud database: ${err.message}`);
      throw err; // Re-throw to show in QuickLogModal error banner
    }
  };

  /**
   * Update Workout Handler: Awaits direct API update.
   */
  const handleUpdateWorkout = async (id: string, updatedData: Partial<Workout>): Promise<void> => {
    if (!user.authenticated) {
      const authErr = new Error('Please sign in to update workouts in cloud database.');
      addToast('error', authErr.message);
      throw authErr;
    }

    try {
      const updatedRecord = await api.updateWorkout(id, updatedData);
      const updatedList = workouts.map((w) => (w.id === id ? updatedRecord : w));
      setWorkouts(updatedList);
      saveLocalWorkouts(updatedList);
      addToast('success', 'Workout updated in cloud database!');
    } catch (err: any) {
      console.error('Update workout failed:', err);
      addToast('error', `Failed to update database: ${err.message}`);
      throw err;
    }
  };

  /**
   * Delete Workout Handler: Awaits direct API deletion.
   */
  const handleDeleteWorkout = async (id: string): Promise<void> => {
    if (!user.authenticated) {
      addToast('error', 'Please sign in to delete workouts from cloud database.');
      return;
    }

    try {
      await api.deleteWorkout(id);
      const filtered = workouts.filter((w) => w.id !== id);
      setWorkouts(filtered);
      saveLocalWorkouts(filtered);
      addToast('info', 'Workout deleted from cloud database');
    } catch (err: any) {
      console.error('Delete workout failed:', err);
      addToast('error', `Failed to delete from database: ${err.message}`);
    }
  };

  const handleUpdateGoals = (newGoals: UserGoal) => {
    setGoals(newGoals);
    saveLocalGoals(newGoals);
    addToast('success', 'Goals updated!');
  };

  const handleManualSync = async () => {
    if (!user.authenticated) {
      addToast('info', 'Please sign in with email first to sync with cloud database.');
      return;
    }

    try {
      const local = getLocalWorkouts();
      const unsynced = local.filter((w) => !w.synced);
      if (unsynced.length > 0) {
        const syncRes = await api.syncBatch(unsynced);
        addToast('success', `Synced ${syncRes.syncedCount || unsynced.length} unsynced workouts!`);
      }

      const remoteWorkouts = await api.getWorkouts();
      setWorkouts(remoteWorkouts);
      saveLocalWorkouts(remoteWorkouts);
      addToast('success', `Cloud sync complete (${remoteWorkouts.length} total workouts).`);
    } catch (err: any) {
      addToast('error', `Sync failed: ${err.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser({ authenticated: false });
      setWorkouts([]);
      saveLocalWorkouts([]);
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

  if (shareToken) {
    return <SharedProgressView token={shareToken} />;
  }

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
