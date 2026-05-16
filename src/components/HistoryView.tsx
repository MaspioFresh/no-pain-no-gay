import { WorkoutSession, WorkoutPlan, AppSettings } from '../types';
import { ArrowLeft, Calendar, Dumbbell, Trash2, Edit2, Scale } from 'lucide-react';
import { motion } from 'motion/react';

interface HistoryViewProps {
  sessions: WorkoutSession[];
  plans: WorkoutPlan[];
  settings: AppSettings;
  onBack: () => void;
  onDeleteSession: (id: string) => void;
  onEditSession: (session: WorkoutSession) => void;
}

const formatTimeSeconds = (totalSeconds: number, isCardio: boolean) => {
  if (isCardio) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  } else {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }
};

export function HistoryView({ sessions, plans, settings, onBack, onDeleteSession, onEditSession }: HistoryViewProps) {
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
                <div className="flex items-center space-x-1">
                  <span className="mono-label text-[10px] mr-2">{getPlanName(session.planId)}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditSession(session);
                    }}
                    className="p-2 text-white/20 hover:text-accent hover:bg-accent/10 rounded-full transition-all active:scale-90"
                    title="Modifica"
                  >
                    <Edit2 size={16} />
                  </button>
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
                  const isSupersetWithPrev = i > 0 && ex.supersetId && ex.supersetId === session.exercises[i - 1].supersetId;
                  const isSupersetWithNext = i < session.exercises.length - 1 && ex.supersetId && ex.supersetId === session.exercises[i + 1].supersetId;

                  return (
                    <div key={i} className={`flex flex-col pb-3 pt-2 ${isSupersetWithNext ? '' : 'border-b border-white/5 last:border-0 last:pb-0'} ${(isSupersetWithPrev || isSupersetWithNext) ? 'border-l-2 border-accent/30 pl-3 ml-1' : ''} ${isSupersetWithPrev ? 'pt-0' : ''}`}>
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center space-x-2">
                          <Dumbbell size={12} className="text-white/40" />
                          <span className="text-white/80 font-bold">{planEx?.name || 'Esercizio'}</span>
                          {isSupersetWithNext && !isSupersetWithPrev && (
                            <span className="text-[8px] bg-accent/10 text-accent px-1 rounded uppercase font-black">Superserie</span>
                          )}
                        </div>
                        <div className="flex space-x-2 font-mono text-[10px] flex-wrap justify-end gap-y-1">
                          {(ex.sets || []).map((s, si) => {
                            const isPerSide = planEx?.type === 'barbell' || !planEx?.type
                              ? settings.barbellMode === 'perSide'
                              : planEx?.type === 'dumbbell'
                                ? settings.dumbbellMode === 'perSide'
                                : planEx?.type === 'plateLoaded'
                                  ? settings.plateLoadedMode === 'perSide'
                                  : false;
                            
                            const displayWeight = isPerSide
                              ? (planEx?.type === 'barbell' || planEx?.type === 'plateLoaded')
                                ? ((s.weight || 0) - (ex.barbellWeightUsed || 0)) / 2
                                : (s.weight || 0) / 2
                              : (s.weight || 0);

                            return (
                              <span key={si} className="bg-white/5 px-1 rounded">
                                {planEx?.type === 'cardio'
                                  ? `${formatTimeSeconds(s.timeSeconds || 0, true)} - ${s.distance || 0}${s.unit}`
                                  : planEx?.type === 'time'
                                  ? `${formatTimeSeconds(s.timeSeconds || 0, false)} + ${s.weight || 0}${s.unit}`
                                  : `${displayWeight}${s.unit || session.unitAtTime || 'kg'}×${s.reps}`}
                              </span>
                            );
                          })}
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
