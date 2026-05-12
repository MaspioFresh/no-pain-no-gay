import React from 'react';
import { WorkoutSession, WorkoutPlan } from '../types';
import { ArrowLeft, Calendar, Dumbbell, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface HistoryViewProps {
  sessions: WorkoutSession[];
  plans: WorkoutPlan[];
  onBack: () => void;
  onDeleteSession: (id: string) => void;
}

export function HistoryView({ sessions, plans, onBack, onDeleteSession }: HistoryViewProps) {
  const getPlanName = (planId: string) => plans.find(p => p.id === planId)?.name || 'Scheda Eliminata';

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in duration-300">
      <header className="flex items-center space-x-4">
        <button onClick={onBack} className="p-2 rounded-full bg-white/5 text-white hover:text-accent hover:bg-accent/5 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold">Cronologia Allenamenti</h2>
      </header>

      {sessions.length === 0 ? (
        <div className="p-12 text-center text-white/30 hardware-card border-dashed">
          <Calendar size={48} className="mx-auto mb-4 opacity-10" />
          <p>Nessun allenamento registrato ancora.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <motion.div 
              key={session.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="hardware-card overflow-hidden"
            >
              <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="bg-accent/20 p-2 rounded text-accent">
                    <Calendar size={16} />
                  </div>
                  <span className="font-bold">{formatDate(session.date)}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="mono-label text-[10px]">{getPlanName(session.planId)}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all active:scale-90"
                    title="Elimina"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {(session.exercises || []).map((ex, i) => {
                  const planEx = plans.find(p => p.id === session.planId)?.exercises.find(e => e.id === ex.exerciseId);
                  return (
                    <div key={i} className="flex flex-col border-b border-white/5 pb-3 pt-1 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center space-x-2">
                          <Dumbbell size={12} className="text-white/40" />
                          <span className="text-white/80">{planEx?.name || 'Esercizio'}</span>
                        </div>
                        <div className="flex space-x-2 font-mono text-[10px] flex-wrap justify-end gap-y-1">
                          {(ex.sets || []).map((s, si) => (
                            <span key={si} className="bg-white/5 px-1 rounded">
                              {s.weight}{s.unit || session.unitAtTime || 'kg'}×{s.reps}
                            </span>
                          ))}
                        </div>
                      </div>
                      {ex.notes && (
                        <div className="text-[10px] text-accent/80 italic mt-2 bg-accent/5 p-2 rounded border border-accent/20">
                          "{ex.notes}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
