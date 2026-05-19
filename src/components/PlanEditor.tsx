import React, { useState } from 'react';
import { WorkoutPlan, Exercise, PlanSet, ExerciseType, AppSettings } from '../types';
import { ArrowLeft, Save, Plus, Trash2, ArrowUp, ArrowDown, Minus, Link2, Unlink } from 'lucide-react';
import { motion, Reorder } from 'motion/react';
import { Modal, useModal } from './Modal';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

interface PlanEditorProps {
  onSave: (plan: WorkoutPlan) => void;
  onCancel: () => void;
  existingPlan?: WorkoutPlan;
  settings: AppSettings;
}

export function PlanEditor({ onSave, onCancel, existingPlan, settings }: PlanEditorProps) {
  const [name, setName] = useState(existingPlan?.name || '');
  const [exercises, setExercises] = useState<Exercise[]>(existingPlan?.exercises || [
    { id: generateId(), name: '', targetSets: [{ reps: 0 }] }
  ]);
  const { modalState, closeModal, showAlert } = useModal();

  const addExercise = () => {
    setExercises(prev => [...prev, {
      id: generateId(),
      name: '',
      type: 'barbell',
      barbellWeight: 20,
      restSeconds: 60,
      targetSets: [{ reps: 10 }]
    }]);
  };

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      setExercises(prev => {
        const newExercises = [...prev];
        const temp = newExercises[index];
        newExercises[index] = newExercises[index - 1];
        newExercises[index - 1] = temp;
        return newExercises;
      });
    } else if (direction === 'down' && index < exercises.length - 1) {
      setExercises(prev => {
        const newExercises = [...prev];
        const temp = newExercises[index];
        newExercises[index] = newExercises[index + 1];
        newExercises[index + 1] = temp;
        return newExercises;
      });
    }
  };

  const toggleSuperset = (index: number) => {
    if (index === 0) return;
    setExercises(prev => {
      const currentEx = prev[index];
      const prevEx = prev[index - 1];
      let newExercises = [...prev];

      if (currentEx.supersetId && currentEx.supersetId === prevEx.supersetId) {
        newExercises[index] = { ...currentEx, supersetId: undefined };
      } else {
        const sId = prevEx.supersetId || generateId();
        newExercises[index - 1] = { ...prevEx, supersetId: sId };
        newExercises[index] = { ...currentEx, supersetId: sId };
      }
      return newExercises;
    });
  };

  const removeExercise = (id: string) => {
    setExercises(prev => prev.filter(ex => ex.id !== id));
  };

  const updateExercise = (id: string, updates: Partial<Exercise>) => {
    setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, ...updates } : ex));
  };

  const addTargetSet = (exId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exId) {
        const lastSet = ex.targetSets[ex.targetSets.length - 1];
        return {
          ...ex,
          targetSets: [...ex.targetSets, {
            reps: lastSet?.reps || 0,
            weight: lastSet?.weight,
            timeSeconds: lastSet?.timeSeconds,
            distance: lastSet?.distance
          }]
        };
      }
      return ex;
    }));
  };

  const removeTargetSet = (exId: string, index: number) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exId) {
        const newSets = [...ex.targetSets];
        newSets.splice(index, 1);
        if (newSets.length === 0) newSets.push({ reps: 0 });
        return { ...ex, targetSets: newSets };
      }
      return ex;
    }));
  };

  const updateTargetSet = (exId: string, index: number, field: keyof PlanSet, value: any) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exId) {
        const newSets = [...ex.targetSets];
        newSets[index] = { ...newSets[index], [field]: value };
        return { ...ex, targetSets: newSets };
      }
      return ex;
    }));
  };

  const handleSave = () => {
    if (!name.trim()) {
      showAlert('Nome mancante', 'Inserisci un nome per la scheda.', 'warning');
      return;
    }
    const validExercises = exercises.filter(ex => ex.name.trim() !== '');
    if (validExercises.length === 0) {
      showAlert('Nessun esercizio', 'Aggiungi almeno un esercizio prima di salvare.', 'warning');
      return;
    }

    const plan: WorkoutPlan = {
      id: existingPlan?.id || generateId(),
      name,
      exercises: validExercises
    };
    console.log('Saving plan:', plan);
    onSave(plan);
  };

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in duration-300 pb-12">
      <header className="flex items-center justify-between sticky top-0 bg-[#0c0d0e]/95 backdrop-blur-md z-10 py-4 border-b border-white/10 px-1">
        <div className="flex items-center space-x-4">
          <button onClick={onCancel} className="btn-icon">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold">{existingPlan ? 'Modifica Scheda' : 'Nuova Scheda'}</h2>
        </div>
        <button
          onClick={handleSave}
          className="btn-primary py-2 px-6 text-xs tracking-widest"
        >
          <Save size={16} />
          <span>SALVA</span>
        </button>
      </header>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="mono-label">Nome Scheda</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="es. Spinta, Gambe, Upper Body..."
            className="w-full input-text text-xl font-bold"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="mono-label">Esercizi</h3>
            <span className="text-[10px] text-white/30 uppercase tracking-tighter">Usa le frecce per ordinare</span>
          </div>

          <div className="pt-2">
            {exercises.map((exercise, index) => {
              const isSupersetWithPrev = index > 0 && exercise.supersetId && exercise.supersetId === exercises[index - 1].supersetId;
              const isSupersetWithNext = index < exercises.length - 1 && exercise.supersetId && exercise.supersetId === exercises[index + 1].supersetId;

              return (
                <div key={exercise.id} className="relative flex flex-col items-center">
                  {index > 0 && (
                    <div className="z-10 -my-3">
                      <button
                        onClick={() => toggleSuperset(index)}
                        className={`p-1.5 rounded-full border transition-all ${isSupersetWithPrev
                          ? 'bg-accent text-black border-accent shadow-[0_0_10px_rgba(220,252,4,0.4)] scale-110'
                          : 'bg-[#151619] text-white/30 border-white/10 hover:text-white/80 hover:bg-white/5'
                          }`}
                        title={isSupersetWithPrev ? 'Scollega Superset' : 'Collega in Superset'}
                      >
                        {isSupersetWithPrev ? <Unlink size={14} /> : <Link2 size={14} />}
                      </button>
                    </div>
                  )}
                  <div
                    className={`hardware-card p-4 flex flex-col space-y-3 bg-white/[0.02] border-white/10 transition-all w-full ${isSupersetWithPrev ? 'rounded-t-none border-t-0' : ''
                      } ${isSupersetWithNext ? 'rounded-b-none border-b-0' : ''
                      } ${(isSupersetWithPrev || isSupersetWithNext) ? 'border-l-4 border-l-accent pl-3' : ''
                      } ${index > 0 && !isSupersetWithPrev ? 'mt-4' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <button
                          onClick={() => moveExercise(index, 'up')}
                          disabled={index === 0}
                          className={`p-1 rounded ${index === 0 ? 'text-white/10' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          onClick={() => moveExercise(index, 'down')}
                          disabled={index === exercises.length - 1}
                          className={`p-1 rounded ${index === exercises.length - 1 ? 'text-white/10' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                        >
                          <ArrowDown size={16} />
                        </button>
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={exercise.name}
                          onChange={(e) => updateExercise(exercise.id, { name: e.target.value })}
                          placeholder="Nome esercizio..."
                          className="w-full bg-transparent border-none focus:ring-0 text-white font-bold p-0 text-lg"
                        />
                      </div>
                      <button
                        onClick={() => removeExercise(exercise.id)}
                        className="p-2 text-red-500/30 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex flex-col space-y-3 mt-2">
                      <div className="flex space-x-2">
                        <select
                          value={exercise.type || 'barbell'}
                          onChange={(e) => updateExercise(exercise.id, { type: e.target.value as ExerciseType })}
                          className="w-full input-select"
                        >
                          <option value="barbell" className="bg-[#151619]">Bilanciere</option>
                          <option value="dumbbell" className="bg-[#151619]">Manubri</option>
                          <option value="plateLoaded" className="bg-[#151619]">Macchinario con Dischi</option>
                          <option value="machine" className="bg-[#151619]">Macchinario con pacco pesi</option>
                          <option value="bodyweight" className="bg-[#151619]">Corpo Libero</option>
                          <option value="time" className="bg-[#151619]">A Tempo</option>
                          <option value="cardio" className="bg-[#151619]">Cardio</option>
                        </select>
                      </div>

                      {exercise.imageUrl === undefined ? (
                        <button
                          onClick={() => updateExercise(exercise.id, { imageUrl: '' })}
                          className="text-[10px] mono-label text-accent flex items-center space-x-1 py-1 px-2 rounded bg-accent/10 w-fit hover:bg-accent/20 transition-colors"
                        >
                          <Plus size={10} />
                          <span>Aggiungi Immagine</span>
                        </button>
                      ) : (
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={exercise.imageUrl || ''}
                            onChange={(e) => updateExercise(exercise.id, { imageUrl: e.target.value })}
                            placeholder="Link immagine (URL)..."
                            className="flex-1 input-text p-2 text-xs"
                          />
                          <button
                            onClick={() => updateExercise(exercise.id, { imageUrl: undefined })}
                            className="btn-icon rounded-lg p-2 border border-white/10"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] mono-label px-1">
                        <span>Target Sets</span>
                        <button
                          onClick={() => addTargetSet(exercise.id)}
                          className="text-accent underline flex items-center space-x-1"
                        >
                          <Plus size={10} />
                          <span>Aggiungi</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {exercise.targetSets.map((set, sIdx) => {
                          const barbell = exercise.barbellWeight || 20;
                          const isPerSide = exercise.type === 'barbell' || !exercise.type
                            ? settings.barbellMode === 'perSide'
                            : exercise.type === 'dumbbell'
                              ? settings.dumbbellMode === 'perSide'
                              : exercise.type === 'plateLoaded'
                                ? settings.plateLoadedMode === 'perSide'
                                : false;

                          const rawWeight = set.weight || 0;
                          const weightDisplayVal = isPerSide
                            ? (exercise.type === 'barbell' || !exercise.type)
                              ? (rawWeight > barbell ? (rawWeight - barbell) / 2 : '')
                              : (rawWeight > 0 ? rawWeight / 2 : '')
                            : (rawWeight || '');

                          return (
                            <div key={sIdx} className="flex flex-col space-y-2 bg-white/5 p-2 rounded-lg">
                              {/* Main Row: Index + Inputs + Delete Button */}
                              <div className="flex items-center space-x-2 w-full">
                                <span className="text-[10px] font-mono w-4 text-white/40 text-center flex-shrink-0">{sIdx + 1}</span>
                                <div className="flex-1 flex items-center space-x-2 min-w-0">
                                  {(!exercise.type || ['barbell', 'dumbbell', 'machine', 'plateLoaded', 'bodyweight'].includes(exercise.type)) && (
                                    <>
                                      <input
                                        type="number"
                                        value={weightDisplayVal}
                                        onChange={(e) => {
                                          const valPerLato = parseFloat(e.target.value) || 0;
                                          if (isPerSide) {
                                            const totale = (exercise.type === 'barbell' || !exercise.type)
                                              ? (valPerLato * 2) + barbell
                                              : valPerLato * 2;
                                            updateTargetSet(exercise.id, sIdx, 'weight', totale);
                                          } else {
                                            updateTargetSet(exercise.id, sIdx, 'weight', valPerLato);
                                          }
                                        }}
                                        placeholder={isPerSide ? 'P.Lato' : (exercise.type === 'bodyweight' ? 'Sovr.' : 'Peso')}
                                        className="input-number-small flex-1 min-w-[50px]"
                                      />
                                      <div className="flex items-center space-x-1 flex-shrink-0">
                                        {!set.isMaxReps && (
                                          <input
                                            type="number"
                                            value={set.reps || ''}
                                            onChange={(e) => updateTargetSet(exercise.id, sIdx, 'reps', parseInt(e.target.value))}
                                            placeholder="Rip"
                                            className="input-number-small w-14"
                                          />
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextVal = !set.isMaxReps;
                                            updateTargetSet(exercise.id, sIdx, 'isMaxReps', nextVal);
                                            if (nextVal) {
                                              updateTargetSet(exercise.id, sIdx, 'reps', 0);
                                            }
                                          }}
                                          className={`text-[8px] font-black px-1.5 py-1 rounded transition-all uppercase border ${set.isMaxReps
                                            ? 'border-accent bg-accent text-[#0c0d0e] font-bold shadow-[0_0_8px_rgba(220,252,4,0.4)]'
                                            : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white'
                                            }`}
                                        >
                                          MAX
                                        </button>
                                      </div>
                                    </>
                                  )}
                                  {exercise.type === 'time' && (
                                    <>
                                      <div className="flex w-full space-x-1">
                                        <input
                                          type="number"
                                          value={Math.floor((set.timeSeconds || 0) / 60) || ''}
                                          onChange={(e) => {
                                            const m = parseInt(e.target.value) || 0;
                                            const s = (set.timeSeconds || 0) % 60;
                                            updateTargetSet(exercise.id, sIdx, 'timeSeconds', m * 60 + s);
                                          }}
                                          placeholder="min"
                                          className="input-number-small px-1"
                                        />
                                        <span className="text-white/30 self-center">:</span>
                                        <input
                                          type="number"
                                          value={(set.timeSeconds || 0) % 60 || ''}
                                          onChange={(e) => {
                                            const s = parseInt(e.target.value) || 0;
                                            const m = Math.floor((set.timeSeconds || 0) / 60);
                                            updateTargetSet(exercise.id, sIdx, 'timeSeconds', m * 60 + s);
                                          }}
                                          placeholder="sec"
                                          className="input-number-small px-1"
                                        />
                                      </div>
                                      <input
                                        type="number"
                                        value={set.weight || ''}
                                        onChange={(e) => updateTargetSet(exercise.id, sIdx, 'weight', parseFloat(e.target.value))}
                                        placeholder="+Kg"
                                        className="input-number-small"
                                      />
                                    </>
                                  )}
                                  {exercise.type === 'cardio' && (
                                    <>
                                      <div className="flex w-[140%] space-x-1">
                                        <input
                                          type="number"
                                          value={Math.floor((set.timeSeconds || 0) / 3600) || ''}
                                          onChange={(e) => {
                                            const h = parseInt(e.target.value) || 0;
                                            const m = Math.floor(((set.timeSeconds || 0) % 3600) / 60);
                                            const s = (set.timeSeconds || 0) % 60;
                                            updateTargetSet(exercise.id, sIdx, 'timeSeconds', h * 3600 + m * 60 + s);
                                          }}
                                          placeholder="h"
                                          className="input-number-small px-1 text-xs"
                                        />
                                        <span className="text-white/30 self-center">:</span>
                                        <input
                                          type="number"
                                          value={Math.floor(((set.timeSeconds || 0) % 3600) / 60) || ''}
                                          onChange={(e) => {
                                            const m = parseInt(e.target.value) || 0;
                                            const h = Math.floor((set.timeSeconds || 0) / 3600);
                                            const s = (set.timeSeconds || 0) % 60;
                                            updateTargetSet(exercise.id, sIdx, 'timeSeconds', h * 3600 + m * 60 + s);
                                          }}
                                          placeholder="m"
                                          className="input-number-small px-1 text-xs"
                                        />
                                        <span className="text-white/30 self-center">:</span>
                                        <input
                                          type="number"
                                          value={(set.timeSeconds || 0) % 60 || ''}
                                          onChange={(e) => {
                                            const s = parseInt(e.target.value) || 0;
                                            const h = Math.floor((set.timeSeconds || 0) / 3600);
                                            const m = Math.floor(((set.timeSeconds || 0) % 3600) / 60);
                                            updateTargetSet(exercise.id, sIdx, 'timeSeconds', h * 3600 + m * 60 + s);
                                          }}
                                          placeholder="s"
                                          className="input-number-small px-1 text-xs"
                                        />
                                      </div>
                                      <input
                                        type="number"
                                        value={set.distance || ''}
                                        onChange={(e) => updateTargetSet(exercise.id, sIdx, 'distance', parseFloat(e.target.value))}
                                        placeholder="Dist"
                                        className="input-number-small w-[60%]"
                                      />
                                    </>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeTargetSet(exercise.id, sIdx)}
                                  className="p-1 text-white/10 hover:text-red-500 flex-shrink-0"
                                >
                                  <Minus size={14} />
                                </button>
                              </div>

                              {/* Second Row: Special Techniques (RP/DS config) */}
                              <div className="flex items-center space-x-1.5 pl-6 w-full flex-wrap gap-y-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextMode = set.setMode === 'restPause' ? 'normal' : 'restPause';
                                    updateTargetSet(exercise.id, sIdx, 'setMode', nextMode);
                                    if (nextMode !== 'normal' && !set.subSetsCount) {
                                      updateTargetSet(exercise.id, sIdx, 'subSetsCount', 1);
                                    }
                                  }}
                                  className={`text-[8px] font-black px-1.5 py-0.5 rounded transition-all border uppercase ${set.setMode === 'restPause'
                                    ? 'border-orange-500 bg-orange-500/10 text-orange-400 font-bold'
                                    : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white'
                                    }`}
                                >
                                  RP
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextMode = set.setMode === 'dropSet' ? 'normal' : 'dropSet';
                                    updateTargetSet(exercise.id, sIdx, 'setMode', nextMode);
                                    if (nextMode !== 'normal' && !set.subSetsCount) {
                                      updateTargetSet(exercise.id, sIdx, 'subSetsCount', 1);
                                    }
                                  }}
                                  className={`text-[8px] font-black px-1.5 py-0.5 rounded transition-all border uppercase ${set.setMode === 'dropSet'
                                    ? 'border-purple-500 bg-purple-500/10 text-purple-400 font-bold'
                                    : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white'
                                    }`}
                                >
                                  DS
                                </button>

                                {set.setMode && set.setMode !== 'normal' && (
                                  <div className="flex items-center space-x-1 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                    <span className="text-[7px] text-white/40 uppercase font-black">Sub:</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = set.subSetsCount || 1;
                                        if (current > 1) {
                                          updateTargetSet(exercise.id, sIdx, 'subSetsCount', current - 1);
                                        }
                                      }}
                                      className="w-3.5 h-3.5 flex items-center justify-center rounded bg-white/10 text-white hover:bg-white/20 text-[9px] font-bold"
                                    >
                                      -
                                    </button>
                                    <span className="text-[9px] font-bold font-mono text-accent min-w-3 text-center">
                                      {set.subSetsCount || 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = set.subSetsCount || 1;
                                        if (current < 5) {
                                          updateTargetSet(exercise.id, sIdx, 'subSetsCount', current + 1);
                                        }
                                      }}
                                      className="w-3.5 h-3.5 flex items-center justify-center rounded bg-white/10 text-white hover:bg-white/20 text-[9px] font-bold"
                                    >
                                      +
                                    </button>
                                  </div>
                                )}

                                {set.setMode === 'restPause' && (
                                  <div className="flex items-center space-x-1 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                    <span className="text-[7px] text-orange-400/80 uppercase font-black">Rec:</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = set.restPauseSeconds || 20;
                                        if (current > 5) {
                                          updateTargetSet(exercise.id, sIdx, 'restPauseSeconds', current - 5);
                                        }
                                      }}
                                      className="w-3.5 h-3.5 flex items-center justify-center rounded bg-white/10 text-white hover:bg-white/20 text-[9px] font-bold"
                                    >
                                      -
                                    </button>
                                    <span className="text-[9px] font-bold font-mono text-accent min-w-[14px] text-center">
                                      {set.restPauseSeconds || 20}s
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = set.restPauseSeconds || 20;
                                        if (current < 90) {
                                          updateTargetSet(exercise.id, sIdx, 'restPauseSeconds', current + 5);
                                        }
                                      }}
                                      className="w-3.5 h-3.5 flex items-center justify-center rounded bg-white/10 text-white hover:bg-white/20 text-[9px] font-bold"
                                    >
                                      +
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                        )})}
                      </div>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <span className="text-[10px] text-white/30 uppercase mono-label">Note / Info</span>
                      <textarea
                        value={exercise.notes || ''}
                        onChange={(e) => updateExercise(exercise.id, { notes: e.target.value })}
                        placeholder="es. Focus sul petto alto, 2 min recupero..."
                        className="input-textarea"
                      />
                    </div>

                    <div className="flex items-center space-x-4 pt-2 border-t border-white/5">
                      {(!exercise.type || exercise.type === 'barbell') && (
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-white/30 uppercase">Bilanciere:</span>
                          <input
                            type="number"
                            value={exercise.barbellWeight || ''}
                            onChange={(e) => updateExercise(exercise.id, { barbellWeight: parseFloat(e.target.value) })}
                            placeholder="0"
                            className="input-number-small w-12 text-[10px] p-1"
                          />
                          <span className="text-[10px] text-white/30 uppercase">kg</span>
                        </div>
                      )}
 
                      <div className={`flex items-center space-x-2 ${(!exercise.type || exercise.type === 'barbell') ? 'border-l border-white/10 pl-4' : ''}`}>
                        <span className="text-[10px] text-white/30 uppercase">Recupero:</span>
                        <input
                          type="number"
                          value={exercise.restSeconds || ''}
                          onChange={(e) => updateExercise(exercise.id, { restSeconds: parseInt(e.target.value) })}
                          placeholder="60"
                          className="input-number-small w-12 text-[10px] p-1"
                        />
                        <span className="text-[10px] text-white/30 uppercase">sec</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={addExercise}
            className="w-full btn-secondary border-dashed border-2 py-4 shadow-[0_0_15px_rgba(220,252,4,0.05)]"
          >
            <Plus size={20} className="text-accent stroke-[3]" />
            <span className="mono-label font-black tracking-widest text-accent">Aggiungi Esercizio</span>
          </button>
        </div>
      </div>

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
