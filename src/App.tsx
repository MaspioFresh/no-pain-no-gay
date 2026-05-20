/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useWorkoutData } from './hooks/useWorkoutData';
import { Dashboard } from './components/Dashboard';
import { WorkoutSessionLogger } from './components/WorkoutSessionLogger';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { PlanEditor } from './components/PlanEditor';
import { ProgressView } from './components/ProgressView';
import { WorkoutPlan, WorkoutSession, ExerciseSession } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Timer, ArrowLeft } from 'lucide-react';
import { Modal, useModal } from './components/Modal';

type View = 'dashboard' | 'active-session' | 'history' | 'data' | 'create-plan' | 'view-plan' | 'modify-plan' | 'progress';

const getTargetSetLabel = (s: any, exerciseType?: string) => {
  if (s.isMaxReps) return 'MAX';
  if (exerciseType === 'time') {
    if (s.timeSeconds !== undefined && s.timeSeconds > 0) {
      const m = Math.floor(s.timeSeconds / 60);
      const sec = s.timeSeconds % 60;
      if (m > 0) {
        return `${m}:${sec.toString().padStart(2, '0')}`;
      }
      return `${sec}s`;
    }
    return '0s';
  }
  if (exerciseType === 'cardio') {
    if (s.distance !== undefined && s.distance > 0) {
      return `${s.distance} ${s.unit || 'km'}`;
    }
    if (s.timeSeconds !== undefined && s.timeSeconds > 0) {
      const m = Math.floor(s.timeSeconds / 60);
      const sec = s.timeSeconds % 60;
      if (m > 0) {
        return `${m}:${sec.toString().padStart(2, '0')}`;
      }
      return `${sec}s`;
    }
    return '';
  }
  if (s.minReps !== undefined && s.maxReps !== undefined) {
    return `${s.minReps}-${s.maxReps} RIP`;
  }
  if (s.minReps !== undefined) return `${s.minReps} RIP`;
  if (s.maxReps !== undefined) return `${s.maxReps} RIP`;
  return s.reps ? `${s.reps} RIP` : '';
};

export default function App() {
  const {
    data,
    addSession,
    updateSession,
    addPlan,
    importData,
    findPreviousSession,
    updateSettings,
    deletePlan,
    deleteSession
  } = useWorkoutData();

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [activeSessionLogs, setActiveSessionLogs] = useState<ExerciseSession[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [viewingPlan, setViewingPlan] = useState<WorkoutPlan | null>(null);
  const [modifyingPlan, setModifyingPlan] = useState<WorkoutPlan | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const { modalState, closeModal, showAlert, showConfirm } = useModal();

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
    // Apply theme color and its complementary color
    if (data.settings?.themeColor) {
      const color = data.settings.themeColor;
      document.documentElement.style.setProperty('--accent', color);
      
      const COMPLEMENTARY_COLORS: Record<string, string> = {
        '#dcfc04': '#a855f7', // Yellow -> Purple
        '#4ade80': '#ec4899', // Green -> Pink
        '#3b82f6': '#f97316', // Blue -> Orange
        '#a855f7': '#dcfc04', // Purple -> Yellow
        '#f97316': '#3b82f6', // Orange -> Blue
        '#ef4444': '#06b6d4', // Red -> Cyan
      };
      
      let complementary = COMPLEMENTARY_COLORS[color.toLowerCase()];
      if (!complementary) {
        try {
          const cleanHex = color.replace('#', '');
          const r = 255 - parseInt(cleanHex.substring(0, 2), 16);
          const g = 255 - parseInt(cleanHex.substring(2, 4), 16);
          const b = 255 - parseInt(cleanHex.substring(4, 6), 16);
          const pad = (num: number) => num.toString(16).padStart(2, '0');
          complementary = `#${pad(r)}${pad(g)}${pad(b)}`;
        } catch (e) {
          complementary = '#a855f7';
        }
      }
      document.documentElement.style.setProperty('--accent-complementary', complementary);
    }
  }, [data.settings?.themeColor]);

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
    // Richiede il permesso per le notifiche all'inizio dell'allenamento
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    setActivePlan(plan);
    setActiveSessionLogs((plan.exercises || []).map(ex => ({
      exerciseId: ex.id,
      supersetId: ex.supersetId,
      sets: (ex.targetSets || []).map(t => ({
        reps: t.reps || 0,
        weight: t.weight || 0,
        timeSeconds: t.timeSeconds || 0,
        distance: t.distance || 0,
        unit: data.settings.unit,
        completed: false,
        setMode: t.setMode || 'normal',
        subSetsCount: t.subSetsCount || 0,
        restPauseSeconds: t.restPauseSeconds || 20,
        subSets: t.setMode && t.setMode !== 'normal'
          ? Array.from({ length: t.subSetsCount || 1 }).map(() => ({
              reps: 0,
              weight: t.weight || 0,
              completed: false,
              isMaxReps: false
            }))
          : undefined
      })),
      barbellWeightUsed: ex.barbellWeight || 0
    })));
    setStartTime(Date.now());
    setEditingSessionId(null);
    setCurrentView('active-session');
  };

  const handleEditSession = (session: WorkoutSession) => {
    const plan = data.plans.find(p => p.id === session.planId);
    if (!plan) {
      showAlert('Scheda non trovata', 'Impossibile modificare questa sessione perché la scheda originale è stata eliminata.', 'warning');
      return;
    }
    setActivePlan(plan);
    setActiveSessionLogs(session.exercises);
    setEditingSessionId(session.id);
    setStartTime(null); // Stopwatch non necessario quando si modifica una sessione passata
    setCurrentView('active-session');
  };

  const handleSaveSession = (session: WorkoutSession) => {
    if (editingSessionId) {
      const originalSession = data.sessions.find(s => s.id === editingSessionId);
      updateSession({
        ...session,
        id: editingSessionId,
        date: originalSession?.date || session.date
      });
      setEditingSessionId(null);
    } else {
      addSession(session);
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    }
    setActivePlan(null);
    setActiveSessionLogs([]);
    setStartTime(null);
    setCurrentView('dashboard');
  };

  const handleSavePlan = (plan: WorkoutPlan) => {
    addPlan(plan);
    setCurrentView('dashboard');
  };

  const handleUpdatePlanExerciseNotes = (exerciseId: string, notes: string) => {
    if (!activePlan) return;
    const updatedPlan = {
      ...activePlan,
      exercises: activePlan.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, notes } : ex
      )
    };
    addPlan(updatedPlan);
    setActivePlan(updatedPlan);
  };

  const handleDeletePlan = (planId: string) => {
    const plan = data.plans.find(p => p.id === planId);
    showConfirm(
      'Elimina scheda',
      `Sei sicuro di voler eliminare la scheda "${plan?.name || ''}"? Questa azione è irreversibile.`,
      () => deletePlan(planId),
      'Elimina',
      true
    );
  };

  const handleDeleteSession = (sessionId: string) => {
    const session = data.sessions.find(s => s.id === sessionId);
    const dateStr = session ? new Date(session.date).toLocaleDateString('it-IT') : '';
    showConfirm(
      'Elimina allenamento',
      `Sei sicuro di voler eliminare l'allenamento del ${dateStr}? Questa azione è irreversibile.`,
      () => deleteSession(sessionId),
      'Elimina',
      true
    );
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            plans={data.plans}
            unit={data.settings.unit}
            onToggleUnit={() => updateSettings({ unit: data.settings.unit === 'kg' ? 'lb' : 'kg' })}
            onStartPlan={handleStartPlan}
            onViewPlan={(plan) => {
              setViewingPlan(plan);
              setCurrentView('view-plan');
            }}
            onModifyPlan={(plan) => {
              setModifyingPlan(plan);
              setCurrentView('modify-plan');
            }}
            onDeletePlan={handleDeletePlan}
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
                        SET {i + 1}: {getTargetSetLabel(s, ex.type)} {s.weight ? `${s.weight}kg` : ''}
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
            onUpdatePlanExerciseNotes={handleUpdatePlanExerciseNotes}
            onCancel={() => {
              setCurrentView('dashboard');
            }}
            onFinish={() => {
              showConfirm(
                'Annulla allenamento',
                'Sei sicuro? I progressi non salvati andranno persi.',
                () => {
                  localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
                  localStorage.removeItem('workout_rest_timer');
                  setActivePlan(null);
                  setActiveSessionLogs([]);
                  setStartTime(null);
                  setCurrentView('dashboard');
                },
                'Abbandona',
                true
              );
            }}
            barbellMode={data.settings.barbellMode}
            dumbbellMode={data.settings.dumbbellMode}
            plateLoadedMode={data.settings.plateLoadedMode}
            defaultFocusMode={data.settings.defaultFocusMode}
          />
        );
      case 'history':
        return (
          <HistoryView
            sessions={data.sessions}
            plans={data.plans}
            settings={data.settings}
            onBack={() => setCurrentView('dashboard')}
            onDeleteSession={handleDeleteSession}
            onEditSession={handleEditSession}
          />
        );
      case 'data':
        return (
          <SettingsView
            data={data}
            onImport={importData}
            onUpdateSettings={updateSettings}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      case 'progress':
        return (
          <ProgressView
            sessions={data.sessions}
            plans={data.plans}
            settings={data.settings}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      case 'create-plan':
        return (
          <PlanEditor
            settings={data.settings}
            onSave={handleSavePlan}
            onCancel={() => setCurrentView('dashboard')}
          />
        );
      case 'modify-plan':
        return (
          <PlanEditor
            settings={data.settings}
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
    <div className="min-h-screen bg-[#0c0d0e] text-white p-4 max-w-lg mx-auto pb-24">
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

      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        icon={modalState.icon}
        actions={modalState.actions}
      />
    </div>
  );
}

