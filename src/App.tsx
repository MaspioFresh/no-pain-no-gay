/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useWorkoutData } from './hooks/useWorkoutData';
import { Dashboard } from './components/Dashboard';
import { WorkoutSessionLogger } from './components/WorkoutSessionLogger';
import { HistoryView } from './components/HistoryView';
import { DataManagement } from './components/DataManagement';
import { PlanEditor } from './components/PlanEditor';
import { ProgressView } from './components/ProgressView';
import { WorkoutPlan, WorkoutSession, ExerciseSession } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Timer, ArrowLeft } from 'lucide-react';

type View = 'dashboard' | 'active-session' | 'history' | 'data' | 'create-plan' | 'view-plan' | 'modify-plan' | 'progress';

export default function App() {
  const { 
    data, 
    addSession, 
    addPlan, 
    importData, 
    findPreviousSession,
    toggleUnit,
    deletePlan,
    deleteSession
  } = useWorkoutData();
  
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [activeSessionLogs, setActiveSessionLogs] = useState<ExerciseSession[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [viewingPlan, setViewingPlan] = useState<WorkoutPlan | null>(null);
  const [modifyingPlan, setModifyingPlan] = useState<WorkoutPlan | null>(null);

  const ACTIVE_SESSION_STORAGE_KEY = 'workout_active_session';

  useEffect(() => {
    const saved = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.activePlan) {
          setActivePlan(parsed.activePlan);
          setActiveSessionLogs(parsed.activeSessionLogs || []);
          setStartTime(parsed.startTime || Date.now());
          setCurrentView('active-session');
        }
      } catch (e) {
        console.error('Failed to parse active session', e);
      }
    }
  }, []);

  useEffect(() => {
    if (activePlan) {
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify({
        activePlan,
        activeSessionLogs,
        startTime
      }));
    }
  }, [activePlan, activeSessionLogs, startTime]);

  const handleStartPlan = (plan: WorkoutPlan) => {
    setActivePlan(plan);
    setActiveSessionLogs((plan.exercises || []).map(ex => ({
      exerciseId: ex.id,
      sets: (ex.targetSets || []).map(t => ({
        reps: t.reps || 0,
        weight: t.weight || 0,
        unit: data.settings.unit,
        completed: false
      })),
      barbellWeightUsed: ex.barbellWeight || 0
    })));
    setStartTime(Date.now());
    setCurrentView('active-session');
  };

  const handleSaveSession = (session: WorkoutSession) => {
    addSession(session);
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    setActivePlan(null);
    setActiveSessionLogs([]);
    setStartTime(null);
    setCurrentView('dashboard');
  };

  const handleSavePlan = (plan: WorkoutPlan) => {
    addPlan(plan);
    setCurrentView('dashboard');
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            plans={data.plans}
            unit={data.settings.unit}
            onToggleUnit={toggleUnit}
            onStartPlan={handleStartPlan}
            onViewPlan={(plan) => {
              setViewingPlan(plan);
              setCurrentView('view-plan');
            }}
            onModifyPlan={(plan) => {
              setModifyingPlan(plan);
              setCurrentView('modify-plan');
            }}
            onDeletePlan={deletePlan}
            onAddPlan={addPlan}
            onCreatePlan={() => {
              setModifyingPlan(null);
              setCurrentView('create-plan');
            }}
            onViewHistory={() => setCurrentView('history')}
            onViewProgress={() => setCurrentView('progress')}
            onManageData={() => setCurrentView('data')}
          />
        );
      case 'view-plan':
        if (!viewingPlan) return null;
        return (
          <div className="flex flex-col space-y-6">
            <header className="flex items-center space-x-4 py-4">
              <button onClick={() => setCurrentView('dashboard')} className="p-2 rounded-full bg-transparent border border-accent text-accent">
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-2xl font-bold">{viewingPlan.name}</h2>
            </header>
            <div className="space-y-4">
              {(viewingPlan.exercises || []).map(ex => (
                <div key={ex.id} className="hardware-card p-4 space-y-2">
                  <h3 className="font-bold text-lg">{ex.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {(ex.targetSets || []).map((s, i) => (
                      <span key={i} className="px-2 py-1 bg-white/5 rounded text-[10px] mono-label">
                        SET {i+1}: {s.reps} RIP {s.weight ? `${s.weight}kg` : ''}
                      </span>
                    ))}
                  </div>
                  {ex.notes && <p className="text-xs text-white/40 italic">{ex.notes}</p>}
                </div>
              ))}
            </div>
            <button 
              onClick={() => handleStartPlan(viewingPlan)}
              className="w-full py-4 bg-transparent text-accent font-black rounded-xl shadow-[0_0_20px_rgba(220,252,4,0.1)] border border-accent hover:bg-accent/5 active:scale-95 transition-all tracking-widest"
            >
              INIZIA ALLENAMENTO
            </button>
          </div>
        );
      case 'active-session':
        if (!activePlan) return null;
        return (
          <WorkoutSessionLogger 
            plan={activePlan}
            unit={data.settings.unit}
            exerciseSessions={activeSessionLogs}
            setExerciseSessions={setActiveSessionLogs}
            startTime={startTime}
            previousSession={findPreviousSession(activePlan.id)}
            onSave={handleSaveSession}
            onCancel={() => {
              setCurrentView('dashboard');
            }}
            onFinish={() => {
               // Use a standard prompt first, if it fails then just reset
               try {
                 if (window.confirm('Annullare l\'allenamento corrente? I progressi non salvati andranno persi.')) {
                    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
                    setActivePlan(null);
                    setActiveSessionLogs([]);
                    setStartTime(null);
                    setCurrentView('dashboard');
                 }
               } catch (e) {
                 // Fallback if confirm is blocked
                 localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
                 setActivePlan(null);
                 setActiveSessionLogs([]);
                 setStartTime(null);
                 setCurrentView('dashboard');
               }
            }}
          />
        );
      case 'history':
        return (
          <HistoryView 
            sessions={data.sessions}
            plans={data.plans}
            onBack={() => setCurrentView('dashboard')}
            onDeleteSession={deleteSession}
          />
        );
      case 'data':
        return (
          <DataManagement 
            data={data}
            onImport={importData}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      case 'progress':
        return (
          <ProgressView 
            sessions={data.sessions}
            plans={data.plans}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      case 'create-plan':
        return (
          <PlanEditor 
            onSave={handleSavePlan}
            onCancel={() => setCurrentView('dashboard')}
          />
        );
      case 'modify-plan':
        return (
          <PlanEditor 
            existingPlan={modifyingPlan || undefined}
            onSave={handleSavePlan}
            onCancel={() => setCurrentView('dashboard')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0d0e] text-white p-4 max-w-lg mx-auto overflow-x-hidden pb-24">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>

      {activePlan && currentView !== 'active-session' && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto z-50"
        >
          <div className="flex flex-col space-y-2">
            <button 
              onClick={() => setCurrentView('active-session')}
              className="w-full hardware-card p-4 bg-transparent text-accent flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.8)] active:scale-95 transition-transform border border-accent"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-transparent rounded-full animate-pulse border border-accent">
                  <Play size={16} fill="currentColor" className="text-accent" />
                </div>
                <div className="text-left">
                  <p className="text-[9px] mono-label text-accent/60 leading-none font-black uppercase tracking-widest">In Corso</p>
                  <p className="font-black text-sm leading-none mt-1 uppercase tracking-tighter text-accent">{activePlan.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 bg-transparent text-accent border border-accent px-4 py-2 rounded-full font-black text-[10px] tracking-widest">
                  CONTINUA
              </div>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

