import React, { useState } from 'react';
import { ExerciseSession, SetEntry, WorkoutPlan, WorkoutSession, WeightUnit } from '../types';
import { Plus, Minus, Check, Save, X, History as HistoryIcon, Dumbbell, ArrowLeft, Timer, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Stopwatch } from './Stopwatch';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

function RestTimer({ initialSeconds, onReset }: { initialSeconds: number; onReset: () => void }) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds * 1000);
  const [isFinished, setIsFinished] = useState(false);

  const soundPlayedRef = React.useRef(false);

  React.useEffect(() => {
    if (timeLeft <= 0) {
      setIsFinished(true);
      if (!soundPlayedRef.current) {
        soundPlayedRef.current = true;
        // Play alert sound
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          oscillator.start();
          setTimeout(() => oscillator.stop(), 5000);
          setTimeout(() => { audioCtx.close(); }, 6000);
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
      }
      return newVal;
    });
  };

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 p-6 flex flex-col items-center border-2 rounded-2xl transition-colors duration-500 bg-[#0c0d0e]/95 backdrop-blur-md ${
        isFinished ? 'text-red-500 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'text-accent border-accent shadow-[0_0_30px_rgba(220,252,4,0.15)]'
      }`}
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
          onClick={() => adjustTime(-30)}
          className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center font-black text-lg active:scale-90"
        >
          -30
        </button>
        <button 
          onClick={() => adjustTime(30)}
          className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center font-black text-lg active:scale-90"
        >
          +30
        </button>
      </div>

      <button 
        onClick={onReset}
        className={`w-full p-3 rounded-xl flex items-center justify-center space-x-2 active:scale-95 transition-all font-black uppercase tracking-widest text-xs border border-accent text-accent bg-transparent hover:bg-accent/10`}
      >
        <RotateCcw size={16} />
        <span>CHIUDI</span>
      </button>
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
  onCancel: () => void;
  onFinish: () => void;
}

export function WorkoutSessionLogger({ 
  plan, 
  previousSession, 
  unit, 
  exerciseSessions, 
  setExerciseSessions, 
  startTime,
  onSave, 
  onCancel, 
  onFinish 
}: WorkoutSessionLoggerProps) {
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [currentRestSeconds, setCurrentRestSeconds] = useState(60);

  const updateBarbell = (exerciseIndex: number, weight: number) => {
    const newSessions = [...exerciseSessions];
    newSessions[exerciseIndex].barbellWeightUsed = weight;
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

  const toggleComplete = (exerciseIndex: number, setIndex: number) => {
    const newSessions = [...exerciseSessions];
    const wasCompleted = newSessions[exerciseIndex].sets[setIndex].completed;
    newSessions[exerciseIndex].sets[setIndex].completed = !wasCompleted;
    setExerciseSessions(newSessions);

    if (!wasCompleted) {
      // Start rest timer if marking as completed
      const exercise = plan.exercises[exerciseIndex];
      setCurrentRestSeconds(exercise.restSeconds || 60);
      setRestTimerActive(false); // Reset first to trigger effect if already running
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
    <div className="flex flex-col space-y-6 pb-32">
      <div className="flex items-center justify-between sticky top-0 bg-[#0c0d0e]/95 backdrop-blur-lg z-20 py-4 border-b border-white/10 px-1">
        <div className="flex items-center space-x-3">
          <button onClick={onCancel} className="p-2 rounded-full bg-transparent border border-accent text-accent hover:bg-accent/10" title="Riduci a icona">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold tracking-tight leading-none mb-1">{plan.name}</h2>
            <div className="flex items-center space-x-2">
              <p className="text-[10px] mono-label accent-text uppercase tracking-widest leading-none">In corso • {unit}</p>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={handleSave} 
            className="rounded-full bg-transparent text-accent font-extrabold flex items-center space-x-2 px-6 py-2 shadow-[0_0_20px_rgba(220,252,4,0.15)] hover:bg-accent/10 active:scale-95 transition-all text-sm border border-accent"
          >
            <Check size={18} className="text-accent stroke-[3]" />
            <span className="text-accent uppercase tracking-widest font-black">Fine</span>
          </button>
        </div>
      </div>

      <div className="sticky top-[72px] z-10 bg-[#0c0d0e]/80 backdrop-blur-sm py-2">
        <Stopwatch startTime={startTime} />
      </div>

      <AnimatePresence>
        {restTimerActive && (
          <RestTimer 
            initialSeconds={currentRestSeconds}
            onReset={() => setRestTimerActive(false)} 
          />
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {(plan.exercises || []).map((exercise, exIdx) => (
          <motion.div 
            key={exercise.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="hardware-card overflow-hidden bg-white/[0.02] border-white/10"
          >
            <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-start">
              <div className="flex flex-col flex-1">
                <h3 className="font-bold text-lg leading-tight">{exercise.name}</h3>
                {exercise.notes && (
                  <p className="text-[10px] text-white/40 italic mt-1 leading-relaxed">{exercise.notes}</p>
                )}
                <div className="flex items-center space-x-1 mt-2">
                  <Dumbbell size={10} className="text-accent" />
                  <span className="text-[10px] text-white/30 uppercase mono-label">Bilanciere: </span>
                  <input 
                    type="number"
                    value={exerciseSessions[exIdx].barbellWeightUsed || ''}
                    onChange={(e) => updateBarbell(exIdx, parseFloat(e.target.value) || 0)}
                    className="w-10 bg-white/5 text-[10px] font-bold text-center rounded text-accent focus:outline-none focus:ring-1 focus:ring-accent py-0.5"
                  />
                  <span className="text-[10px] text-white/30 uppercase mono-label">{unit}</span>
                </div>
              </div>
              {previousSession && (
                <div className="flex items-center space-x-1 text-[9px] text-accent/50 uppercase tracking-widest mono-label pt-1">
                  <HistoryIcon size={10} />
                  <span>Suggest</span>
                </div>
              )}
            </div>
            
            <div className="p-4 space-y-4">
              <table className="w-full text-left">
                <thead>
                  <tr className="mono-label text-[9px] text-white/40">
                    <th className="pb-2 w-8">SET</th>
                    <th className="pb-2">PESO</th>
                    <th className="pb-2 w-8 text-center text-[7px]">UNIT</th>
                    <th className="pb-2 text-center w-12">REPS</th>
                    <th className="pb-2 w-10 text-center">DONE</th>
                  </tr>
                </thead>
                <tbody className="space-y-4">
                  <AnimatePresence>
                    {(exerciseSessions[exIdx]?.sets || []).map((set, setIdx) => {
                      const prevSet = getPreviousSetData(exercise.id, setIdx);
                      const targetSet = (exercise.targetSets || [])[setIdx];
                      const barbell = exerciseSessions[exIdx]?.barbellWeightUsed || 0;
                      const platesPerSide = set.weight > barbell ? (set.weight - barbell) / 2 : 0;

                      return (
                        <motion.tr 
                          key={setIdx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={`group transition-opacity duration-300 ${set.completed ? 'opacity-30' : ''}`}
                        >
                          <td className="py-2 align-middle">
                            <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center font-mono text-[10px] text-white/40">
                              {setIdx + 1}
                            </div>
                          </td>
                          <td className="py-2 pr-1 align-middle">
                            <div className="flex flex-col space-y-1">
                              <input
                                type="number"
                                value={set.weight || ''}
                                onChange={(e) => updateSet(exIdx, setIdx, 'weight', parseFloat(e.target.value))}
                                placeholder={targetSet?.weight ? `${targetSet.weight}` : (prevSet ? `${prevSet.weight}` : '0')}
                                className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                              />
                              {platesPerSide > 0 && (
                                <span className="text-[7px] font-mono text-accent/40 text-center uppercase tracking-tighter">
                                  {platesPerSide.toFixed(1)}/lato
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-1 text-center align-middle">
                            <button 
                              onClick={() => updateSet(exIdx, setIdx, 'unit', set.unit === 'kg' ? 'lb' : 'kg')}
                              className={`text-[8px] font-black p-1 rounded min-w-[24px] uppercase border transition-all bg-transparent ${
                                set.unit === 'kg' 
                                  ? 'border-blue-500 text-blue-400' 
                                  : 'border-accent text-accent'
                              }`}
                            >
                              {set.unit}
                            </button>
                          </td>
                          <td className="py-2 px-1 align-middle">
                            <input
                              type="number"
                              value={set.reps || ''}
                              onChange={(e) => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value))}
                              placeholder={targetSet?.reps ? `${targetSet.reps}` : (prevSet ? `${prevSet.reps}` : '0')}
                              className="w-full bg-white/5 rounded-lg p-2 font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                            />
                          </td>
                          <td className="py-2 text-center align-middle">
                            <button
                              onClick={() => toggleComplete(exIdx, setIdx)}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                                set.completed 
                                  ? 'bg-transparent border-accent text-accent shadow-[0_0_15px_rgba(220,252,4,0.4)]' 
                                  : 'bg-transparent border-white/20 text-white/20 hover:border-accent hover:text-accent'
                              }`}
                            >
                              <Check size={18} className={set.completed ? 'stroke-[3]' : ''} />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
              
              <div className="flex space-x-2">
                <button 
                  onClick={() => addSet(exIdx)}
                  className="flex-1 py-3 rounded-xl border-2 border-dashed border-accent text-accent hover:text-accent hover:bg-accent/10 transition-all flex items-center justify-center space-x-2 text-[10px] mono-label font-black tracking-widest bg-transparent"
                >
                  <Plus size={14} className="stroke-[3]" />
                  <span>AGGIUNGI SET</span>
                </button>
                <button 
                  onClick={() => removeSet(exIdx, exerciseSessions[exIdx].sets.length - 1)}
                  className="px-4 py-3 rounded-xl border border-dashed border-accent text-accent hover:bg-accent/10 transition-all flex items-center justify-center"
                >
                  <Minus size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
