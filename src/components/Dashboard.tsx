import React, { useState } from 'react';
import { WorkoutPlan, WeightUnit } from '../types';
import { Play, ClipboardList, Plus, History as HistoryIcon, Download, Settings, Settings2, Trash2, Edit2, TrendingUp, Archive, ArchiveRestore, ChevronDown, Folder } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Modal, useModal } from './Modal';

interface DashboardProps {
  plans: WorkoutPlan[];
  unit: WeightUnit;
  onToggleUnit: () => void;
  onStartPlan: (plan: WorkoutPlan) => void;
  onViewPlan?: (plan: WorkoutPlan) => void;
  onModifyPlan?: (plan: WorkoutPlan) => void;
  onDeletePlan: (id: string) => void;
  onAddPlan?: (plan: WorkoutPlan) => void;
  onCreatePlan: () => void;
  onViewHistory: () => void;
  onViewProgress: () => void;
  onManageData: () => void;
  hasActiveSession?: boolean;
  onResumeSession?: () => void;
}

export function Dashboard({ plans, unit, onToggleUnit, onStartPlan, onViewPlan, onModifyPlan, onDeletePlan, onAddPlan, onCreatePlan, onViewHistory, onViewProgress, onManageData, hasActiveSession, onResumeSession }: DashboardProps) {
  const { modalState, closeModal, showAlert, showConfirm } = useModal();
  const [showArchived, setShowArchived] = useState(false);
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [expandedArchivedFolders, setExpandedArchivedFolders] = useState<Record<string, boolean>>({});

  const togglePlanExpansion = (planId: string) => {
    setExpandedPlans(prev => ({
      ...prev,
      [planId]: !prev[planId]
    }));
  };

  const toggleFolderExpansion = (folderName: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  const toggleArchivedFolderExpansion = (folderName: string) => {
    setExpandedArchivedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  const exportPlan = (plan: WorkoutPlan) => {
    const data = { version: '1.0', type: 'single_plan', plan };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan_${plan.name.replace(/\s+/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPlan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.type === 'single_plan' && imported.plan) {
          onAddPlan?.(imported.plan);
          showAlert('Scheda importata', `Scheda "${imported.plan.name}" importata con successo!`, 'success');
        } else {
          showAlert('Formato non valido', 'Il file selezionato non è una scheda valida.', 'warning');
        }
      } catch (err) {
        showAlert('Errore', 'Errore durante la lettura del file JSON.', 'warning');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const activePlans = plans.filter(p => !p.isArchived);
  const archivedPlans = plans.filter(p => p.isArchived);

  // Group active plans by folder
  const groupedPlans = activePlans.reduce((acc, plan) => {
    const folderName = plan.folder?.trim() || '';
    if (!acc[folderName]) {
      acc[folderName] = [];
    }
    acc[folderName].push(plan);
    return acc;
  }, {} as Record<string, WorkoutPlan[]>);

  const noFolderPlans = groupedPlans[''] || [];

  // Group archived plans by folder
  const groupedArchivedPlans = archivedPlans.reduce((acc, plan) => {
    const folderName = plan.folder?.trim() || '';
    if (!acc[folderName]) {
      acc[folderName] = [];
    }
    acc[folderName].push(plan);
    return acc;
  }, {} as Record<string, WorkoutPlan[]>);

  const noFolderArchivedPlans = groupedArchivedPlans[''] || [];
  const archivedFolderNames = Object.keys(groupedArchivedPlans).filter(f => f !== '').sort();
  const renderPlanCard = (plan: WorkoutPlan) => (
    <motion.div
      key={plan.id}
      whileTap={{ scale: 0.98 }}
      className="hardware-card p-4 flex flex-col group bg-white/[0.02]"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-4 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 flex-shrink-0">
            <button
              onClick={() => onViewPlan?.(plan)}
              className="p-2 text-ghost rounded-full transition-all active:scale-90"
              title="Dettagli Scheda"
            >
              <ClipboardList size={20} className="stroke-[2.5]" />
            </button>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-lg leading-tight text-white break-words">{plan.name}</h3>
            <p className="text-[10px] text-white/40 uppercase tracking-tighter mt-0.5">{plan.exercises.length} esercizi</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={() => onStartPlan(plan)}
            className="w-10 h-10 rounded-full bg-transparent text-accent flex items-center justify-center shadow-[0_0_15px_rgba(220,252,4,0.1)] hover:scale-110 hover:bg-accent/10 active:scale-90 transition-all border border-accent"
            title="Inizia Allenamento"
          >
            <Play size={18} fill="currentColor" className="text-accent" />
          </button>
          <button
            onClick={() => togglePlanExpansion(plan.id)}
            className="btn-icon text-white/40 hover:text-white"
            title={expandedPlans[plan.id] ? "Nascondi opzioni" : "Mostra opzioni"}
          >
            <ChevronDown 
              size={18} 
              className={`transform transition-transform duration-300 ${expandedPlans[plan.id] ? 'rotate-180' : ''}`} 
            />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expandedPlans[plan.id] && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex items-center space-x-2 pt-3 border-t border-white/5">
              <button
                onClick={() => onModifyPlan?.(plan)}
                className="btn-icon text-accent hover:bg-accent/20"
                title="Modifica Scheda"
              >
                <Edit2 size={16} className="stroke-[2.5]" />
              </button>
              <button
                onClick={() => exportPlan(plan)}
                className="btn-icon text-accent hover:bg-accent/20"
                title="Esporta Scheda"
              >
                <Download size={16} className="stroke-[2.5]" />
              </button>
              {!plan.folder?.trim() && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddPlan?.({ ...plan, isArchived: true });
                  }}
                  className="btn-icon text-accent/60 hover:text-accent hover:bg-accent/10"
                  title="Archivia Scheda"
                >
                  <Archive size={16} className="stroke-[2.5]" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePlan(plan.id);
                }}
                className="btn-icon text-red-500/30 hover:text-red-500 hover:bg-red-500/10"
                title="Elimina Scheda"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const folderNames = Object.keys(groupedPlans).filter(f => f !== '').sort();

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col space-y-2">
        <div className="flex justify-between items-start">
          <h1 className="text-4xl font-extrabold tracking-tighter uppercase italic">
            No Pain <span className="accent-text">No Gay</span>
          </h1>
          <button
            onClick={onManageData}
            className="btn-icon"
            title="Impostazioni"
          >
            <Settings2 size={20} />
          </button>
        </div>
      </header>

      {hasActiveSession && (
        <button
          onClick={onResumeSession}
          className="w-full btn-secondary py-4 tracking-widest flex items-center justify-center space-x-2"
        >
          <Play size={20} className="fill-current" />
          <span>RIPRENDI ALLENAMENTO IN CORSO</span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onViewHistory}
          className="hardware-card p-4 flex flex-col items-center justify-center space-y-2 hover:bg-accent/10 border-accent/10 hover:border-accent/40 transition-all active:scale-95 group shadow-[0_0_20px_rgba(220,252,4,0.05)]"
        >
          <HistoryIcon size={24} className="text-accent" />
          <span className="mono-label text-accent font-bold text-[10px]">Storia</span>
        </button>
        <button
          onClick={onViewProgress}
          className="hardware-card p-4 flex flex-col items-center justify-center space-y-2 hover:bg-accent/10 border-accent/10 hover:border-accent/40 transition-all active:scale-95 group shadow-[0_0_20px_rgba(220,252,4,0.05)]"
        >
          <TrendingUp size={24} className="text-accent" />
          <span className="mono-label text-accent font-bold text-[10px]">Progressi</span>
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="mono-label">Schede di Allenamento</h2>
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-1 px-3 py-1.5 btn-outline">
              <Download size={12} className="rotate-180 text-accent" />
              <span>IMPORTA</span>
              <input type="file" accept=".json" onChange={handleImportPlan} className="hidden" />
            </label>
            <button
              onClick={onCreatePlan}
              className="flex items-center space-x-1 px-3 py-1.5 btn-outline"
            >
              <Plus size={12} className="text-accent" />
              <span className="text-accent">NUOVA</span>
            </button>
          </div>
        </div>

        {activePlans.length === 0 ? (
          <div className="p-8 border border-dashed border-white/10 rounded-xl text-center text-white/30">
            Nessuna scheda attiva trovata. Creane una per iniziare.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Flat plans (no folder) */}
            {noFolderPlans.map((plan) => renderPlanCard(plan))}

            {/* Grouped folders */}
            {folderNames.map((folderName) => (
              <div key={folderName} className="space-y-2">
                <motion.div
                  onClick={() => toggleFolderExpansion(folderName)}
                  whileTap={{ scale: 0.98 }}
                  className="hardware-card p-4 flex items-center justify-between gap-4 cursor-pointer bg-white/[0.03] border-white/5 hover:border-accent/30 hover:bg-white/[0.05] transition-all"
                >
                  <div className="flex items-center justify-between gap-4 w-full">
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20 flex-shrink-0 text-accent">
                        <Folder size={20} className="fill-accent/10" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg leading-tight text-white break-words">{folderName}</h3>
                        <p className="text-[10px] text-white/40 uppercase tracking-tighter mt-0.5">
                          {groupedPlans[folderName].length} {groupedPlans[folderName].length === 1 ? 'scheda' : 'schede'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showConfirm(
                            'Archivia Cartella',
                            `Sei sicuro di voler archiviare la cartella "${folderName}" e tutte le sue schede?`,
                            () => {
                              groupedPlans[folderName].forEach(plan => {
                                onAddPlan?.({ ...plan, isArchived: true });
                              });
                            }
                          );
                        }}
                        className="btn-icon text-accent hover:bg-accent/20"
                        title="Archivia Cartella"
                      >
                        <Archive size={16} className="stroke-[2.5]" />
                      </button>
                      <ChevronDown
                        size={20}
                        className={`text-white/40 transform transition-transform duration-300 ${expandedFolders[folderName] ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>
                </motion.div>

                <AnimatePresence initial={false}>
                  {expandedFolders[folderName] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden pl-4 border-l border-white/10 space-y-3 pt-1"
                    >
                      {groupedPlans[folderName].map((plan) => renderPlanCard(plan))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}

        {/* Collapsible Archived Plans Section */}
        {archivedPlans.length > 0 && (
          <div className="pt-4 border-t border-white/5">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center space-x-2 text-[10px] mono-label text-white/40 hover:text-white/80 transition-colors uppercase tracking-widest pl-1"
            >
              <Archive size={12} />
              <span>{showArchived ? 'Nascondi Archivio' : `Mostra Archivio (${archivedPlans.length})`}</span>
            </button>

            {showArchived && (
              <div className="space-y-3 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Flat archived plans */}
                {noFolderArchivedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="hardware-card p-4 flex items-center justify-between gap-4 bg-white/[0.01] border-white/5 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <div className="min-w-0">
                      <h4 className="font-bold text-base leading-tight text-white/80 break-words">{plan.name}</h4>
                      <p className="text-[9px] text-white/30 uppercase tracking-tighter mt-1">{plan.exercises.length} esercizi (Archiviata)</p>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() => onAddPlan?.({ ...plan, isArchived: false })}
                        className="btn-icon text-accent hover:bg-accent/20"
                        title="Ripristina Scheda"
                      >
                        <ArchiveRestore size={16} />
                      </button>
                      <button
                        onClick={() => {
                          showConfirm(
                            'Elimina Scheda',
                            `Sei sicuro di voler eliminare DEFINITIVAMENTE la scheda "${plan.name}"? Questa azione è irreversibile.`,
                            () => onDeletePlan(plan.id)
                          );
                        }}
                        className="btn-icon text-red-500/30 hover:text-red-500 hover:bg-red-500/10"
                        title="Elimina Scheda Definitivamente"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Grouped archived folders */}
                {archivedFolderNames.map((folderName) => (
                  <div key={folderName} className="space-y-2 opacity-80 hover:opacity-100 transition-opacity">
                    <motion.div
                      onClick={() => toggleArchivedFolderExpansion(folderName)}
                      whileTap={{ scale: 0.98 }}
                      className="hardware-card p-4 flex items-center justify-between gap-4 cursor-pointer bg-white/[0.02] border-white/5 hover:border-accent/20 transition-all"
                    >
                      <div className="flex items-center space-x-4 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-accent/5 flex items-center justify-center border border-accent/10 flex-shrink-0 text-accent/70">
                          <Folder size={20} className="fill-accent/5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-base leading-tight text-white/80 break-words">{folderName}</h3>
                          <p className="text-[10px] text-white/40 uppercase tracking-tighter mt-0.5">
                            {groupedArchivedPlans[folderName].length} {groupedArchivedPlans[folderName].length === 1 ? 'scheda' : 'schede'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            showConfirm(
                              'Ripristina Cartella',
                              `Sei sicuro di voler ripristinare la cartella "${folderName}" e tutte le sue schede?`,
                              () => {
                                groupedArchivedPlans[folderName].forEach(plan => {
                                  onAddPlan?.({ ...plan, isArchived: false });
                                });
                              }
                            );
                          }}
                          className="btn-icon text-accent hover:bg-accent/20"
                          title="Ripristina Cartella"
                        >
                          <ArchiveRestore size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            showConfirm(
                              'Elimina Cartella',
                              `Sei sicuro di voler eliminare DEFINITIVAMENTE la cartella "${folderName}" e tutte le sue schede? Questa azione è irreversibile.`,
                              () => {
                                groupedArchivedPlans[folderName].forEach(plan => {
                                  onDeletePlan(plan.id);
                                });
                              }
                            );
                          }}
                          className="btn-icon text-red-500/30 hover:text-red-500 hover:bg-red-500/10"
                          title="Elimina Cartella"
                        >
                          <Trash2 size={16} />
                        </button>
                        <ChevronDown
                          size={18}
                          className={`text-white/40 transform transition-transform duration-300 ${expandedArchivedFolders[folderName] ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </motion.div>

                    <AnimatePresence initial={false}>
                      {expandedArchivedFolders[folderName] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="overflow-hidden pl-4 border-l border-white/10 space-y-3 pt-1"
                        >
                          {groupedArchivedPlans[folderName].map((plan) => (
                            <div
                              key={plan.id}
                              className="hardware-card p-4 flex items-center justify-between gap-4 bg-white/[0.01] border-white/5 opacity-80"
                            >
                              <div className="min-w-0">
                                <h4 className="font-bold text-base leading-tight text-white/70 break-words">{plan.name}</h4>
                                <p className="text-[9px] text-white/30 uppercase tracking-tighter mt-1">{plan.exercises.length} esercizi</p>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
