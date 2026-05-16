import { useEffect, useState } from 'react';
import { AppData, WorkoutPlan, WorkoutSession } from '../types';

const STORAGE_KEY = 'workout_data';

const DEFAULT_DATA: AppData = {
  plans: [
    {
      id: 'default-upper',
      name: 'Upper Body',
      exercises: [
        { id: 'bench-press', name: 'Bench Press', barbellWeight: 20, targetSets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] },
        { id: 'lat-pulldown', name: 'Lat Pulldown', barbellWeight: 0, targetSets: [{ reps: 10 }, { reps: 10 }, { reps: 10 }] },
        { id: 'overhead-press', name: 'Overhead Press', barbellWeight: 20, targetSets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] },
        { id: 'bicep-curl', name: 'Bicep Curl', barbellWeight: 10, targetSets: [{ reps: 12 }, { reps: 12 }, { reps: 12 }] },
      ]
    },
    {
      id: 'default-lower',
      name: 'Lower Body',
      exercises: [
        { id: 'squat', name: 'Squat', barbellWeight: 20, targetSets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] },
        { id: 'deadlift', name: 'Deadlift', barbellWeight: 20, targetSets: [{ reps: 5 }, { reps: 5 }, { reps: 5 }] },
        { id: 'leg-extension', name: 'Leg Extension', barbellWeight: 0, targetSets: [{ reps: 12 }, { reps: 12 }, { reps: 12 }] },
        { id: 'calf-raise', name: 'Calf Raise', barbellWeight: 0, targetSets: [{ reps: 15 }, { reps: 15 }, { reps: 15 }] },
      ]
    }
  ],
  sessions: [],
  settings: {
    unit: 'kg',
    themeColor: '#dcfc04',
    weightEntryMode: 'total',
    barbellMode: 'total',
    dumbbellMode: 'total',
    plateLoadedMode: 'total',
    defaultFocusMode: false
  }
};

export function useWorkoutData() {
  const [data, setData] = useState<AppData>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const initial = stored ? JSON.parse(stored) : DEFAULT_DATA;
    
    // Ensure settings exist for legacy data
    if (!initial.settings) initial.settings = { unit: 'kg', themeColor: '#dcfc04', weightEntryMode: 'total', barbellMode: 'total', dumbbellMode: 'total' };
    if (!initial.settings.themeColor) initial.settings.themeColor = '#dcfc04';
    if (!initial.settings.weightEntryMode) initial.settings.weightEntryMode = 'total';
    if (!initial.settings.barbellMode) initial.settings.barbellMode = initial.settings.weightEntryMode || 'total';
    if (!initial.settings.dumbbellMode) initial.settings.dumbbellMode = 'total';
    if (!initial.settings.plateLoadedMode) initial.settings.plateLoadedMode = 'total';
    if (initial.settings.defaultFocusMode === undefined) initial.settings.defaultFocusMode = false;
    
    // Migrate and deduplicate plans
    if (initial.plans) {
      const seen = new Set();
      initial.plans = initial.plans.filter((p: any) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      }).map((plan: any) => ({
        ...plan,
        exercises: (plan.exercises || []).map((ex: any) => {
          let targetSets = ex.targetSets;
          // Migrate from number to array
          if (typeof targetSets === 'number') {
            const count = Math.max(1, targetSets);
            targetSets = Array.from({ length: count }, () => ({ reps: ex.targetReps || 0 }));
          }
          // Ensure it's an array
          if (!Array.isArray(targetSets)) {
            targetSets = [{ reps: 0 }];
          }
          const type = ex.type || (ex.barbellWeight ? 'barbell' : 'machine');
          return { ...ex, targetSets, type };
        })
      }));
    }
    
    return initial;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const updateSettings = (newSettings: Partial<AppData['settings']>) => {
    setData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...newSettings
      }
    }));
  };

  const addSession = (session: WorkoutSession) => {
    setData(prev => ({
      ...prev,
      sessions: [session, ...prev.sessions]
    }));
  };

  const updateSession = (session: WorkoutSession) => {
    setData(prev => {
      const exists = prev.sessions.findIndex(s => s.id === session.id);
      if (exists >= 0) {
        const newSessions = [...prev.sessions];
        newSessions[exists] = session;
        return { ...prev, sessions: newSessions };
      }
      return prev;
    });
  };

  const addPlan = (plan: WorkoutPlan) => {
    setData(prev => {
      const exists = prev.plans.findIndex(p => p.id === plan.id);
      if (exists >= 0) {
        const newPlans = [...prev.plans];
        newPlans[exists] = plan;
        return { ...prev, plans: newPlans };
      }
      return {
        ...prev,
        plans: [...prev.plans, plan]
      };
    });
  };

  const deletePlan = (id: string) => {
    setData(prev => ({
      ...prev,
      plans: prev.plans.filter(p => p.id !== id)
    }));
  };

  const deleteSession = (id: string) => {
    setData(prev => ({
      ...prev,
      sessions: prev.sessions.filter(s => s.id !== id)
    }));
  };

  const importData = (newData: AppData) => {
    setData(newData);
  };

  const findPreviousSession = (planId: string) => {
    return data.sessions.find(s => s.planId === planId);
  };

  return {
    data,
    addSession,
    updateSession,
    addPlan,
    deletePlan,
    importData,
    findPreviousSession,
    updateSettings,
    deleteSession,
  };
}
