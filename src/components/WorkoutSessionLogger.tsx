import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ExerciseSession, SetEntry, WorkoutPlan, WorkoutSession, WeightUnit, PlanSet } from '../types';
import { Plus, Minus, Check, Save, X, History as HistoryIcon, Dumbbell, ArrowLeft, Timer, RotateCcw, MoveRight, ScanLine, ChevronLeft, ChevronRight, Edit2, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence, useAnimation, useMotionValue, animate } from 'motion/react';
import { Stopwatch } from './Stopwatch';
import { Modal } from './Modal';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const getTargetRepsLabel = (targetSet: PlanSet | undefined) => {
  if (!targetSet) return '';
  if (targetSet.isMaxReps) return 'MAX';
  if (targetSet.minReps !== undefined && targetSet.maxReps !== undefined) {
    if (targetSet.minReps === targetSet.maxReps) {
      return `${targetSet.minReps}`;
    }
    return `${targetSet.minReps}-${targetSet.maxReps}`;
  }
  if (targetSet.minReps !== undefined) return `${targetSet.minReps}`;
  if (targetSet.maxReps !== undefined) return `${targetSet.maxReps}`;
  return targetSet.reps !== undefined && targetSet.reps !== null ? `${targetSet.reps}` : '';
};

const getTargetLabel = (targetSet: PlanSet | undefined, exerciseType?: string) => {
  if (!targetSet) return '';
  if (targetSet.isMaxReps) return 'MAX';
  if (exerciseType === 'time') {
    if (targetSet.timeSeconds !== undefined && targetSet.timeSeconds > 0) {
      const m = Math.floor(targetSet.timeSeconds / 60);
      const s = targetSet.timeSeconds % 60;
      if (m > 0) {
        return `${m}:${s.toString().padStart(2, '0')}`;
      }
      return `${s}s`;
    }
  }
  if (exerciseType === 'cardio') {
    if (targetSet.distance !== undefined && targetSet.distance > 0) {
      return `${targetSet.distance}`;
    }
  }
  return getTargetRepsLabel(targetSet);
};

export function RestTimer({
  initialSeconds,
  endTime,
  onReset,
  isMinimized,
  onToggleMinimize,
  onAdjustTime
}: {
  key?: string;
  initialSeconds: number;
  endTime: number;
  onReset: () => void;
  isMinimized: boolean;
  onToggleMinimize: (minimized: boolean) => void;
  onAdjustTime: (newEndTime: number) => void;
}) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, endTime - Date.now()));
  const [isFinished, setIsFinished] = useState(false);

  const soundPlayedRef = React.useRef(false);
  const audioCtxRef = React.useRef<AudioContext | null>(null);

  // Funzione per fermare immediatamente l'audio
  const stopAudio = () => {
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => { });
    }
    audioCtxRef.current = null;
  };

  const triggerAlert = () => {
    // Invia notifica di sistema
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const iconUrl = new URL('/no-pain-no-gay/pwa-192x192.png', window.location.origin).href;
        const title = 'No Pain No Gay';
        const options = {
          body: 'Recupero completato! Prossima serie.',
          icon: iconUrl,
          tag: 'rest-timer',
          renotify: true,
          vibrate: [200, 100, 200],
          requireInteraction: true,
          silent: false
        };

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, options);
          }).catch(() => {
            new Notification(title, options);
          });
        } else {
          new Notification(title, options);
        }
      }
    } catch (e) {
      console.error('Notification failed', e);
    }

    // Play alert sound
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1760, audioCtx.currentTime);

      const now = audioCtx.currentTime;
      gainNode.gain.setValueAtTime(0, now);

      // Ripeti il pattern 10 volte (ogni ciclo dura 1.2s: 0.7s suono + 0.5s pausa)
      for (let cycle = 0; cycle < 10; cycle++) {
        const cycleStart = now + (cycle * 1.2);
        // Programma i 4 suoni per questo ciclo
        for (let i = 0; i < 4; i++) {
          const startTime = cycleStart + (i * 0.2);
          gainNode.gain.setValueAtTime(0.1, startTime);       // Suono ON
          gainNode.gain.setValueAtTime(0, startTime + 0.1);   // Suono OFF
        }
      }

      oscillator.start(now);

      // Ferma l'oscillatore dopo la durata totale (10 cicli * 1.2s = 12s)
      setTimeout(() => {
        try { oscillator.stop(); } catch (e) { }
      }, 12000);
      setTimeout(() => stopAudio(), 12100);
    } catch (e) {
      console.error('Audio alert failed', e);
    }
  };

  // Sincronizzazione, scorrimento del tempo e attivazione degli allarmi gestiti in un unico effetto
  React.useEffect(() => {
    const remaining = Math.max(0, endTime - Date.now());
    setTimeLeft(remaining);

    if (remaining > 0) {
      setIsFinished(false);
      soundPlayedRef.current = false;
      stopAudio();
    } else {
      setIsFinished(true);
      if (!soundPlayedRef.current) {
        soundPlayedRef.current = true;
        triggerAlert();
      }
      return;
    }

    const interval = setInterval(() => {
      const currentRemaining = Math.max(0, endTime - Date.now());
      setTimeLeft(currentRemaining);

      if (currentRemaining <= 0) {
        setIsFinished(true);
        if (!soundPlayedRef.current) {
          soundPlayedRef.current = true;
          triggerAlert();
        }
        clearInterval(interval);
      }
    }, 100);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const visRemaining = Math.max(0, endTime - Date.now());
        setTimeLeft(visRemaining);
        if (visRemaining <= 0) {
          setIsFinished(true);
          if (!soundPlayedRef.current) {
            soundPlayedRef.current = true;
            triggerAlert();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopAudio();
    };
  }, [endTime]);

  const formatTime = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs.toString().padStart(2, '0')}`;
  };

  const adjustTime = (delta: number) => {
    const newEndTime = endTime + delta * 1000;
    onAdjustTime(newEndTime);
  };

  const handleClose = () => {
    stopAudio(); // Interrompe il suono prima di chiudere
    onReset();
  };

  const isDraggingRef = React.useRef(false);
  const x = useMotionValue(0);

  if (isMinimized) {
    return (
      <motion.button
        drag
        dragMomentum={false}
        onDragStart={() => {
          isDraggingRef.current = true;
        }}
        onDragEnd={() => {
          animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
          // Mantieni isDraggingRef true per un istante per evitare il trigger del tap
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 100);
        }}
        onTap={() => {
          if (!isDraggingRef.current) {
            onToggleMinimize(false);
          }
        }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        className={`fixed z-[100] w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center bg-[#0c0d0e]/95 backdrop-blur-md shadow-2xl cursor-grab active:cursor-grabbing transition-colors ${isFinished ? 'border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'border-accent text-accent shadow-[0_0_20px_rgba(220,252,4,0.3)]'}`}
        style={{ x, bottom: '100px', right: '20px' }}
      >
        <div className="flex flex-col items-center">
          <Timer size={14} className={isFinished ? 'animate-bounce' : 'animate-pulse'} />
          <span className="text-[10px] font-mono font-black tabular-nums">{formatTime(timeLeft)}</span>
        </div>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 p-6 flex flex-col items-center border-2 rounded-2xl transition-colors duration-500 bg-[#0c0d0e]/95 backdrop-blur-md ${isFinished ? 'text-red-500 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'text-accent border-accent shadow-[0_0_30px_rgba(220,252,4,0.15)]'}`}
    >
      <div className="flex items-center space-x-2 mb-2">
        <Timer size={16} className={isFinished ? 'animate-bounce' : 'animate-pulse'} />
        <span className="text-xs font-black uppercase tracking-widest">{isFinished ? 'RECUPERO FINITO!' : 'RECUPERO'}</span>
      </div>

      <div className="text-5xl font-mono font-black tracking-tighter tabular-nums mb-6">
        {formatTime(timeLeft)}
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => adjustTime(-10)}
          className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center font-black text-lg active:scale-90"
        >
          -10
        </button>
        <button
          onClick={() => adjustTime(10)}
          className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center font-black text-lg active:scale-90"
        >
          +10
        </button>
      </div>

      <div className="flex flex-col space-y-2 w-full">
        <button
          onClick={() => onToggleMinimize(true)}
          className={`w-full p-3 rounded-xl flex items-center justify-center space-x-2 active:scale-95 transition-all font-black uppercase tracking-widest text-xs border ${isFinished ? 'border-red-500 text-red-500 bg-transparent hover:bg-red-500/10' : 'border-accent text-accent bg-transparent hover:bg-accent/10'}`}
        >
          <Timer size={16} />
          <span>Nascondi</span>
        </button>
        <button
          onClick={handleClose}
          className={`w-full p-3 rounded-xl flex items-center justify-center space-x-2 active:scale-95 transition-all font-black uppercase tracking-widest text-xs border border-red-500 text-red-500 bg-transparent hover:bg-red-500/10`}
        >
          <X size={16} />
          <span>Interrompi</span>
        </button>
      </div>
    </motion.div>
  );
}

interface WorkoutSessionLoggerProps {
  plan: WorkoutPlan;
  previousSession?: WorkoutSession;
  unit: WeightUnit;
  exerciseSessions: ExerciseSession[];
  setExerciseSessions: React.Dispatch<React.SetStateAction<ExerciseSession[]>>;
  startTime: number | null;
  onSave: (session: WorkoutSession) => void;
  onUpdatePlanExerciseNotes: (exerciseId: string, notes: string) => void;
  onCancel: () => void;
  onFinish: () => void;
  barbellMode?: 'total' | 'perSide';
  dumbbellMode?: 'total' | 'perSide';
  plateLoadedMode?: 'total' | 'perSide';
  defaultFocusMode?: boolean;
}

export function WorkoutSessionLogger({
  plan,
  previousSession,
  unit,
  exerciseSessions,
  setExerciseSessions,
  startTime,
  onSave,
  onUpdatePlanExerciseNotes,
  onCancel,
  onFinish,
  barbellMode = 'total',
  dumbbellMode = 'total',
  plateLoadedMode = 'total',
  defaultFocusMode = false
}: WorkoutSessionLoggerProps) {
  const REST_TIMER_STORAGE_KEY = 'workout_rest_timer';

  const [restTimerActive, setRestTimerActive] = useState(false);
  const [isRestTimerMinimized, setIsRestTimerMinimized] = useState(false);
  const [currentRestSeconds, setCurrentRestSeconds] = useState(60);
  const [restTimerEndTime, setRestTimerEndTime] = useState<number | null>(null);
  const [focusMode, setFocusMode] = useState(defaultFocusMode);
  const [editingPlanExId, setEditingPlanExId] = useState<string | null>(null);
  const [editingPlanExNotes, setEditingPlanExNotes] = useState('');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);


  const [activeSetTimer, setActiveSetTimer] = useState<{
    exIdx: number;
    setIdx: number;
    type: 'timer' | 'stopwatch';
    startTime: number;
    initialTimeSeconds: number;
  } | null>(null);

  // Ripristina lo stato del timer di recupero da localStorage all'avvio
  useEffect(() => {
    const saved = localStorage.getItem(REST_TIMER_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.endTime === 'number') {
          // Ripristina il timer solo se non è scaduto da più di 10 minuti
          if (Date.now() - parsed.endTime < 10 * 60 * 1000) {
            setCurrentRestSeconds(parsed.initialSeconds || 60);
            setIsRestTimerMinimized(parsed.isMinimized || false);
            setRestTimerEndTime(parsed.endTime);
            setRestTimerActive(true);
          } else {
            localStorage.removeItem(REST_TIMER_STORAGE_KEY);
          }
        }
      } catch (e) {
        console.error('Failed to parse rest timer', e);
      }
    }
  }, []);

  const updateBarbell = (exerciseIndex: number, weight: number) => {
    const newSessions = [...exerciseSessions];
    newSessions[exerciseIndex].barbellWeightUsed = weight;
    setExerciseSessions(newSessions);
  };

  const updateExerciseNotes = (exerciseIndex: number, notes: string) => {
    const newSessions = [...exerciseSessions];
    newSessions[exerciseIndex].notes = notes;
    setExerciseSessions(newSessions);
  };

  const addSet = (exerciseIndex: number) => {
    const newSessions = [...exerciseSessions];
    const lastSet = newSessions[exerciseIndex].sets[newSessions[exerciseIndex].sets.length - 1];
    newSessions[exerciseIndex].sets.push({
      reps: lastSet?.reps,
      weight: lastSet?.weight || 0,
      unit: lastSet?.unit || unit,
      completed: false
    });
    setExerciseSessions(newSessions);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const newSessions = [...exerciseSessions];
    newSessions[exerciseIndex].sets.splice(setIndex, 1);
    if (newSessions[exerciseIndex].sets.length === 0) {
      newSessions[exerciseIndex].sets.push({ weight: 0, unit: unit, completed: false });
    }
    setExerciseSessions(newSessions);
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof SetEntry, value: any) => {
    const newSessions = [...exerciseSessions];
    newSessions[exerciseIndex].sets[setIndex] = {
      ...newSessions[exerciseIndex].sets[setIndex],
      [field]: value
    };
    setExerciseSessions(newSessions);
  };

  const triggerSetTimerAlert = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 100]);
    }
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const title = 'No Pain No Gay';
        new Notification(title, {
          body: 'Tempo esercizio completato!',
          requireInteraction: false,
          silent: false
        });
      }
    } catch (e) {
      console.error('Notification failed', e);
    }
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(2000, audioCtx.currentTime);
      const now = audioCtx.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      for (let i = 0; i < 3; i++) {
        const startTime = now + (i * 0.25);
        gainNode.gain.setValueAtTime(0.2, startTime);
        gainNode.gain.setValueAtTime(0, startTime + 0.15);
      }
      oscillator.start(now);
      setTimeout(() => {
        try { oscillator.stop(); } catch (e) {}
        try { audioCtx.close(); } catch (e) {}
      }, 1000);
    } catch (e) {
      console.error('Audio alert failed', e);
    }
  };

  const handleToggleSetTimer = (exIdx: number, setIdx: number) => {
    const isRunning = activeSetTimer && activeSetTimer.exIdx === exIdx && activeSetTimer.setIdx === setIdx;
    if (isRunning) {
      setActiveSetTimer(null);
    } else {
      const session = exerciseSessions[exIdx];
      const set = session?.sets[setIdx];
      const targetSet = plan.exercises[exIdx]?.targetSets?.[setIdx];
      const hasTarget = targetSet && typeof targetSet.timeSeconds === 'number' && targetSet.timeSeconds > 0 && !targetSet.isMaxReps;
      
      let initialTime = set?.timeSeconds || 0;
      if (initialTime === 0 && hasTarget) {
        initialTime = targetSet.timeSeconds!;
        updateSet(exIdx, setIdx, 'timeSeconds', initialTime);
      }
      
      setActiveSetTimer({
        exIdx,
        setIdx,
        type: hasTarget ? 'timer' : 'stopwatch',
        startTime: Date.now(),
        initialTimeSeconds: initialTime
      });
    }
  };

  const handleResetSetTimer = (exIdx: number, setIdx: number) => {
    const isRunning = activeSetTimer && activeSetTimer.exIdx === exIdx && activeSetTimer.setIdx === setIdx;
    if (isRunning) {
      setActiveSetTimer(null);
    }
    updateSet(exIdx, setIdx, 'timeSeconds', 0);
  };

  useEffect(() => {
    if (!activeSetTimer) return;
    
    const syncTimer = () => {
      setActiveSetTimer(current => {
        if (!current) return null;
        const elapsedMs = Date.now() - current.startTime;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        
        let newTime = 0;
        if (current.type === 'timer') {
          newTime = Math.max(0, current.initialTimeSeconds - elapsedSeconds);
        } else {
          newTime = current.initialTimeSeconds + elapsedSeconds;
        }
        
        setExerciseSessions(prev => {
          const newSessions = [...prev];
          if (newSessions[current.exIdx]?.sets[current.setIdx]) {
            newSessions[current.exIdx].sets[current.setIdx] = {
              ...newSessions[current.exIdx].sets[current.setIdx],
              timeSeconds: newTime
            };
          }
          return newSessions;
        });
        
        if (current.type === 'timer' && newTime === 0) {
          triggerSetTimerAlert();
          setExerciseSessions(prev => {
            const newSessions = [...prev];
            if (newSessions[current.exIdx]?.sets[current.setIdx]) {
              newSessions[current.exIdx].sets[current.setIdx] = {
                ...newSessions[current.exIdx].sets[current.setIdx],
                timeSeconds: current.initialTimeSeconds
              };
            }
            return newSessions;
          });
          return null;
        }
        return current;
      });
    };

    const interval = setInterval(syncTimer, 200);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeSetTimer, setExerciseSessions]);

  const updateSubSet = (exerciseIndex: number, setIndex: number, subSetIndex: number, field: 'reps' | 'weight' | 'completed', value: any) => {
    const newSessions = [...exerciseSessions];
    const set = newSessions[exerciseIndex]?.sets[setIndex];
    if (set && set.subSets && set.subSets[subSetIndex]) {
      const updatedSubSets = [...set.subSets];
      updatedSubSets[subSetIndex] = {
        ...updatedSubSets[subSetIndex],
        [field]: value
      };
      set.subSets = updatedSubSets;
    }
    setExerciseSessions(newSessions);
  };

  const triggerRestTimer = (seconds: number) => {
    const targetEndTime = Date.now() + seconds * 1000;
    setCurrentRestSeconds(seconds);
    setRestTimerEndTime(targetEndTime);
    setRestTimerActive(true);
    setIsRestTimerMinimized(false);

    localStorage.setItem(REST_TIMER_STORAGE_KEY, JSON.stringify({
      endTime: targetEndTime,
      initialSeconds: seconds,
      isMinimized: false
    }));
  };

  const handleToggleMinimize = (minimized: boolean) => {
    setIsRestTimerMinimized(minimized);
    if (restTimerEndTime !== null) {
      localStorage.setItem(REST_TIMER_STORAGE_KEY, JSON.stringify({
        endTime: restTimerEndTime,
        initialSeconds: currentRestSeconds,
        isMinimized: minimized
      }));
    }
  };

  const handleAdjustRestTime = (newEndTime: number) => {
    setRestTimerEndTime(newEndTime);
    localStorage.setItem(REST_TIMER_STORAGE_KEY, JSON.stringify({
      endTime: newEndTime,
      initialSeconds: currentRestSeconds,
      isMinimized: isRestTimerMinimized
    }));
  };

  const handleResetRestTimer = () => {
    setRestTimerActive(false);
    setRestTimerEndTime(null);
    localStorage.removeItem(REST_TIMER_STORAGE_KEY);
  };

  const handleSetCheckToggle = (exIdx: number, setIdx: number) => {
    const newSessions = [...exerciseSessions];
    const set = newSessions[exIdx]?.sets[setIdx];
    if (!set) return;

    const targetState = !set.completed;
    set.completed = targetState;
    if (set.subSets) {
      set.subSets = set.subSets.map(sub => ({ ...sub, completed: targetState }));
    }
    setExerciseSessions(newSessions);

    if (targetState) {
      const group = groupedExercises.find(g => g.items.some((i: any) => i.exIdx === exIdx));
      if (group) {
        const allCompleted = group.items.every((item: any) => newSessions[item.exIdx]?.sets[setIdx]?.completed);
        if (allCompleted) {
          const maxRest = Math.max(...group.items.map((i: any) => plan.exercises[i.exIdx]?.restSeconds || 60));
          triggerRestTimer(maxRest);
        }
      }
    }
  };


  const groupedExercises = React.useMemo(() => {
    const groups: any[] = [];
    let currentGroup: any[] = [];

    (plan.exercises || []).forEach((exercise, exIdx) => {
      const item = { exercise, exIdx };

      if (currentGroup.length === 0) {
        currentGroup.push(item);
      } else {
        const prev = currentGroup[currentGroup.length - 1];
        if (exercise.supersetId && exercise.supersetId === prev.exercise.supersetId) {
          currentGroup.push(item);
        } else {
          groups.push({ isSuperset: currentGroup.length > 1, items: currentGroup });
          currentGroup = [item];
        }
      }
    });
    if (currentGroup.length > 0) {
      groups.push({ isSuperset: currentGroup.length > 1, items: currentGroup });
    }
    return groups;
  }, [plan.exercises]);

  const workoutSetSequence = React.useMemo(() => {
    const sequence: { groupIdx: number; exIdx: number; setIdx: number }[] = [];
    groupedExercises.forEach((group, groupIdx) => {
      const maxSets = Math.max(...group.items.map((item: any) => exerciseSessions[item.exIdx]?.sets.length || 0));
      for (let setIdx = 0; setIdx < maxSets; setIdx++) {
        group.items.forEach((item: any) => {
          if (exerciseSessions[item.exIdx]?.sets[setIdx]) {
            sequence.push({
              groupIdx,
              exIdx: item.exIdx,
              setIdx
            });
          }
        });
      }
    });
    return sequence;
  }, [groupedExercises, exerciseSessions]);

  const currentFocusIndex = React.useMemo(() => {
    const currentStep = workoutSetSequence[activeStepIndex];
    return currentStep ? currentStep.groupIdx : 0;
  }, [activeStepIndex, workoutSetSequence]);

  const initializedActiveStep = useRef(false);
  useEffect(() => {
    if (!initializedActiveStep.current && workoutSetSequence.length > 0) {
      const firstIncomplete = workoutSetSequence.findIndex(step => {
        const set = exerciseSessions[step.exIdx]?.sets[step.setIdx];
        return set && !set.completed;
      });
      if (firstIncomplete !== -1) {
        setActiveStepIndex(firstIncomplete);
      }
      initializedActiveStep.current = true;
    }
  }, [workoutSetSequence, exerciseSessions]);

  // Auto-scroll to active set row
  useEffect(() => {
    const currentStep = workoutSetSequence[activeStepIndex];
    if (currentStep) {
      const element = document.getElementById(`set-row-${currentStep.exIdx}-${currentStep.setIdx}`);
      if (element) {
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [activeStepIndex, workoutSetSequence]);

  const handleCompleteActiveStep = () => {
    const currentStep = workoutSetSequence[activeStepIndex];
    if (!currentStep) return;

    const { exIdx, setIdx } = currentStep;
    const set = exerciseSessions[exIdx]?.sets[setIdx];
    if (!set) return;

    if (!set.completed) {
      handleSetCheckToggle(exIdx, setIdx);
    }

    if (activeStepIndex < workoutSetSequence.length - 1) {
      setActiveStepIndex(activeStepIndex + 1);
    }
  };

  const handlePrevExercise = () => {
    if (currentFocusIndex > 0) {
      const prevGroupIdx = currentFocusIndex - 1;
      const targetIdx = workoutSetSequence.findIndex(step => step.groupIdx === prevGroupIdx);
      if (targetIdx !== -1) {
        setActiveStepIndex(targetIdx);
      }
    }
  };

  const handleNextExercise = () => {
    if (currentFocusIndex < groupedExercises.length - 1) {
      const nextGroupIdx = currentFocusIndex + 1;
      const targetIdx = workoutSetSequence.findIndex(step => step.groupIdx === nextGroupIdx);
      if (targetIdx !== -1) {
        setActiveStepIndex(targetIdx);
      }
    }
  };


  const isGroupFinished = (group: any) => {
    return group.items.every((item: any) => {
      const session = exerciseSessions[item.exIdx];
      return session && session.sets.length > 0 && session.sets.every((s: any) => s.completed);
    });
  };

  const toggleSupersetComplete = (exerciseIndices: number[], setIndex: number) => {
    const newSessions = [...exerciseSessions];
    const allCompleted = exerciseIndices.every(idx => newSessions[idx]?.sets[setIndex]?.completed);
    const targetState = !allCompleted;

    exerciseIndices.forEach(idx => {
      if (newSessions[idx] && newSessions[idx].sets[setIndex]) {
        newSessions[idx].sets[setIndex].completed = targetState;
      }
    });

    setExerciseSessions(newSessions);

    if (targetState) {
      const maxRest = Math.max(...exerciseIndices.map(idx => plan.exercises[idx]?.restSeconds || 60));
      triggerRestTimer(maxRest);
    }
  };

  const getPreviousSetData = (exerciseId: string, setIndex: number) => {
    if (!previousSession) return null;
    const prevEx = previousSession.exercises.find(e => e.exerciseId === exerciseId);
    if (!prevEx || !prevEx.sets[setIndex]) return null;
    return prevEx.sets[setIndex];
  };

  const handleSave = () => {
    const session: WorkoutSession = {
      id: generateId(),
      planId: plan.id,
      date: new Date().toISOString(),
      exercises: exerciseSessions,
      unitAtTime: unit
    };
    localStorage.removeItem(REST_TIMER_STORAGE_KEY);
    onSave(session);
  };

  return (
    <div className="flex flex-col space-y-6 pb-44">
      <div className="sticky top-0 bg-[#0c0d0e]/95 backdrop-blur-lg z-40 border-b border-white/10 px-1">
        {/* Row 1: title + buttons */}
        <div className="flex items-center justify-between py-3 gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            <button onClick={onCancel} className="p-2 rounded-full bg-transparent border border-accent text-accent hover:bg-accent/10 flex-shrink-0" title="Riduci a icona">
              <ArrowLeft size={20} />
            </button>
            <button
              onClick={() => setFocusMode(!focusMode)}
              className={`p-2 rounded-full border transition-all flex-shrink-0 ${focusMode ? 'bg-accent border-accent text-[#0c0d0e]' : 'bg-transparent border-white/20 text-white/40 hover:border-accent hover:text-accent'}`}
              title={focusMode ? "Disattiva Focus Mode" : "Attiva Focus Mode"}
            >
              <ScanLine size={20} />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-bold tracking-tight leading-none mb-1 truncate" title={plan.name}>{plan.name}</h2>
              <p className="text-[9px] mono-label accent-text uppercase tracking-widest leading-none truncate">In corso • {unit}</p>
            </div>
          </div>
          <div className="flex space-x-2 flex-shrink-0">
            <button
              onClick={onFinish}
              className="p-2 rounded-full bg-transparent border border-red-500 text-red-500 hover:bg-red-500/10 active:scale-95 transition-all flex items-center justify-center"
              title="Annulla Allenamento"
            >
              <X size={20} className="stroke-[3]" />
            </button>
            <button
              onClick={handleSave}
              className="rounded-full bg-transparent text-accent font-extrabold flex items-center space-x-2 px-4 py-2 shadow-[0_0_20px_rgba(220,252,4,0.15)] hover:bg-accent/10 active:scale-95 transition-all text-sm border border-accent"
            >
              <Check size={18} className="text-accent stroke-[3]" />
              <span className="text-accent uppercase tracking-widest font-black">Fine</span>
            </button>
          </div>
        </div>
        {/* Row 2: stopwatch */}
        <div className="flex justify-center pb-2">
          <Stopwatch startTime={startTime} compact />
        </div>
        {/* Exercise Navigation Header & Progress (Focus Mode only) */}
        {focusMode && (
          <div className="flex flex-col space-y-2 mt-1 pb-3 px-2">
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handlePrevExercise}
                disabled={currentFocusIndex === 0}
                className="flex items-center space-x-1 py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 active:scale-95 transition-all"
              >
                <ChevronLeft size={14} />
                <span>Prec.</span>
              </button>
              <span className="mono-label text-[10px] text-white/50 uppercase tracking-widest font-black">
                Esercizio {currentFocusIndex + 1} di {groupedExercises.length}
              </span>
              <button
                type="button"
                onClick={handleNextExercise}
                disabled={currentFocusIndex === groupedExercises.length - 1}
                className="flex items-center space-x-1 py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 active:scale-95 transition-all"
              >
                <span>Succ.</span>
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent shadow-[0_0_10px_rgba(220,252,4,0.5)]"
                animate={{ width: `${((currentFocusIndex + 1) / groupedExercises.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {restTimerActive && restTimerEndTime !== null && (
          <RestTimer
            key="workout-rest-timer"
            initialSeconds={currentRestSeconds}
            endTime={restTimerEndTime}
            onReset={handleResetRestTimer}
            isMinimized={isRestTimerMinimized}
            onToggleMinimize={handleToggleMinimize}
            onAdjustTime={handleAdjustRestTime}
          />
        )}
      </AnimatePresence>


      <div className="space-y-6">
        {focusMode ? (
          <div className="flex flex-col space-y-4">
            {/* Current Group */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentFocusIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                {(() => {
                  const group = groupedExercises[currentFocusIndex];
                  if (!group) return null;

                  const maxSets = Math.max(...group.items.map((item: any) => exerciseSessions[item.exIdx]?.sets.length || 0));

                  return (
                    <div className="hardware-card overflow-hidden bg-white/[0.02] border-white/10 flex flex-col relative">
                      {group.isSuperset && (
                        <div className="absolute top-0 right-4 bg-accent text-[#0c0d0e] font-black text-[9px] px-2 py-1 rounded-b-lg tracking-widest uppercase shadow-[0_0_15px_rgba(220,252,4,0.3)] z-[5]">
                          Superserie
                        </div>
                      )}

                      {/* Header: All exercises in group */}
                      <div className="flex flex-col border-b border-white/5 bg-white/5">
                        {group.items.map((item: any, i: number) => {
                          const exercise = item.exercise;
                          const exIdx = item.exIdx;
                          return (
                            <div key={i} className={`p-4 ${i > 0 ? 'border-t border-white/5' : ''}`}>
                              <div className="flex justify-between items-start">
                                <div className="flex flex-col flex-1">
                                  <div className="flex items-center space-x-3">
                                    {exercise.imageUrl && (
                                      <img src={exercise.imageUrl} alt={exercise.name} className="w-10 h-10 object-cover rounded bg-white/5 border border-white/10" />
                                    )}
                                    <h3 className="font-bold text-lg leading-tight">{exercise.name}</h3>
                                  </div>
                                  <div
                                    className="relative mt-1 cursor-pointer group"
                                    onClick={() => {
                                      setEditingPlanExId(exercise.id);
                                      setEditingPlanExNotes(exercise.notes || '');
                                    }}
                                  >
                                    <p className="text-[10px] text-white/40 italic leading-relaxed pr-6">
                                      {exercise.notes || 'Aggiungi note scheda...'}
                                    </p>
                                    <div className="absolute right-0 top-0 p-1 text-accent/40 group-hover:text-accent transition-colors">
                                      <Edit2 size={10} />
                                    </div>
                                  </div>
                                  {previousSession && (
                                    (() => {
                                      const prevEx = previousSession.exercises.find(e => e.exerciseId === exercise.id);
                                      if (prevEx?.notes) {
                                        return (
                                          <div className="flex items-start space-x-1 mt-1 opacity-60">
                                            <HistoryIcon size={8} className="mt-1 text-accent" />
                                            <p className="text-[9px] text-accent/80 italic leading-tight">Precedente: {prevEx.notes}</p>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()
                                  )}
                                  {(!exercise.type || exercise.type === 'barbell') && (
                                    <div className="flex items-center space-x-1 mt-2">
                                      <Dumbbell size={10} className="text-accent" />
                                      <span className="text-[10px] text-white/30 uppercase mono-label">Bilanciere: </span>
                                      <input
                                        type="number"
                                        value={exerciseSessions[exIdx]?.barbellWeightUsed || ''}
                                        onChange={(e) => updateBarbell(exIdx, parseFloat(e.target.value) || 0)}
                                        className="w-10 bg-white/5 text-[10px] font-bold text-center rounded text-accent focus:outline-none focus:ring-1 focus:ring-accent py-0.5"
                                      />
                                      <span className="text-[10px] text-white/30 uppercase mono-label">{unit}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Body: Sets interleaved */}
                      <div className="p-4 space-y-4">
                        <AnimatePresence>
                          {Array.from({ length: maxSets }).map((_, setIdx) => {
                            const isSetCompleted = group.items.every((item: any) => exerciseSessions[item.exIdx]?.sets[setIdx]?.completed);

                            return (
                              <motion.div
                                key={setIdx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`flex flex-col space-y-3 transition-opacity duration-300 ${group.isSuperset && setIdx < maxSets - 1 ? 'border-b border-white/5 pb-4' : ''}`}
                              >
                                {group.items.map((item: any, i: number) => {
                                  const exercise = item.exercise;
                                  const exIdx = item.exIdx;
                                  const session = exerciseSessions[exIdx];
                                  const set = session?.sets[setIdx];
                                  const prevSet = getPreviousSetData(exercise.id, setIdx);
                                  const targetSet = (exercise.targetSets || [])[setIdx];

                                  if (!set) return null;

                                  const isActive = workoutSetSequence[activeStepIndex]?.exIdx === exIdx && workoutSetSequence[activeStepIndex]?.setIdx === setIdx;

                                  const barbell = session?.barbellWeightUsed || 0;
                                  const platesPerSide = set.weight && set.weight > barbell ? (set.weight - barbell) / 2 : 0;

                                  const isPerSide = exercise.type === 'barbell' || !exercise.type
                                    ? barbellMode === 'perSide'
                                    : exercise.type === 'dumbbell'
                                      ? dumbbellMode === 'perSide'
                                      : exercise.type === 'plateLoaded'
                                        ? plateLoadedMode === 'perSide'
                                        : false;
                                  const rawWeight = set.weight || 0;
                                  const weightDisplayVal: number | string = isPerSide
                                    ? (!exercise.type || exercise.type === 'barbell')
                                      ? (rawWeight > barbell ? (rawWeight - barbell) / 2 : '')
                                      : (rawWeight > 0 ? rawWeight / 2 : '')
                                    : (rawWeight || '');
                                  const prevRaw = getPreviousSetData(exercise.id, setIdx)?.weight || (exercise.targetSets || [])[setIdx]?.weight || 0;
                                  const weightPlaceholder = isPerSide && prevRaw
                                    ? String((!exercise.type || exercise.type === 'barbell') ? (prevRaw > barbell ? (prevRaw - barbell) / 2 : 0) : prevRaw / 2)
                                    : (prevRaw ? String(prevRaw) : '0');

                                  return (
                                    <div key={i} className="flex flex-col space-y-1 relative">
                                      {group.isSuperset && (
                                        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-full bg-accent/20 rounded-full" />
                                      )}
                                      <div className="flex w-full space-x-1 text-[7px] mono-label text-white/40 uppercase items-center">
                                        <div className="w-8 flex-shrink-0" />
                                        {exercise.type === 'cardio' ? (
                                          <><div className="flex-1 text-center">DIST</div><div className="w-14 flex-shrink-0" /><div className="flex-1 text-center">TEMPO</div></>
                                        ) : exercise.type === 'time' ? (
                                          <><div className="flex-1 text-center">PESO</div><div className="w-14 flex-shrink-0" /><div className="flex-1 text-center">TEMPO</div></>
                                        ) : (
                                          <>
                                            <div className="flex-1 text-center flex items-center justify-center gap-1">
                                              <span>{isPerSide ? 'P.LATO' : 'PESO'}</span>
                                              {!isPerSide && platesPerSide > 0 && (!exercise.type || exercise.type === 'barbell' || exercise.type === 'plateLoaded') && (
                                                <span className="text-[7px] font-mono text-accent/50 normal-case">
                                                  ({exercise.type === 'plateLoaded' ? (rawWeight / 2).toFixed(1) : platesPerSide.toFixed(1)}/lato)
                                                </span>
                                              )}
                                            </div>
                                            <div className="w-14 flex-shrink-0" />
                                            <div className="flex-1 text-center">REPS</div>
                                          </>
                                        )}
                                      </div>
                                      <div
                                        id={`set-row-${exIdx}-${setIdx}`}
                                        onClick={() => {
                                          const idx = workoutSetSequence.findIndex(s => s.exIdx === exIdx && s.setIdx === setIdx);
                                          if (idx !== -1) setActiveStepIndex(idx);
                                        }}
                                        className={`flex w-full space-x-1 items-center p-1 rounded-xl transition-all duration-300 cursor-pointer ${
                                          isActive
                                            ? 'border border-accent/40 bg-accent/[0.06] ring-1 ring-accent/25 shadow-[0_0_12px_rgba(220,252,4,0.1)]'
                                            : set.completed
                                              ? 'border border-accent/20 bg-accent/[0.02]'
                                              : 'border border-transparent hover:border-white/5 hover:bg-white/[0.01]'
                                        }`}
                                      >
                                        {/* Unit Button */}
                                        <button
                                          type="button"
                                          onClick={() => updateSet(exIdx, setIdx, 'unit', (exercise.type === 'cardio' ? (set.unit === 'km' ? 'm' : 'km') : (set.unit === 'kg' ? 'lb' : 'kg')) as any)}
                                          className={`w-8 h-[38px] flex items-center justify-center text-[9px] font-black rounded-lg uppercase border transition-all active:scale-95 flex-shrink-0 ${(exercise.type === 'cardio' ? set.unit !== 'm' : set.unit !== 'lb')
                                            ? 'bg-accent text-[#0c0d0e] border-accent shadow-[0_0_3px_var(--accent)]'
                                            : 'bg-[var(--accent-complementary)] text-[#0c0d0e] border-[var(--accent-complementary)] shadow-[0_0_3px_var(--accent-complementary)]'
                                            }`}
                                        >
                                          {exercise.type === 'cardio' ? (set.unit === 'km' || set.unit === 'm' ? set.unit : 'km') : (set.unit === 'kg' || set.unit === 'lb' ? set.unit : 'kg')}
                                        </button>

                                        {/* Left Input (Weight / Distance) */}
                                        <div className="flex-1">
                                          <div className="flex flex-col space-y-1">
                                            {exercise.type === 'cardio' ? (
                                              <input
                                                type="number"
                                                value={set.distance || ''}
                                                onChange={(e) => updateSet(exIdx, setIdx, 'distance', parseFloat(e.target.value))}
                                                placeholder={prevSet?.distance ? `${prevSet.distance}` : (targetSet?.distance ? `${targetSet.distance}` : '0')}
                                                className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                                              />
                                            ) : (
                                              <>
                                                <input
                                                  type="number"
                                                  value={weightDisplayVal}
                                                  onChange={(e) => {
                                                    const n = parseFloat(e.target.value) || 0;
                                                    if (isPerSide) {
                                                      const total = (!exercise.type || exercise.type === 'barbell') ? (n * 2) + barbell : n * 2;
                                                      updateSet(exIdx, setIdx, 'weight', total);
                                                    } else {
                                                      updateSet(exIdx, setIdx, 'weight', n);
                                                    }
                                                  }}
                                                  placeholder={weightPlaceholder}
                                                  className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                                                />
                                              </>
                                            )}
                                          </div>
                                        </div>

                                        {/* Target Reps Badge / Spacer */}
                                        <div className="w-14 flex-shrink-0 flex items-center justify-center h-[38px]">
                                          {(() => {
                                            const targetRepsLabel = getTargetLabel(targetSet, exercise.type);
                                            return targetRepsLabel ? (
                                              <span className="w-full h-full flex items-center justify-center text-[11px] font-mono font-black bg-accent text-[#0c0d0e] border border-accent rounded-lg shadow-[0_0_3px_var(--accent)] text-center uppercase" title="Target Reps">
                                                {targetRepsLabel}
                                              </span>
                                            ) : (
                                              <div className="w-full" />
                                            );
                                          })()}
                                        </div>

                                        {/* Right Input (Reps / Time) */}
                                        <div className="flex-1">
                                          {exercise.type === 'cardio' ? (
                                            <div className="flex w-full space-x-1">
                                              <input
                                                type="number"
                                                value={Math.floor((set.timeSeconds || 0) / 3600) || ''}
                                                onChange={(e) => {
                                                  const h = parseInt(e.target.value) || 0;
                                                  const m = Math.floor(((set.timeSeconds || 0) % 3600) / 60);
                                                  const s = (set.timeSeconds || 0) % 60;
                                                  updateSet(exIdx, setIdx, 'timeSeconds', h * 3600 + m * 60 + s);
                                                }}
                                                placeholder={prevSet?.timeSeconds ? `${Math.floor(prevSet.timeSeconds / 3600)}` : (targetSet?.timeSeconds ? `${Math.floor(targetSet.timeSeconds / 3600)}` : 'h')}
                                                className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                                              />
                                              <span className="text-white/30 self-center">:</span>
                                              <input
                                                type="number"
                                                value={Math.floor(((set.timeSeconds || 0) % 3600) / 60) || ''}
                                                onChange={(e) => {
                                                  const m = parseInt(e.target.value) || 0;
                                                  const h = Math.floor((set.timeSeconds || 0) / 3600);
                                                  const s = (set.timeSeconds || 0) % 60;
                                                  updateSet(exIdx, setIdx, 'timeSeconds', h * 3600 + m * 60 + s);
                                                }}
                                                placeholder={prevSet?.timeSeconds ? `${Math.floor((prevSet.timeSeconds % 3600) / 60)}` : (targetSet?.timeSeconds ? `${Math.floor((targetSet.timeSeconds % 3600) / 60)}` : 'm')}
                                                className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                                              />
                                              <span className="text-white/30 self-center">:</span>
                                              <input
                                                type="number"
                                                value={(set.timeSeconds || 0) % 60 || ''}
                                                onChange={(e) => {
                                                  const s = parseInt(e.target.value) || 0;
                                                  const h = Math.floor((set.timeSeconds || 0) / 3600);
                                                  const m = Math.floor(((set.timeSeconds || 0) % 3600) / 60);
                                                  updateSet(exIdx, setIdx, 'timeSeconds', h * 3600 + m * 60 + s);
                                                }}
                                                placeholder={prevSet?.timeSeconds ? `${prevSet.timeSeconds % 60}` : (targetSet?.timeSeconds ? `${targetSet.timeSeconds % 60}` : 's')}
                                                className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                                              />
                                            </div>
                                          ) : exercise.type === 'time' ? (
                                            <div className="flex w-full space-x-1">
                                              <input
                                                type="number"
                                                value={Math.floor((set.timeSeconds || 0) / 60) || ''}
                                                onChange={(e) => {
                                                  const m = parseInt(e.target.value) || 0;
                                                  const s = (set.timeSeconds || 0) % 60;
                                                  if (activeSetTimer && activeSetTimer.exIdx === exIdx && activeSetTimer.setIdx === setIdx) {
                                                    setActiveSetTimer(null);
                                                  }
                                                  updateSet(exIdx, setIdx, 'timeSeconds', m * 60 + s);
                                                }}
                                                placeholder={prevSet?.timeSeconds ? `${Math.floor(prevSet.timeSeconds / 60)}` : (targetSet?.timeSeconds ? `${Math.floor(targetSet.timeSeconds / 60)}` : 'm')}
                                                className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                                              />
                                              <span className="text-white/30 self-center">:</span>
                                              <input
                                                type="number"
                                                value={(set.timeSeconds || 0) % 60 || ''}
                                                onChange={(e) => {
                                                  const s = parseInt(e.target.value) || 0;
                                                  const m = Math.floor((set.timeSeconds || 0) / 60);
                                                  if (activeSetTimer && activeSetTimer.exIdx === exIdx && activeSetTimer.setIdx === setIdx) {
                                                    setActiveSetTimer(null);
                                                  }
                                                  updateSet(exIdx, setIdx, 'timeSeconds', m * 60 + s);
                                                }}
                                                placeholder={prevSet?.timeSeconds ? `${prevSet.timeSeconds % 60}` : (targetSet?.timeSeconds ? `${targetSet.timeSeconds % 60}` : 's')}
                                                className={`w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors ${activeSetTimer && activeSetTimer.exIdx === exIdx && activeSetTimer.setIdx === setIdx ? 'text-accent animate-pulse font-bold' : ''}`}
                                              />
                                            </div>
                                          ) : (
                                            <input
                                              type="number"
                                              value={set.reps || ''}
                                              onChange={(e) => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value))}
                                              placeholder={prevSet?.reps ? `${prevSet.reps}` : (getTargetRepsLabel(targetSet) || '0')}
                                              className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                                            />
                                          )}
                                        </div>
                                      </div>

                                      {/* Subsets container with beautiful left vertical connection line */}
                                      {set.subSets && set.subSets.length > 0 && (
                                        <div className="border-l border-dashed border-accent/20 pl-4 ml-3 space-y-2 mt-2">
                                          {set.subSets.map((sub, subIdx) => {
                                            const isSubCompleted = sub.completed;
                                            const rawSubWeight = sub.weight || 0;
                                            const subWeightDisplayVal: number | string = isPerSide
                                              ? (!exercise.type || exercise.type === 'barbell')
                                                ? (rawSubWeight > barbell ? (rawSubWeight - barbell) / 2 : '')
                                                : (rawSubWeight > 0 ? rawSubWeight / 2 : '')
                                              : (rawSubWeight || '');
                                            const prevSubRaw = prevSet?.subSets?.[subIdx]?.weight || rawWeight || prevRaw || 0;
                                            const subWeightPlaceholder = isPerSide && prevSubRaw
                                              ? String((!exercise.type || exercise.type === 'barbell') ? (prevSubRaw > barbell ? (prevSubRaw - barbell) / 2 : 0) : prevSubRaw / 2)
                                              : (prevSubRaw ? String(prevSubRaw) : '0');

                                            return (
                                              <div key={subIdx} className="flex flex-col space-y-1 transition-opacity duration-300">
                                                <div className="flex w-full text-[7px] mono-label text-white/40 uppercase items-center pl-1">
                                                  <div className="w-1/2 flex items-center space-x-1">
                                                    {set.setMode === 'dropSet' ? (
                                                      <span className="text-[6px] font-black px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-400 border border-purple-800/40 uppercase tracking-wider">
                                                        Drop
                                                      </span>
                                                    ) : (
                                                      <span className="text-[6px] font-black px-1.5 py-0.5 rounded bg-orange-950/40 text-orange-400 border border-orange-800/40 uppercase tracking-wider">
                                                        Rest-Pause
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="w-8 text-center mx-1">UNT</div>
                                                  <div className="w-1/2">REPS</div>
                                                </div>
                                                <div className={`flex w-full space-x-1 items-start p-1 rounded-xl transition-all duration-300 ${isSubCompleted ? 'border border-accent/15 bg-accent/[0.015]' : 'border border-transparent'}`}>
                                                  {/* Weight Input */}
                                                  <div className="w-1/2">
                                                    <input
                                                      type="number"
                                                      value={subWeightDisplayVal}
                                                      onChange={(e) => {
                                                        const n = parseFloat(e.target.value) || 0;
                                                        if (isPerSide) {
                                                          const total = (!exercise.type || exercise.type === 'barbell') ? (n * 2) + barbell : n * 2;
                                                          updateSubSet(exIdx, setIdx, subIdx, 'weight', total);
                                                        } else {
                                                          updateSubSet(exIdx, setIdx, subIdx, 'weight', n);
                                                        }
                                                      }}
                                                      placeholder={subWeightPlaceholder}
                                                      className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                                                    />
                                                  </div>
                                                  {/* Unit Label */}
                                                  <div className="w-8 flex items-center justify-center text-[8px] font-mono text-white/30 uppercase h-[38px]">
                                                    {set.unit || 'kg'}
                                                  </div>
                                                  {/* Reps Input */}
                                                  <div className="w-1/2">
                                                    <input
                                                      type="number"
                                                      value={sub.reps || ''}
                                                      onChange={(e) => updateSubSet(exIdx, setIdx, subIdx, 'reps', parseInt(e.target.value))}
                                                      placeholder={prevSet?.subSets?.[subIdx]?.reps ? `${prevSet.subSets[subIdx].reps}` : '0'}
                                                      className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                                                    />
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>

                      {/* Footer Actions */}
                      <div className="p-4 border-t border-white/5 space-y-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => { group.items.forEach((i: any) => addSet(i.exIdx)); }}
                            className="flex-1 py-3 rounded-xl border-2 border-dashed border-accent text-accent hover:text-accent hover:bg-accent/10 transition-all flex items-center justify-center space-x-2 text-[10px] mono-label font-black tracking-widest bg-transparent"
                          >
                            <Plus size={14} className="stroke-[3]" />
                            <span>AGGIUNGI SET {group.isSuperset ? 'A TUTTI' : ''}</span>
                          </button>
                          <button
                            onClick={() => { group.items.forEach((i: any) => removeSet(i.exIdx, exerciseSessions[i.exIdx].sets.length - 1)); }}
                            className="px-4 py-3 rounded-xl border border-dashed border-accent text-accent hover:bg-accent/10 transition-all flex items-center justify-center"
                          >
                            <Minus size={14} />
                          </button>
                        </div>

                        <div className="space-y-2">
                          {group.items.map((item: any, i: number) => (
                            <div key={i}>
                              {group.isSuperset && <div className="text-[10px] text-white/40 mb-1 font-bold">{item.exercise.name}</div>}
                              <textarea
                                value={exerciseSessions[item.exIdx]?.notes || ''}
                                onChange={(e) => updateExerciseNotes(item.exIdx, e.target.value)}
                                placeholder={group.isSuperset ? "Note..." : "Aggiungi una nota personale..."}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none h-16"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          groupedExercises.map((group, groupIdx) => {
            const maxSets = Math.max(...group.items.map((item: any) => exerciseSessions[item.exIdx]?.sets.length || 0));

            return (
              <motion.div
                key={groupIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="hardware-card overflow-hidden bg-white/[0.02] border-white/10 flex flex-col relative"
              >
                {group.isSuperset && (
                  <div className="absolute top-0 right-4 bg-accent text-[#0c0d0e] font-black text-[9px] px-2 py-1 rounded-b-lg tracking-widest uppercase shadow-[0_0_15px_rgba(220,252,4,0.3)] z-[5]">
                    Superserie
                  </div>
                )}
                {/* Header: All exercises in group */}
                <div className="flex flex-col border-b border-white/5 bg-white/5">
                  {group.items.map((item: any, i: number) => {
                    const exercise = item.exercise;
                    const exIdx = item.exIdx;
                    return (
                      <div key={i} className={`p-4 ${i > 0 ? 'border-t border-white/5' : ''}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col flex-1">
                            <div className="flex items-center space-x-3">
                              {exercise.imageUrl && (
                                <img src={exercise.imageUrl} alt={exercise.name} className="w-10 h-10 object-cover rounded bg-white/5 border border-white/10" />
                              )}
                              <h3 className="font-bold text-lg leading-tight">{exercise.name}</h3>
                            </div>
                            <div
                              className="relative mt-1 cursor-pointer group"
                              onClick={() => {
                                setEditingPlanExId(exercise.id);
                                setEditingPlanExNotes(exercise.notes || '');
                              }}
                            >
                              <p className="text-[10px] text-white/40 italic leading-relaxed pr-6">
                                {exercise.notes || 'Aggiungi note scheda...'}
                              </p>
                              <div className="absolute right-0 top-0 p-1 text-accent/40 group-hover:text-accent transition-colors">
                                <Edit2 size={10} />
                              </div>
                            </div>
                            {previousSession && (
                              (() => {
                                const prevEx = previousSession.exercises.find(e => e.exerciseId === exercise.id);
                                if (prevEx?.notes) {
                                  return (
                                    <div className="flex items-start space-x-1 mt-1 opacity-60">
                                      <HistoryIcon size={8} className="mt-1 text-accent" />
                                      <p className="text-[9px] text-accent/80 italic leading-tight">Precedente: {prevEx.notes}</p>
                                    </div>
                                  );
                                }
                                return null;
                              })()
                            )}
                            {(!exercise.type || exercise.type === 'barbell') && (
                              <div className="flex items-center space-x-1 mt-2">
                                <Dumbbell size={10} className="text-accent" />
                                <span className="text-[10px] text-white/30 uppercase mono-label">Bilanciere: </span>
                                <input
                                  type="number"
                                  value={exerciseSessions[exIdx]?.barbellWeightUsed || ''}
                                  onChange={(e) => updateBarbell(exIdx, parseFloat(e.target.value) || 0)}
                                  className="w-10 bg-white/5 text-[10px] font-bold text-center rounded text-accent focus:outline-none focus:ring-1 focus:ring-accent py-0.5"
                                />
                                <span className="text-[10px] text-white/30 uppercase mono-label">{unit}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Body: Sets interleaved */}
                <div className="p-4 space-y-4">
                  <AnimatePresence>
                    {Array.from({ length: maxSets }).map((_, setIdx) => {
                      const isSetCompleted = group.items.every((item: any) => exerciseSessions[item.exIdx]?.sets[setIdx]?.completed);

                      return (
                        <motion.div
                          key={setIdx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={`flex flex-col space-y-3 transition-opacity duration-300 ${group.isSuperset && setIdx < maxSets - 1 ? 'border-b border-white/5 pb-4' : ''}`}
                        >
                          {group.items.map((item: any, i: number) => {
                            const exercise = item.exercise;
                            const exIdx = item.exIdx;
                            const session = exerciseSessions[exIdx];
                            const set = session?.sets[setIdx];
                            const prevSet = getPreviousSetData(exercise.id, setIdx);
                            const targetSet = (exercise.targetSets || [])[setIdx];

                            if (!set) return null;

                            const isActive = workoutSetSequence[activeStepIndex]?.exIdx === exIdx && workoutSetSequence[activeStepIndex]?.setIdx === setIdx;

                            const barbell = session?.barbellWeightUsed || 0;
                            const platesPerSide = set.weight && set.weight > barbell ? (set.weight - barbell) / 2 : 0;

                            // Per-side weight mode
                            const isPerSide = exercise.type === 'barbell' || !exercise.type
                              ? barbellMode === 'perSide'
                              : exercise.type === 'dumbbell'
                                ? dumbbellMode === 'perSide'
                                : exercise.type === 'plateLoaded'
                                  ? plateLoadedMode === 'perSide'
                                  : false;
                            const rawWeight = set.weight || 0;
                            const weightDisplayVal: number | string = isPerSide
                              ? (!exercise.type || exercise.type === 'barbell')
                                ? (rawWeight > barbell ? (rawWeight - barbell) / 2 : '')
                                : (rawWeight > 0 ? rawWeight / 2 : '')
                              : (rawWeight || '');
                            const prevRaw = getPreviousSetData(exercise.id, setIdx)?.weight || (exercise.targetSets || [])[setIdx]?.weight || 0;
                            const weightPlaceholder = isPerSide && prevRaw
                              ? String((!exercise.type || exercise.type === 'barbell') ? (prevRaw > barbell ? (prevRaw - barbell) / 2 : 0) : prevRaw / 2)
                              : (prevRaw ? String(prevRaw) : '0');
                            const handleWeightChange = (v: string) => {
                              const n = parseFloat(v) || 0;
                              if (isPerSide) {
                                const total = (!exercise.type || exercise.type === 'barbell') ? (n * 2) + barbell : n * 2;
                                updateSet(exIdx, setIdx, 'weight', total);
                              } else {
                                updateSet(exIdx, setIdx, 'weight', n);
                              }
                            };

                            return (
                              <div key={i} className="flex flex-col space-y-1 relative">
                                {group.isSuperset && (
                                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-full bg-accent/20 rounded-full" />
                                )}
                                <div className="flex w-full space-x-1 text-[7px] mono-label text-white/40 uppercase items-center">
                                  <div className="w-8 flex-shrink-0" />
                                  {exercise.type === 'cardio' ? (
                                    <><div className="flex-1 text-center">DIST</div><div className="w-14 flex-shrink-0" /><div className="flex-1 text-center">TEMPO</div></>
                                  ) : exercise.type === 'time' ? (
                                    <><div className="flex-1 text-center">PESO</div><div className="w-14 flex-shrink-0" /><div className="flex-1 text-center">TEMPO</div></>
                                  ) : (
                                    <>
                                      <div className="flex-1 text-center flex items-center justify-center gap-1">
                                        <span>{isPerSide ? 'P.LATO' : 'PESO'}</span>
                                        {!isPerSide && platesPerSide > 0 && (!exercise.type || exercise.type === 'barbell' || exercise.type === 'plateLoaded') && (
                                          <span className="text-[7px] font-mono text-accent/50 normal-case">
                                            ({exercise.type === 'plateLoaded' ? (rawWeight / 2).toFixed(1) : platesPerSide.toFixed(1)}/lato)
                                          </span>
                                        )}
                                      </div>
                                      <div className="w-14 flex-shrink-0" />
                                      <div className="flex-1 text-center">REPS</div>
                                    </>
                                  )}
                                </div>
                                <div
                                  id={`set-row-${exIdx}-${setIdx}`}
                                  onClick={() => {
                                    const idx = workoutSetSequence.findIndex(s => s.exIdx === exIdx && s.setIdx === setIdx);
                                    if (idx !== -1) setActiveStepIndex(idx);
                                  }}
                                  className={`flex w-full space-x-1 items-center p-1 rounded-xl transition-all duration-300 cursor-pointer ${
                                    isActive
                                      ? 'border border-accent/40 bg-accent/[0.06] ring-1 ring-accent/25 shadow-[0_0_12px_rgba(220,252,4,0.1)]'
                                      : set.completed
                                        ? 'border border-accent/20 bg-accent/[0.02]'
                                        : 'border border-transparent hover:border-white/5 hover:bg-white/[0.01]'
                                  }`}
                                >

                                  {/* Unit Button */}
                                  <button
                                    type="button"
                                    onClick={() => updateSet(exIdx, setIdx, 'unit', (exercise.type === 'cardio' ? (set.unit === 'km' ? 'm' : 'km') : (set.unit === 'kg' ? 'lb' : 'kg')) as any)}
                                    className={`w-8 h-[38px] flex items-center justify-center text-[9px] font-black rounded-lg uppercase border transition-all active:scale-95 flex-shrink-0 ${(exercise.type === 'cardio' ? set.unit !== 'm' : set.unit !== 'lb')
                                       ? 'bg-accent text-[#0c0d0e] border-accent shadow-[0_0_3px_var(--accent)]'
                                       : 'bg-[var(--accent-complementary)] text-[#0c0d0e] border-[var(--accent-complementary)] shadow-[0_0_3px_var(--accent-complementary)]'
                                       }`}
                                  >
                                    {exercise.type === 'cardio' ? (set.unit === 'km' || set.unit === 'm' ? set.unit : 'km') : (set.unit === 'kg' || set.unit === 'lb' ? set.unit : 'kg')}
                                  </button>

                                  {/* Left Input (Weight / Distance) */}
                                  <div className="flex-1">
                                    <div className="flex flex-col space-y-1">
                                      {exercise.type === 'cardio' ? (
                                        <input
                                          type="number"
                                          value={set.distance || ''}
                                          onChange={(e) => updateSet(exIdx, setIdx, 'distance', parseFloat(e.target.value))}
                                          placeholder={prevSet?.distance ? `${prevSet.distance}` : (targetSet?.distance ? `${targetSet.distance}` : '0')}
                                          className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                                        />
                                      ) : (
                                        <>
                                          <input
                                            type="number"
                                            value={weightDisplayVal}
                                            onChange={(e) => handleWeightChange(e.target.value)}
                                            placeholder={weightPlaceholder}
                                            className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                                          />
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Target Reps Badge / Spacer */}
                                  <div className="w-14 flex-shrink-0 flex items-center justify-center h-[38px]">
                                    {(() => {
                                      const targetRepsLabel = getTargetLabel(targetSet, exercise.type);
                                      return targetRepsLabel ? (
                                        <span className="w-full h-full flex items-center justify-center text-[11px] font-mono font-black bg-accent text-[#0c0d0e] border border-accent rounded-lg shadow-[0_0_3px_var(--accent)] text-center uppercase" title="Target Reps">
                                          {targetRepsLabel}
                                        </span>
                                      ) : (
                                        <div className="w-full" />
                                      );
                                    })()}
                                  </div>

                                  {/* Right Input (Reps / Time) */}
                                  <div className="flex-1">
                                    {exercise.type === 'cardio' ? (
                                      <div className="flex w-full space-x-1">
                                        <input
                                          type="number"
                                          value={Math.floor((set.timeSeconds || 0) / 3600) || ''}
                                          onChange={(e) => {
                                            const h = parseInt(e.target.value) || 0;
                                            const m = Math.floor(((set.timeSeconds || 0) % 3600) / 60);
                                            const s = (set.timeSeconds || 0) % 60;
                                            updateSet(exIdx, setIdx, 'timeSeconds', h * 3600 + m * 60 + s);
                                          }}
                                          placeholder={prevSet?.timeSeconds ? `${Math.floor(prevSet.timeSeconds / 3600)}` : (targetSet?.timeSeconds ? `${Math.floor(targetSet.timeSeconds / 3600)}` : 'h')}
                                          className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                                        />
                                        <span className="text-white/30 self-center">:</span>
                                        <input
                                          type="number"
                                          value={Math.floor(((set.timeSeconds || 0) % 3600) / 60) || ''}
                                          onChange={(e) => {
                                            const m = parseInt(e.target.value) || 0;
                                            const h = Math.floor((set.timeSeconds || 0) / 3600);
                                            const s = (set.timeSeconds || 0) % 60;
                                            updateSet(exIdx, setIdx, 'timeSeconds', h * 3600 + m * 60 + s);
                                          }}
                                          placeholder={prevSet?.timeSeconds ? `${Math.floor((prevSet.timeSeconds % 3600) / 60)}` : (targetSet?.timeSeconds ? `${Math.floor((targetSet.timeSeconds % 3600) / 60)}` : 'm')}
                                          className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                                        />
                                        <span className="text-white/30 self-center">:</span>
                                        <input
                                          type="number"
                                          value={(set.timeSeconds || 0) % 60 || ''}
                                          onChange={(e) => {
                                            const s = parseInt(e.target.value) || 0;
                                            const h = Math.floor((set.timeSeconds || 0) / 3600);
                                            const m = Math.floor(((set.timeSeconds || 0) % 3600) / 60);
                                            updateSet(exIdx, setIdx, 'timeSeconds', h * 3600 + m * 60 + s);
                                          }}
                                          placeholder={prevSet?.timeSeconds ? `${prevSet.timeSeconds % 60}` : (targetSet?.timeSeconds ? `${targetSet.timeSeconds % 60}` : 's')}
                                          className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                                        />
                                      </div>
                                    ) : exercise.type === 'time' ? (
                                      <div className="flex w-full space-x-1">
                                        <input
                                          type="number"
                                          value={Math.floor((set.timeSeconds || 0) / 60) || ''}
                                          onChange={(e) => {
                                            const m = parseInt(e.target.value) || 0;
                                            const s = (set.timeSeconds || 0) % 60;
                                            if (activeSetTimer && activeSetTimer.exIdx === exIdx && activeSetTimer.setIdx === setIdx) {
                                              setActiveSetTimer(null);
                                            }
                                            updateSet(exIdx, setIdx, 'timeSeconds', m * 60 + s);
                                          }}
                                          placeholder={prevSet?.timeSeconds ? `${Math.floor(prevSet.timeSeconds / 60)}` : (targetSet?.timeSeconds ? `${Math.floor(targetSet.timeSeconds / 60)}` : 'm')}
                                          className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                                        />
                                        <span className="text-white/30 self-center">:</span>
                                        <input
                                          type="number"
                                          value={(set.timeSeconds || 0) % 60 || ''}
                                          onChange={(e) => {
                                            const s = parseInt(e.target.value) || 0;
                                            const m = Math.floor((set.timeSeconds || 0) / 60);
                                            if (activeSetTimer && activeSetTimer.exIdx === exIdx && activeSetTimer.setIdx === setIdx) {
                                              setActiveSetTimer(null);
                                            }
                                            updateSet(exIdx, setIdx, 'timeSeconds', m * 60 + s);
                                          }}
                                          placeholder={prevSet?.timeSeconds ? `${prevSet.timeSeconds % 60}` : (targetSet?.timeSeconds ? `${targetSet.timeSeconds % 60}` : 's')}
                                          className={`w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors ${activeSetTimer && activeSetTimer.exIdx === exIdx && activeSetTimer.setIdx === setIdx ? 'text-accent animate-pulse font-bold' : ''}`}
                                        />
                                      </div>
                                    ) : (
                                      <input
                                        type="number"
                                        value={set.reps || ''}
                                        onChange={(e) => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value))}
                                        placeholder={prevSet?.reps ? `${prevSet.reps}` : (getTargetRepsLabel(targetSet) || '0')}
                                        className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                                      />
                                    )}
                                  </div>
                                </div>

                                {/* Subsets container with beautiful left vertical connection line */}
                                {set.subSets && set.subSets.length > 0 && (
                                  <div className="border-l border-dashed border-accent/20 pl-4 ml-3 space-y-2 mt-2">
                                    {set.subSets.map((sub, subIdx) => {
                                      const isSubCompleted = sub.completed;
                                      const rawSubWeight = sub.weight || 0;
                                      const subWeightDisplayVal: number | string = isPerSide
                                        ? (!exercise.type || exercise.type === 'barbell')
                                          ? (rawSubWeight > barbell ? (rawSubWeight - barbell) / 2 : '')
                                          : (rawSubWeight > 0 ? rawSubWeight / 2 : '')
                                        : (rawSubWeight || '');
                                      const prevSubRaw = prevSet?.subSets?.[subIdx]?.weight || rawWeight || prevRaw || 0;
                                      const subWeightPlaceholder = isPerSide && prevSubRaw
                                        ? String((!exercise.type || exercise.type === 'barbell') ? (prevSubRaw > barbell ? (prevSubRaw - barbell) / 2 : 0) : prevSubRaw / 2)
                                        : (prevSubRaw ? String(prevSubRaw) : '0');

                                      return (
                                        <div key={subIdx} className="flex flex-col space-y-1 transition-opacity duration-300">
                                          <div className="flex w-full text-[7px] mono-label text-white/40 uppercase items-center pl-1">
                                            <div className="w-1/2 flex items-center space-x-1">
                                              {set.setMode === 'dropSet' ? (
                                                <span className="text-[6px] font-black px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-400 border border-purple-800/40 uppercase tracking-wider">
                                                  Drop
                                                </span>
                                              ) : (
                                                <span className="text-[6px] font-black px-1.5 py-0.5 rounded bg-orange-950/40 text-orange-400 border border-orange-800/40 uppercase tracking-wider">
                                                  Rest-Pause
                                                </span>
                                              )}
                                            </div>
                                            <div className="w-8 text-center mx-1">UNT</div>
                                            <div className="w-1/2">REPS</div>
                                          </div>
                                          <div className={`flex w-full space-x-1 items-start p-1 rounded-xl transition-all duration-300 ${isSubCompleted ? 'border border-accent/15 bg-accent/[0.015]' : 'border border-transparent'}`}>
                                            {/* Weight Input */}
                                            <div className="w-1/2">
                                              <input
                                                type="number"
                                                value={subWeightDisplayVal}
                                                onChange={(e) => {
                                                  const n = parseFloat(e.target.value) || 0;
                                                  if (isPerSide) {
                                                    const total = (!exercise.type || exercise.type === 'barbell') ? (n * 2) + barbell : n * 2;
                                                    updateSubSet(exIdx, setIdx, subIdx, 'weight', total);
                                                  } else {
                                                    updateSubSet(exIdx, setIdx, subIdx, 'weight', n);
                                                  }
                                                }}
                                                placeholder={subWeightPlaceholder}
                                                className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                                              />
                                            </div>
                                            {/* Unit Label */}
                                            <div className="w-8 flex items-center justify-center text-[8px] font-mono text-white/30 uppercase h-[38px]">
                                              {set.unit || 'kg'}
                                            </div>
                                            {/* Reps Input */}
                                            <div className="w-1/2">
                                              <input
                                                type="number"
                                                value={sub.reps || ''}
                                                onChange={(e) => updateSubSet(exIdx, setIdx, subIdx, 'reps', parseInt(e.target.value))}
                                                placeholder={prevSet?.subSets?.[subIdx]?.reps ? `${prevSet.subSets[subIdx].reps}` : '0'}
                                                className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-white/5 space-y-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => { group.items.forEach((i: any) => addSet(i.exIdx)); }}
                      className="flex-1 py-3 rounded-xl border-2 border-dashed border-accent text-accent hover:text-accent hover:bg-accent/10 transition-all flex items-center justify-center space-x-2 text-[10px] mono-label font-black tracking-widest bg-transparent"
                    >
                      <Plus size={14} className="stroke-[3]" />
                      <span>AGGIUNGI SET {group.isSuperset ? 'A TUTTI' : ''}</span>
                    </button>
                    <button
                      onClick={() => { group.items.forEach((i: any) => removeSet(i.exIdx, exerciseSessions[i.exIdx].sets.length - 1)); }}
                      className="px-4 py-3 rounded-xl border border-dashed border-accent text-accent hover:bg-accent/10 transition-all flex items-center justify-center"
                    >
                      <Minus size={14} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {group.items.map((item: any, i: number) => (
                      <div key={i}>
                        {group.isSuperset && <div className="text-[10px] text-white/40 mb-1 font-bold">{item.exercise.name}</div>}
                        <textarea
                          value={exerciseSessions[item.exIdx]?.notes || ''}
                          onChange={(e) => updateExerciseNotes(item.exIdx, e.target.value)}
                          placeholder={group.isSuperset ? "Note..." : "Aggiungi una nota personale..."}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none h-16"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>



      {/* Set Progression Bar */}
      {(() => {
        const currentStep = workoutSetSequence[activeStepIndex];
        if (!currentStep) return null;

        const { exIdx, setIdx } = currentStep;
        const exercise = plan.exercises[exIdx];
        const session = exerciseSessions[exIdx];
        const set = session?.sets[setIdx];
        const targetSet = exercise?.targetSets?.[setIdx];
        const totalSetsForExercise = session?.sets.length || 0;

        const targetLabel = getTargetLabel(targetSet, exercise?.type);
        const isTimerRunning = activeSetTimer && activeSetTimer.exIdx === exIdx && activeSetTimer.setIdx === setIdx;
        const timeLeft = set?.timeSeconds || 0;
        const isTimeOrCardio = exercise?.type === 'time' || exercise?.type === 'cardio';

        const formatSetTime = (totalSeconds: number) => {
          const m = Math.floor(totalSeconds / 60);
          const s = totalSeconds % 60;
          return `${m}:${s.toString().padStart(2, '0')}`;
        };

        const timerInterface = (
          <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-xl border border-white/5">
            <div className={`px-2.5 py-1 font-mono text-base font-black tracking-wider min-w-[55px] text-center ${isTimerRunning ? 'text-accent animate-pulse' : 'text-white'}`}>
              {formatSetTime(timeLeft)}
            </div>
            <button
              type="button"
              onClick={() => handleToggleSetTimer(exIdx, setIdx)}
              className={`p-1.5 rounded-lg transition-all active:scale-95 ${isTimerRunning ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20'}`}
            >
              {isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              type="button"
              disabled={timeLeft === 0}
              onClick={() => handleResetSetTimer(exIdx, setIdx)}
              className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white/80 hover:bg-white/10 disabled:opacity-30 transition-all active:scale-95 border border-white/5"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        );

        return (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0c0d0e]/90 backdrop-blur-xl border-t border-white/10 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
            <div className="max-w-lg mx-auto flex flex-col space-y-3">
              {/* Header Row: Info and target */}
              <div className="flex justify-between items-center text-xs px-1 gap-2">
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] mono-label text-accent font-black uppercase tracking-wider leading-none mb-1">
                    Serie {setIdx + 1} di {totalSetsForExercise}
                  </span>
                  <span className="font-bold text-white truncate text-xs leading-none">
                    {exercise?.name}
                  </span>
                </div>
                {targetLabel && (
                  <div className="bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-[9px] mono-label font-bold text-white/60 flex-shrink-0">
                    Target: {targetLabel}
                  </div>
                )}
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between gap-4">
                <button
                  disabled={activeStepIndex === 0}
                  onClick={() => setActiveStepIndex(prev => prev - 1)}
                  className="flex-shrink-0 flex items-center justify-center p-2 rounded-lg bg-white/5 text-accent disabled:opacity-20 border border-white/5 active:scale-90 transition-transform"
                  title="Serie precedente"
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="flex-1 flex justify-center min-w-0">
                  {isTimeOrCardio ? (
                    <div className="flex items-center space-x-2 w-full justify-center">
                      {timerInterface}
                      <button
                        onClick={handleCompleteActiveStep}
                        className={`py-2 px-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all active:scale-95 border ${
                          set?.completed
                            ? 'bg-transparent border-accent text-accent shadow-[0_0_10px_rgba(220,252,4,0.15)]'
                            : 'bg-accent text-[#0c0d0e] border-accent hover:opacity-95 shadow-[0_0_15px_rgba(220,252,4,0.2)]'
                        }`}
                      >
                        <Check size={12} className="stroke-[3]" />
                        <span>{set?.completed ? 'Fatto' : 'Completa'}</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleCompleteActiveStep}
                      className={`w-full max-w-[200px] py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 transition-all active:scale-95 border ${
                        set?.completed
                          ? 'bg-transparent border-accent text-accent shadow-[0_0_10px_rgba(220,252,4,0.15)]'
                          : 'bg-accent text-[#0c0d0e] border-accent hover:opacity-95 shadow-[0_0_20px_rgba(220,252,4,0.2)]'
                      }`}
                    >
                      <Check size={14} className="stroke-[3]" />
                      <span>{set?.completed ? 'Serie Completata' : 'Completa Serie'}</span>
                    </button>
                  )}
                </div>

                <button
                  disabled={activeStepIndex === workoutSetSequence.length - 1}
                  onClick={() => setActiveStepIndex(prev => prev + 1)}
                  className="flex-shrink-0 flex items-center justify-center p-2 rounded-lg bg-white/5 text-accent disabled:opacity-20 border border-white/5 active:scale-90 transition-transform"
                  title="Serie successiva"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Focus Mode Page Indicator */}
              {focusMode && (
                <div className="flex justify-center items-center text-[8px] mono-label text-white/30 uppercase tracking-widest pt-1 border-t border-white/5">
                  <span>Esercizio {currentFocusIndex + 1} di {groupedExercises.length}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}
      {editingPlanExId && (
        <Modal
          isOpen={!!editingPlanExId}
          onClose={() => setEditingPlanExId(null)}
          title="Note Permanenti"
        >
          <div className="space-y-4">
            <p className="text-xs text-white/50 leading-relaxed">
              Queste note verranno salvate direttamente nella scheda e saranno visibili in ogni futuro allenamento.
            </p>
            <textarea
              value={editingPlanExNotes}
              onChange={(e) => setEditingPlanExNotes(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/80 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none h-32 font-sans"
              placeholder="Inserisci note permanenti (es. impostazioni macchina, focus...)"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => setEditingPlanExId(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 transition-all text-[10px] mono-label font-black uppercase tracking-widest"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  onUpdatePlanExerciseNotes(editingPlanExId, editingPlanExNotes);
                  setEditingPlanExId(null);
                }}
                className="flex-1 py-3 rounded-xl bg-accent !text-black font-black hover:opacity-90 transition-all text-[10px] mono-label uppercase tracking-widest"
              >
                Salva Note
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
