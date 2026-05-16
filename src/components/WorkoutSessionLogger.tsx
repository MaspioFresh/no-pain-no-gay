import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ExerciseSession, SetEntry, WorkoutPlan, WorkoutSession, WeightUnit } from '../types';
import { Plus, Minus, Check, Save, X, History as HistoryIcon, Dumbbell, ArrowLeft, Timer, RotateCcw, MoveRight, ScanLine, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { motion, AnimatePresence, useAnimation, useMotionValue, animate } from 'motion/react';
import { Stopwatch } from './Stopwatch';
import { Modal } from './Modal';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export function RestTimer({
  initialSeconds,
  onReset,
  isMinimized,
  onToggleMinimize
}: {
  initialSeconds: number;
  onReset: () => void;
  isMinimized: boolean;
  onToggleMinimize: (minimized: boolean) => void;
}) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds * 1000);
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

  // Pulizia audio se il componente viene smontato
  React.useEffect(() => {
    return () => stopAudio();
  }, []);

  React.useEffect(() => {
    if (timeLeft <= 0) {
      setIsFinished(true);
      if (!soundPlayedRef.current) {
        soundPlayedRef.current = true;
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
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 100));
    }, 100);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs.toString().padStart(2, '0')}`;
  };

  const adjustTime = (delta: number) => {
    setTimeLeft(prev => {
      const newVal = Math.max(0, prev + delta * 1000);
      if (newVal > 0) {
        setIsFinished(false);
        soundPlayedRef.current = false;
        stopAudio(); // Interrompe il suono se si aggiunge tempo
      }
      return newVal;
    });
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
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [isRestTimerMinimized, setIsRestTimerMinimized] = useState(false);
  const [currentRestSeconds, setCurrentRestSeconds] = useState(60);
  const [focusMode, setFocusMode] = useState(defaultFocusMode);
  const [currentFocusIndex, setCurrentFocusIndex] = useState(0);
  const [editingPlanExId, setEditingPlanExId] = useState<string | null>(null);
  const [editingPlanExNotes, setEditingPlanExNotes] = useState('');
  const initializedFocusIdx = useRef(false);

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
      reps: lastSet?.reps || 0,
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
      newSessions[exerciseIndex].sets.push({ reps: 0, weight: 0, unit: unit, completed: false });
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

  // Set initial focus index to first incomplete group once
  useEffect(() => {
    if (focusMode && !initializedFocusIdx.current) {
      const firstIncompleteIdx = groupedExercises.findIndex(group => {
        return group.items.some(item => {
          const session = exerciseSessions[item.exIdx];
          return !session || session.sets.some(s => !s.completed);
        });
      });
      if (firstIncompleteIdx !== -1) {
        setCurrentFocusIndex(firstIncompleteIdx);
      }
      initializedFocusIdx.current = true;
    }
  }, [focusMode, groupedExercises, exerciseSessions]);

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
      setCurrentRestSeconds(maxRest);
      setRestTimerActive(false);
      setIsRestTimerMinimized(false);
      setTimeout(() => setRestTimerActive(true), 10);
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
    onSave(session);
  };

  return (
    <div className={`flex flex-col space-y-6 pb-32 ${focusMode ? 'pb-48' : ''}`}>
      <div className="sticky top-0 bg-[#0c0d0e]/95 backdrop-blur-lg z-20 border-b border-white/10 px-1">
        {/* Row 1: title + buttons */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            <button onClick={onCancel} className="btn-icon-accent" title="Riduci a icona">
              <ArrowLeft size={20} />
            </button>
            <button 
              onClick={() => setFocusMode(!focusMode)} 
              className={`p-2 rounded-full border transition-all ${focusMode ? 'bg-accent border-accent text-[#0c0d0e]' : 'btn-icon text-white/40 hover:border-accent border-white/20'}`}
              title={focusMode ? "Disattiva Focus Mode" : "Attiva Focus Mode"}
            >
              <ScanLine size={20} />
            </button>
            <div>
              <h2 className="text-sm font-bold tracking-tight leading-none mb-1">{plan.name}</h2>
              <p className="text-[9px] mono-label accent-text uppercase tracking-widest leading-none">In corso • {unit}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onFinish}
              className="btn-icon-danger"
              title="Annulla Allenamento"
            >
              <X size={20} className="stroke-[3]" />
            </button>
            <button
              onClick={handleSave}
              className="btn-outline px-4 py-2 flex items-center space-x-2 text-sm"
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
      </div>

      <AnimatePresence>
        {restTimerActive && (
          <RestTimer
            initialSeconds={currentRestSeconds}
            onReset={() => setRestTimerActive(false)}
            isMinimized={isRestTimerMinimized}
            onToggleMinimize={setIsRestTimerMinimized}
          />
        )}
      </AnimatePresence>


      <div className="space-y-6">
        {focusMode ? (
          <div className="flex flex-col space-y-4">
            {/* Progress Bar */}
            <div className="px-2">
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-accent shadow-[0_0_10px_rgba(220,252,4,0.5)]"
                  animate={{ width: `${((currentFocusIndex + 1) / groupedExercises.length) * 100}%` }}
                />
              </div>
            </div>

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
                                className={`flex items-stretch space-x-2 transition-opacity duration-300 ${isSetCompleted ? 'opacity-30' : ''} ${group.isSuperset && setIdx < maxSets - 1 ? 'border-b border-white/5 pb-4' : ''}`}
                              >
                                <div className="w-8 flex-shrink-0 flex items-start justify-center mt-3">
                                  <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center font-mono text-[10px] text-white/40">
                                    {setIdx + 1}
                                  </div>
                                </div>

                                <div className="flex-1 flex flex-col space-y-3">
                                  {group.items.map((item: any, i: number) => {
                                    const exercise = item.exercise;
                                    const exIdx = item.exIdx;
                                    const session = exerciseSessions[exIdx];
                                    const set = session?.sets[setIdx];
                                    const prevSet = getPreviousSetData(exercise.id, setIdx);
                                    const targetSet = (exercise.targetSets || [])[setIdx];

                                    if (!set) return null;

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
                                    const prevRaw = (exercise.targetSets || [])[setIdx]?.weight || getPreviousSetData(exercise.id, setIdx)?.weight || 0;
                                    const weightPlaceholder = isPerSide && prevRaw
                                      ? String((!exercise.type || exercise.type === 'barbell') ? (prevRaw > barbell ? (prevRaw - barbell) / 2 : 0) : prevRaw / 2)
                                      : (prevRaw ? String(prevRaw) : '0');

                                    return (
                                      <div key={i} className="flex flex-col space-y-1 relative">
                                        {group.isSuperset && (
                                          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-full bg-accent/20 rounded-full" />
                                        )}
                                        <div className="flex w-full text-[7px] mono-label text-white/40 uppercase items-center pl-1">
                                          {exercise.type === 'cardio' ? (
                                            <><div className="w-20">DIST</div><div className="w-8 text-center mx-1">UNT</div><div className="flex-1 text-center">TEMPO</div></>
                                          ) : exercise.type === 'time' ? (
                                            <><div className="w-20">PESO</div><div className="w-8 text-center mx-1">UNT</div><div className="flex-1 text-center">TEMPO</div></>
                                          ) : (
                                            <><div className="w-1/2">{isPerSide ? 'P.LATO' : 'PESO'}</div><div className="w-8 text-center mx-1">UNT</div><div className="w-1/2 text-center">REPS</div></>
                                          )}
                                        </div>
                                        <div className="flex w-full space-x-1 items-start">
                                          <div className={exercise.type === 'cardio' || exercise.type === 'time' ? 'w-20' : 'w-1/2'}>
                                            <div className="flex flex-col space-y-1">
                                              {exercise.type === 'cardio' ? (
                                                <input
                                                  type="number"
                                                  value={set.distance || ''}
                                                  onChange={(e) => updateSet(exIdx, setIdx, 'distance', parseFloat(e.target.value))}
                                                  placeholder={targetSet?.distance ? `${targetSet.distance}` : (prevSet?.distance ? `${prevSet.distance}` : '0')}
                                                  className="input-number-small"
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
                                                    className="input-number-small"
                                                  />
                                                  {!isPerSide && platesPerSide > 0 && (!exercise.type || exercise.type === 'barbell' || exercise.type === 'plateLoaded') && (
                                                    <span className="text-[7px] font-mono text-accent/40 text-center uppercase tracking-tighter">
                                                      {exercise.type === 'plateLoaded' ? (rawWeight / 2).toFixed(1) : platesPerSide.toFixed(1)}/lato
                                                    </span>
                                                  )}
                                                </>
                                              )}
                                            </div>
                                          </div>

                                          <div className="w-8 flex items-center justify-center pt-1">
                                            <button
                                              onClick={() => updateSet(exIdx, setIdx, 'unit', (exercise.type === 'cardio' ? (set.unit === 'km' ? 'm' : 'km') : (set.unit === 'kg' ? 'lb' : 'kg')) as any)}
                                              className={`text-[8px] font-black p-1 rounded min-w-[24px] uppercase border transition-all bg-transparent ${(exercise.type === 'cardio' ? set.unit === 'km' : set.unit === 'kg')
                                                ? 'border-blue-500 text-blue-400'
                                                : 'border-accent text-accent'
                                                }`}
                                            >
                                              {exercise.type === 'cardio' ? (set.unit === 'km' || set.unit === 'm' ? set.unit : 'km') : (set.unit === 'kg' || set.unit === 'lb' ? set.unit : 'kg')}
                                            </button>
                                          </div>

                                          <div className={exercise.type === 'cardio' || exercise.type === 'time' ? 'flex-1' : 'w-1/2'}>
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
                                                  placeholder={targetSet?.timeSeconds ? `${Math.floor(targetSet.timeSeconds / 3600)}` : 'h'}
                                                  className="input-number-small"
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
                                                  placeholder={targetSet?.timeSeconds ? `${Math.floor((targetSet.timeSeconds % 3600) / 60)}` : 'm'}
                                                  className="input-number-small"
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
                                                  placeholder={targetSet?.timeSeconds ? `${targetSet.timeSeconds % 60}` : 's'}
                                                  className="input-number-small"
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
                                                    updateSet(exIdx, setIdx, 'timeSeconds', m * 60 + s);
                                                  }}
                                                  placeholder={targetSet?.timeSeconds ? `${Math.floor(targetSet.timeSeconds / 60)}` : 'm'}
                                                  className="input-number-small"
                                                />
                                                <span className="text-white/30 self-center">:</span>
                                                <input
                                                  type="number"
                                                  value={(set.timeSeconds || 0) % 60 || ''}
                                                  onChange={(e) => {
                                                    const s = parseInt(e.target.value) || 0;
                                                    const m = Math.floor((set.timeSeconds || 0) / 60);
                                                    updateSet(exIdx, setIdx, 'timeSeconds', m * 60 + s);
                                                  }}
                                                  placeholder={targetSet?.timeSeconds ? `${targetSet.timeSeconds % 60}` : 's'}
                                                  className="input-number-small"
                                                />
                                              </div>
                                            ) : (
                                              <input
                                                type="number"
                                                value={set.reps || ''}
                                                onChange={(e) => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value))}
                                                placeholder={targetSet?.reps ? `${targetSet.reps}` : (prevSet?.reps ? `${prevSet.reps}` : '0')}
                                                className="input-number-small"
                                              />
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="w-10 flex-shrink-0 flex items-stretch py-1">
                                  <button
                                    onClick={() => toggleSupersetComplete(group.items.map((i: any) => i.exIdx), setIdx)}
                                    className={`w-full flex flex-col items-center justify-center rounded-xl transition-all border ${isSetCompleted
                                      ? 'bg-transparent border-accent text-accent shadow-[0_0_15px_rgba(220,252,4,0.4)]'
                                      : 'bg-transparent border-white/20 text-white/20 hover:border-accent hover:text-accent'
                                      }`}
                                  >
                                    <Check size={18} className={isSetCompleted ? 'stroke-[3]' : ''} />
                                    {group.isSuperset && <span className="text-[7px] font-bold mt-1 leading-none uppercase tracking-widest">ALL</span>}
                                  </button>
                                </div>
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
                            className="flex-1 btn-secondary border-dashed border-2 py-3 text-[10px] mono-label tracking-widest"
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
                        className={`flex items-stretch space-x-2 transition-opacity duration-300 ${isSetCompleted ? 'opacity-30' : ''} ${group.isSuperset && setIdx < maxSets - 1 ? 'border-b border-white/5 pb-4' : ''}`}
                      >
                        <div className="w-8 flex-shrink-0 flex items-start justify-center mt-3">
                          <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center font-mono text-[10px] text-white/40">
                            {setIdx + 1}
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col space-y-3">
                          {group.items.map((item: any, i: number) => {
                            const exercise = item.exercise;
                            const exIdx = item.exIdx;
                            const session = exerciseSessions[exIdx];
                            const set = session?.sets[setIdx];
                            const prevSet = getPreviousSetData(exercise.id, setIdx);
                            const targetSet = (exercise.targetSets || [])[setIdx];

                            if (!set) return null;

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
                            const prevRaw = (exercise.targetSets || [])[setIdx]?.weight || getPreviousSetData(exercise.id, setIdx)?.weight || 0;
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
                                <div className="flex w-full text-[7px] mono-label text-white/40 uppercase items-center pl-1">
                                  {exercise.type === 'cardio' ? (
                                    <><div className="w-20">DIST</div><div className="w-8 text-center mx-1">UNT</div><div className="flex-1 text-center">TEMPO</div></>
                                  ) : exercise.type === 'time' ? (
                                    <><div className="w-20">PESO</div><div className="w-8 text-center mx-1">UNT</div><div className="flex-1 text-center">TEMPO</div></>
                                  ) : (
                                    <><div className="w-1/2">{isPerSide ? 'P.LATO' : 'PESO'}</div><div className="w-8 text-center mx-1">UNT</div><div className="w-1/2 text-center">REPS</div></>
                                  )}
                                </div>
                                <div className="flex w-full space-x-1 items-start">
                                  {/* Left Input */}
                                  <div className={exercise.type === 'cardio' || exercise.type === 'time' ? 'w-20' : 'w-1/2'}>
                                    <div className="flex flex-col space-y-1">
                                      {exercise.type === 'cardio' ? (
                                        <input
                                          type="number"
                                          value={set.distance || ''}
                                          onChange={(e) => updateSet(exIdx, setIdx, 'distance', parseFloat(e.target.value))}
                                          placeholder={targetSet?.distance ? `${targetSet.distance}` : (prevSet?.distance ? `${prevSet.distance}` : '0')}
                                          className="input-number-small"
                                        />
                                      ) : (
                                        <>
                                          <input
                                            type="number"
                                            value={weightDisplayVal}
                                            onChange={(e) => handleWeightChange(e.target.value)}
                                            placeholder={weightPlaceholder}
                                            className="input-number-small"
                                          />
                                          {!isPerSide && platesPerSide > 0 && (!exercise.type || exercise.type === 'barbell' || exercise.type === 'plateLoaded') && (
                                            <span className="text-[7px] font-mono text-accent/40 text-center uppercase tracking-tighter">
                                              {exercise.type === 'plateLoaded' ? (rawWeight / 2).toFixed(1) : platesPerSide.toFixed(1)}/lato
                                            </span>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Unit Button */}
                                  <div className="w-8 flex items-center justify-center pt-1">
                                    <button
                                      onClick={() => updateSet(exIdx, setIdx, 'unit', (exercise.type === 'cardio' ? (set.unit === 'km' ? 'm' : 'km') : (set.unit === 'kg' ? 'lb' : 'kg')) as any)}
                                      className={`text-[8px] font-black p-1 rounded min-w-[24px] uppercase border transition-all bg-transparent ${(exercise.type === 'cardio' ? set.unit === 'km' : set.unit === 'kg')
                                        ? 'border-blue-500 text-blue-400'
                                        : 'border-accent text-accent'
                                        }`}
                                    >
                                      {exercise.type === 'cardio' ? (set.unit === 'km' || set.unit === 'm' ? set.unit : 'km') : (set.unit === 'kg' || set.unit === 'lb' ? set.unit : 'kg')}
                                    </button>
                                  </div>

                                  {/* Right Input(s) */}
                                  <div className={exercise.type === 'cardio' || exercise.type === 'time' ? 'flex-1' : 'w-1/2'}>
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
                                          placeholder={targetSet?.timeSeconds ? `${Math.floor(targetSet.timeSeconds / 3600)}` : 'h'}
                                          className="input-number-small"
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
                                          placeholder={targetSet?.timeSeconds ? `${Math.floor((targetSet.timeSeconds % 3600) / 60)}` : 'm'}
                                          className="input-number-small"
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
                                          placeholder={targetSet?.timeSeconds ? `${targetSet.timeSeconds % 60}` : 's'}
                                          className="input-number-small"
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
                                            updateSet(exIdx, setIdx, 'timeSeconds', m * 60 + s);
                                          }}
                                          placeholder={targetSet?.timeSeconds ? `${Math.floor(targetSet.timeSeconds / 60)}` : 'm'}
                                          className="input-number-small"
                                        />
                                        <span className="text-white/30 self-center">:</span>
                                        <input
                                          type="number"
                                          value={(set.timeSeconds || 0) % 60 || ''}
                                          onChange={(e) => {
                                            const s = parseInt(e.target.value) || 0;
                                            const m = Math.floor((set.timeSeconds || 0) / 60);
                                            updateSet(exIdx, setIdx, 'timeSeconds', m * 60 + s);
                                          }}
                                          placeholder={targetSet?.timeSeconds ? `${targetSet.timeSeconds % 60}` : 's'}
                                          className="input-number-small"
                                        />
                                      </div>
                                    ) : (
                                      <input
                                        type="number"
                                        value={set.reps || ''}
                                        onChange={(e) => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value))}
                                        placeholder={targetSet?.reps ? `${targetSet.reps}` : (prevSet?.reps ? `${prevSet.reps}` : '0')}
                                        className="input-number-small"
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="w-10 flex-shrink-0 flex items-stretch py-1">
                          <button
                            onClick={() => toggleSupersetComplete(group.items.map((i: any) => i.exIdx), setIdx)}
                            className={`w-full flex flex-col items-center justify-center rounded-xl transition-all border ${isSetCompleted
                              ? 'bg-transparent border-accent text-accent shadow-[0_0_15px_rgba(220,252,4,0.4)]'
                              : 'bg-transparent border-white/20 text-white/20 hover:border-accent hover:text-accent'
                              }`}
                          >
                            <Check size={18} className={isSetCompleted ? 'stroke-[3]' : ''} />
                            {group.isSuperset && <span className="text-[7px] font-bold mt-1 leading-none uppercase tracking-widest">ALL</span>}
                          </button>
                        </div>
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
                    className="flex-1 btn-secondary border-dashed border-2 py-3 text-[10px] mono-label tracking-widest"
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



      {/* Focus Mode Fixed Bottom Controls */}
      {focusMode && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0c0d0e]/90 backdrop-blur-xl border-t border-white/10 z-30">
          <div className="max-w-lg mx-auto flex flex-col space-y-4">
            {/* Next Group Banner (Floating) */}
            <AnimatePresence>
              {isGroupFinished(groupedExercises[currentFocusIndex]) && currentFocusIndex < groupedExercises.length - 1 && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  onClick={() => setCurrentFocusIndex(prev => prev + 1)}
                  className="w-full py-4 bg-accent text-[#0c0d0e] rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center space-x-2 shadow-[0_0_30px_rgba(220,252,4,0.4)] active:scale-95 transition-all"
                >
                  <span>Prossimo Esercizio</span>
                  <ChevronRight size={18} className="stroke-[3]" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Main Navigation */}
            <div className="flex items-center justify-between">
              <button
                disabled={currentFocusIndex === 0}
                onClick={() => setCurrentFocusIndex(prev => prev - 1)}
                className="flex items-center space-x-2 p-2 rounded-lg bg-white/5 text-accent disabled:opacity-20 border border-white/5 active:scale-90 transition-transform"
              >
                <ChevronLeft size={24} />
                <span className="text-[10px] mono-label font-black uppercase hidden xs:inline">Indietro</span>
              </button>

              <div className="flex flex-col items-center">
                <span className="text-[10px] mono-label text-accent font-black uppercase tracking-widest">
                  Focus Mode
                </span>
                <span className="text-xs font-black text-white/60">
                  {currentFocusIndex + 1} / {groupedExercises.length}
                </span>
              </div>

              <button
                disabled={currentFocusIndex === groupedExercises.length - 1}
                onClick={() => setCurrentFocusIndex(prev => prev + 1)}
                className="flex items-center space-x-2 p-2 rounded-lg bg-white/5 text-accent disabled:opacity-20 border border-white/5 active:scale-90 transition-transform"
              >
                <span className="text-[10px] mono-label font-black uppercase hidden xs:inline">Avanti</span>
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        </div>
      )}
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
                className="flex-1 py-3 rounded-xl bg-accent text-black font-black hover:opacity-90 transition-all text-[10px] mono-label uppercase tracking-widest"
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


