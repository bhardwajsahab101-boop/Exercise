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

  // Load initial workouts from Supabase or local cache
  const fetchUserWorkouts = async (authenticatedUser?: UserProfile) => {
    const activeAuth = authenticatedUser || user;
    if (activeAuth.authenticated) {
      try {
        const remoteData = await api.getWorkouts();
        setWorkouts(remoteData);
        saveLocalWorkouts(remoteData);
        return;
      } catch (err: any) {
        console.warn('Could not fetch from Supabase:', err.message);
      }
    }
    // Fallback to local cache if offline or unauthenticated
    setWorkouts(getLocalWorkouts());
  };

  useEffect(() => {
    fetchUserWorkouts();
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      fetchUserWorkouts();
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

  // Supabase Auth listener
  useEffect(() => {
    const checkSessionAndFetch = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          const profile: UserProfile = {
            email: data.session.user.email,
            id: data.session.user.id,
            authenticated: true,
          };
          setUser(profile);
          await fetchUserWorkouts(profile);
        }
      } catch (err) {
        // Auth not initialized or offline
      }
    };

    checkSessionAndFetch();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile: UserProfile = {
          email: session.user.email,
          id: session.user.id,
          authenticated: true,
        };
        setUser(profile);
        addToast('success', `Signed in as ${session.user.email}`);
        await fetchUserWorkouts(profile);
      } else {
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
      const authErr = new Error('Please sign in with your email (in Settings) to save workouts to Supabase.');
      addToast('error', authErr.message);
      throw authErr;
    }

    try {
      // Await real Supabase INSERT response
      const createdRecord = await api.createWorkout(workoutData);
      
      // Update state and local storage cache with real database record
      const updatedList = [createdRecord, ...workouts.filter((w) => w.id !== createdRecord.id)];
      setWorkouts(updatedList);
      saveLocalWorkouts(updatedList);

      addToast('success', 'Workout saved to Supabase database!');
    } catch (err: any) {
      console.error('Save workout failed:', err);
      addToast('error', `Failed to save to database: ${err.message}`);
      throw err; // Re-throw to show in QuickLogModal error banner
    }
  };

  /**
   * Update Workout Handler: Awaits direct Supabase update.
   */
  const handleUpdateWorkout = async (id: string, updatedData: Partial<Workout>): Promise<void> => {
    if (!user.authenticated) {
      const authErr = new Error('Please sign in to update workouts in Supabase.');
      addToast('error', authErr.message);
      throw authErr;
    }

    try {
      const updatedRecord = await api.updateWorkout(id, updatedData);
      const updatedList = workouts.map((w) => (w.id === id ? updatedRecord : w));
      setWorkouts(updatedList);
      saveLocalWorkouts(updatedList);
      addToast('success', 'Workout updated in Supabase database!');
    } catch (err: any) {
      console.error('Update workout failed:', err);
      addToast('error', `Failed to update database: ${err.message}`);
      throw err;
    }
  };

  /**
   * Delete Workout Handler: Awaits direct Supabase deletion.
   */
  const handleDeleteWorkout = async (id: string): Promise<void> => {
    if (!user.authenticated) {
      addToast('error', 'Please sign in to delete workouts from Supabase.');
      return;
    }

    try {
      await api.deleteWorkout(id);
      const filtered = workouts.filter((w) => w.id !== id);
      setWorkouts(filtered);
      saveLocalWorkouts(filtered);
      addToast('info', 'Workout deleted from Supabase database');
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
      addToast('info', 'Please sign in with Supabase first to sync with the database.');
      return;
    }

    try {
      const remoteWorkouts = await api.getWorkouts();
      setWorkouts(remoteWorkouts);
      saveLocalWorkouts(remoteWorkouts);
      addToast('success', `Synced ${remoteWorkouts.length} workouts from Supabase database!`);
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
