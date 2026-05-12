import React, { useState } from 'react';
import { WorkoutPlan, Exercise, PlanSet } from '../types';
import { ArrowLeft, Save, Plus, Trash2, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { motion, Reorder } from 'motion/react';

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

  const addExercise = () => {
    setExercises([...exercises, { id: generateId(), name: '', targetSets: [{ reps: 0 }] }]);
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
          targetSets: [...ex.targetSets, { reps: lastSet?.reps || 0, weight: lastSet?.weight }]
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
    if (!name.trim()) return alert('Inserisci un nome per la scheda');
    const validExercises = exercises.filter(ex => ex.name.trim() !== '');
    if (validExercises.length === 0) return alert('Aggiungi almeno un esercizio');

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

          <div className="space-y-4">
            {exercises.map((exercise, index) => (
              <div 
                key={exercise.id} 
                className="hardware-card p-4 flex flex-col space-y-3 bg-white/[0.02] border-white/10"
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
                          <input 
                            type="number"
                            value={set.reps || ''}
                            onChange={(e) => updateTargetSet(exercise.id, sIdx, 'reps', parseInt(e.target.value))}
                            placeholder="Rip"
                            className="w-full bg-white/5 rounded px-2 py-1 text-sm font-mono focus:outline-none"
                          />
                          <input 
                            type="number"
                            value={set.weight || ''}
                            onChange={(e) => updateTargetSet(exercise.id, sIdx, 'weight', parseFloat(e.target.value))}
                            placeholder="Peso opz."
                            className="w-full bg-white/5 rounded px-2 py-1 text-sm font-mono focus:outline-none"
                          />
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
                  
                  <div className="flex items-center space-x-2 border-l border-white/10 pl-4">
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
            ))}
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
    </div>
  );
}
