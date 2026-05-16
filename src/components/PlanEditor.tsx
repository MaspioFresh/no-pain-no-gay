import React, { useState } from 'react';
import { WorkoutPlan, Exercise, PlanSet, ExerciseType } from '../types';
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
}

export function PlanEditor({ onSave, onCancel, existingPlan }: PlanEditorProps) {
  const [name, setName] = useState(existingPlan?.name || '');
  const [exercises, setExercises] = useState<Exercise[]>(existingPlan?.exercises || [
    { id: generateId(), name: '', targetSets: [{ reps: 0 }] }
  ]);
  const { modalState, closeModal, showAlert } = useModal();

  const addExercise = () => {
    setExercises([...exercises, {
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
      const newExercises = [...exercises];
      const temp = newExercises[index];
      newExercises[index] = newExercises[index - 1];
      newExercises[index - 1] = temp;
      setExercises(newExercises);
    } else if (direction === 'down' && index < exercises.length - 1) {
      const newExercises = [...exercises];
      const temp = newExercises[index];
      newExercises[index] = newExercises[index + 1];
      newExercises[index + 1] = temp;
      setExercises(newExercises);
    }
  };

  const toggleSuperset = (index: number) => {
    if (index === 0) return;
    const currentEx = exercises[index];
    const prevEx = exercises[index - 1];

    let newExercises = [...exercises];

    if (currentEx.supersetId && currentEx.supersetId === prevEx.supersetId) {
      newExercises[index] = { ...currentEx, supersetId: undefined };
    } else {
      const sId = prevEx.supersetId || generateId();
      newExercises[index - 1] = { ...prevEx, supersetId: sId };
      newExercises[index] = { ...currentEx, supersetId: sId };
    }
    setExercises(newExercises);
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const updateExercise = (id: string, updates: Partial<Exercise>) => {
    setExercises(exercises.map(ex => ex.id === id ? { ...ex, ...updates } : ex));
  };

  const addTargetSet = (exId: string) => {
    setExercises(exercises.map(ex => {
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
    setExercises(exercises.map(ex => {
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
    setExercises(exercises.map(ex => {
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
          <button onClick={onCancel} className="p-2 rounded-full bg-white/5 text-white hover:bg-white/10">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold">{existingPlan ? 'Modifica Scheda' : 'Nuova Scheda'}</h2>
        </div>
        <button
          onClick={handleSave}
          className="bg-black text-accent p-2 px-6 rounded-full font-black flex items-center space-x-2 shadow-[0_0_20px_rgba(220,252,4,0.15)] hover:scale-105 active:scale-95 transition-all text-xs border border-accent/40 uppercase tracking-widest"
        >
          <Save size={16} className="text-accent" />
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
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-accent"
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
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent appearance-none"
                          style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                        >
                          <option value="barbell" className="bg-[#151619]">Bilanciere</option>
                          <option value="dumbbell" className="bg-[#151619]">Manubri</option>
                          <option value="plateLoaded" className="bg-[#151619]">Macchinario con Dischi</option>
                          <option value="machine" className="bg-[#151619]">Macchinario con pacco pesi</option>
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
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                          <button
                            onClick={() => updateExercise(exercise.id, { imageUrl: undefined })}
                            className="p-2 text-white/30 hover:text-red-500 rounded-lg bg-white/5 border border-white/10"
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
                        {exercise.targetSets.map((set, sIdx) => (
                          <div key={sIdx} className="flex items-center space-x-2 bg-white/5 p-2 rounded-lg">
                            <span className="text-[10px] font-mono w-4 text-white/40">{sIdx + 1}</span>
                            <div className="flex-1 flex items-center space-x-2">
                              {(!exercise.type || ['barbell', 'dumbbell', 'machine', 'plateLoaded'].includes(exercise.type)) && (
                                <>
                                  <input
                                    type="number"
                                    value={set.reps || ''}
                                    onChange={(e) => updateTargetSet(exercise.id, sIdx, 'reps', parseInt(e.target.value))}
                                    placeholder="Rip"
                                    className="w-full bg-white/5 rounded px-2 py-1 text-sm font-mono focus:outline-none text-center"
                                  />
                                  <input
                                    type="number"
                                    value={set.weight || ''}
                                    onChange={(e) => updateTargetSet(exercise.id, sIdx, 'weight', parseFloat(e.target.value))}
                                    placeholder="Peso"
                                    className="w-full bg-white/5 rounded px-2 py-1 text-sm font-mono focus:outline-none text-center"
                                  />
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
                                      className="w-full bg-white/5 rounded px-1 py-1 text-sm font-mono focus:outline-none text-center"
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
                                      className="w-full bg-white/5 rounded px-1 py-1 text-sm font-mono focus:outline-none text-center"
                                    />
                                  </div>
                                  <input
                                    type="number"
                                    value={set.weight || ''}
                                    onChange={(e) => updateTargetSet(exercise.id, sIdx, 'weight', parseFloat(e.target.value))}
                                    placeholder="+Kg"
                                    className="w-full bg-white/5 rounded px-2 py-1 text-sm font-mono focus:outline-none text-center"
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
                                      className="w-full bg-white/5 rounded px-1 py-1 text-xs font-mono focus:outline-none text-center"
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
                                      className="w-full bg-white/5 rounded px-1 py-1 text-xs font-mono focus:outline-none text-center"
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
                                      className="w-full bg-white/5 rounded px-1 py-1 text-xs font-mono focus:outline-none text-center"
                                    />
                                  </div>
                                  <input
                                    type="number"
                                    value={set.distance || ''}
                                    onChange={(e) => updateTargetSet(exercise.id, sIdx, 'distance', parseFloat(e.target.value))}
                                    placeholder="Dist"
                                    className="w-[60%] bg-white/5 rounded px-2 py-1 text-sm font-mono focus:outline-none text-center"
                                  />
                                </>
                              )}
                            </div>
                            <button
                              onClick={() => removeTargetSet(exercise.id, sIdx)}
                              className="p-1 text-white/10 hover:text-red-500"
                            >
                              <Minus size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <span className="text-[10px] text-white/30 uppercase mono-label">Note / Info</span>
                      <textarea
                        value={exercise.notes || ''}
                        onChange={(e) => updateExercise(exercise.id, { notes: e.target.value })}
                        placeholder="es. Focus sul petto alto, 2 min recupero..."
                        className="w-full bg-white/5 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent min-h-[60px] resize-none"
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
                            className="w-12 bg-white/5 text-[10px] p-1 rounded text-center focus:outline-none"
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
                          className="w-12 bg-white/5 text-[10px] p-1 rounded text-center focus:outline-none"
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
            className="w-full py-4 border-2 border-dashed border-accent/30 rounded-xl text-accent hover:text-accent hover:border-accent hover:bg-accent/10 transition-all flex items-center justify-center space-x-2 bg-accent/5 active:scale-[0.98] shadow-[0_0_15px_rgba(220,252,4,0.05)]"
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
