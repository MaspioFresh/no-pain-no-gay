import React, { useState, useMemo } from 'react';
import { WorkoutSession, WorkoutPlan, AppSettings } from '../types';
import { ArrowLeft, Calendar, Dumbbell, Trash2, Edit2, Scale, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { Modal } from './Modal';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlanId, setFilterPlanId] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');

  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const getPlanName = (planId: string) => plans.find(p => p.id === planId)?.name || 'Scheda Eliminata';

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatRangeDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const handlePeriodChange = (val: string) => {
    setFilterPeriod(val);
    if (val === 'custom') {
      setTempStartDate(customStartDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setTempEndDate(customEndDate || new Date().toISOString().split('T')[0]);
      setIsRangeModalOpen(true);
    }
  };

  const handleCancelModal = () => {
    setIsRangeModalOpen(false);
    if (!customStartDate || !customEndDate) {
      setFilterPeriod('all');
    }
  };

  const handleConfirmModal = () => {
    if (tempStartDate && tempEndDate && tempStartDate > tempEndDate) {
      return;
    }
    setCustomStartDate(tempStartDate);
    setCustomEndDate(tempEndDate);
    setIsRangeModalOpen(false);
  };

  const isInvalidRange = tempStartDate && tempEndDate && tempStartDate > tempEndDate;

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const planName = getPlanName(session.planId);
      
      // 1. Search term filter
      const matchesSearch = planName.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Plan filter
      const matchesPlan = filterPlanId === 'all' || session.planId === filterPlanId;
      
      // 3. Period filter
      let matchesPeriod = true;
      if (filterPeriod === 'custom') {
        if (customStartDate && customEndDate) {
          const sessionDateStr = session.date.split('T')[0]; // "YYYY-MM-DD"
          matchesPeriod = sessionDateStr >= customStartDate && sessionDateStr <= customEndDate;
        } else {
          matchesPeriod = false; // Custom selected but not set yet
        }
      } else if (filterPeriod !== 'all') {
        const sessionDate = new Date(session.date);
        const now = new Date();
        
        // Zero out times for date calculations
        const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const diffTime = Math.abs(today.getTime() - sessionDay.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (filterPeriod === '7days') {
          matchesPeriod = diffDays <= 7;
        } else if (filterPeriod === '30days') {
          matchesPeriod = diffDays <= 30;
        } else if (filterPeriod === 'thisMonth') {
          matchesPeriod = sessionDate.getMonth() === now.getMonth() && sessionDate.getFullYear() === now.getFullYear();
        } else if (filterPeriod === 'lastMonth') {
          const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          matchesPeriod = sessionDate.getMonth() === lastMonth && sessionDate.getFullYear() === lastMonthYear;
        }
      }
      
      return matchesSearch && matchesPlan && matchesPeriod;
    });
  }, [sessions, plans, searchTerm, filterPlanId, filterPeriod, customStartDate, customEndDate]);

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in duration-300">
      <header className="flex items-center space-x-4">
        <button onClick={onBack} className="btn-icon">
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
        <>
          {/* Filtri e Ricerca */}
          <div className="space-y-3 bg-white/[0.01] p-4 rounded-2xl border border-white/5">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca per nome scheda..."
                className="w-full input-text pl-10"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-white/50 mono-label pl-1">Scheda</label>
                <select
                  value={filterPlanId}
                  onChange={(e) => setFilterPlanId(e.target.value)}
                  className="w-full input-select"
                >
                  <option value="all" className="bg-[#151619]">Tutte le schede</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id} className="bg-[#151619]">{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-white/50 mono-label pl-1">Periodo</label>
                <select
                  value={filterPeriod}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  className="w-full input-select"
                >
                  <option value="all" className="bg-[#151619]">Qualsiasi periodo</option>
                  <option value="7days" className="bg-[#151619]">Ultimi 7 giorni</option>
                  <option value="30days" className="bg-[#151619]">Ultimi 30 giorni</option>
                  <option value="thisMonth" className="bg-[#151619]">Questo mese</option>
                  <option value="lastMonth" className="bg-[#151619]">Mese scorso</option>
                  <option value="custom" className="bg-[#151619]">Personalizza...</option>
                </select>
              </div>
            </div>

            {/* Custom Range Info Badge */}
            {filterPeriod === 'custom' && customStartDate && customEndDate && (
              <div className="flex items-center justify-between text-xs text-white/60 bg-white/5 px-3 py-2 rounded-xl border border-white/5 mt-2">
                <span>Periodo: <strong className="text-accent">{formatRangeDate(customStartDate)}</strong> - <strong className="text-accent">{formatRangeDate(customEndDate)}</strong></span>
                <button
                  onClick={() => {
                    setTempStartDate(customStartDate);
                    setTempEndDate(customEndDate);
                    setIsRangeModalOpen(true);
                  }}
                  className="text-[10px] font-black uppercase text-accent hover:underline"
                >
                  Modifica
                </button>
              </div>
            )}
          </div>

          {filteredSessions.length === 0 ? (
            <div className="p-8 text-center text-white/30 hardware-card border-dashed">
              <p>Nessun allenamento trovato con i filtri selezionati.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map((session) => (
            <motion.div 
              key={session.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="hardware-card overflow-hidden"
            >
              <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center gap-4">
                <div className="flex items-center space-x-3 flex-shrink-0">
                  <div className="bg-accent/20 p-2 rounded text-accent">
                    <Calendar size={16} />
                  </div>
                  <span className="font-bold">{formatDate(session.date)}</span>
                </div>
                <div className="flex items-center space-x-1 min-w-0 justify-end flex-1">
                  <span className="mono-label text-[10px] mr-2 truncate" title={getPlanName(session.planId)}>{getPlanName(session.planId)}</span>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditSession(session);
                      }}
                      className="btn-icon text-white/20 hover:text-accent hover:bg-accent/10"
                      title="Modifica"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="btn-icon text-white/20 hover:text-red-500 hover:bg-red-500/10"
                      title="Elimina"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
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
                                    : planEx?.type === 'bodyweight'
                                      ? (s.weight ? `+${s.weight}${s.unit || session.unitAtTime || 'kg'}×${s.reps}` : `BW×${s.reps}`)
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
        </>
      )}

      {/* Modal Range Date */}
      <Modal
        isOpen={isRangeModalOpen}
        onClose={handleCancelModal}
        title="Intervallo Date"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-white/50 mono-label pl-1">Data Inizio</label>
            <input
              type="date"
              value={tempStartDate}
              onChange={(e) => setTempStartDate(e.target.value)}
              className="w-full input-text text-sm"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-white/50 mono-label pl-1">Data Fine</label>
            <input
              type="date"
              value={tempEndDate}
              onChange={(e) => setTempEndDate(e.target.value)}
              className="w-full input-text text-sm"
            />
          </div>

          {isInvalidRange && (
            <p className="text-xs text-red-500 font-semibold pl-1">
              La data di inizio non può essere successiva alla data di fine.
            </p>
          )}

          <div className="flex space-x-3 pt-2">
            <button
              onClick={handleCancelModal}
              className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 transition-all text-[10px] mono-label font-black uppercase tracking-widest"
            >
              Annulla
            </button>
            <button
              disabled={!tempStartDate || !tempEndDate || isInvalidRange}
              onClick={handleConfirmModal}
              className="flex-1 py-3 rounded-xl bg-accent text-black font-black hover:opacity-90 transition-all text-[10px] mono-label uppercase tracking-widest disabled:opacity-30 disabled:pointer-events-none"
            >
              Conferma
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
