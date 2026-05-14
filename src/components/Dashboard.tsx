import React from 'react';
import { WorkoutPlan, WeightUnit } from '../types';
import { Play, ClipboardList, Plus, History as HistoryIcon, Download, Settings, Settings2, Trash2, Edit2, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
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

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col space-y-2">
        <div className="flex justify-between items-start">
          <h1 className="text-4xl font-extrabold tracking-tighter uppercase italic">
            No Pain <span className="accent-text">No Gay</span>
          </h1>
          <button
            onClick={onManageData}
            className="p-2 bg-white/5 rounded-full border border-white/10 text-white hover:text-accent hover:border-accent/40 hover:bg-accent/10 transition-all active:scale-90"
            title="Impostazioni"
          >
            <Settings2 size={20} />
          </button>
        </div>
      </header>

      {hasActiveSession && (
        <button
          onClick={onResumeSession}
          className="w-full py-4 bg-accent/20 text-accent font-black rounded-xl shadow-[0_0_20px_rgba(220,252,4,0.2)] border border-accent hover:bg-accent/30 active:scale-95 transition-all tracking-widest flex items-center justify-center space-x-2"
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
            <label className="flex items-center space-x-1 px-3 py-1.5 bg-transparent text-accent rounded-full font-bold text-[10px] shadow-[0_0_15px_rgba(220,252,4,0.1)] hover:bg-accent/10 active:scale-95 transition-all border border-accent">
              <Download size={12} className="rotate-180 text-accent" />
              <span>IMPORTA</span>
              <input type="file" accept=".json" onChange={handleImportPlan} className="hidden" />
            </label>
            <button
              onClick={onCreatePlan}
              className="flex items-center space-x-1 px-3 py-1.5 bg-transparent text-accent rounded-full font-bold text-[10px] shadow-[0_0_15px_rgba(220,252,4,0.1)] hover:bg-accent/10 active:scale-95 transition-all border border-accent"
            >
              <Plus size={12} className="text-accent" />
              <span className="text-accent">NUOVA</span>
            </button>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="p-8 border border-dashed border-white/10 rounded-xl text-center text-white/30">
            Nessuna scheda trovata. Creane una per iniziare.
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => (
              <motion.div
                key={plan.id}
                whileTap={{ scale: 0.98 }}
                className="hardware-card p-4 flex items-center justify-between group bg-white/[0.02]"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                    <button
                      onClick={() => onViewPlan?.(plan)}
                      className="p-2 text-ghost rounded-full transition-all active:scale-90"
                      title="Dettagli Scheda"
                    >
                      <ClipboardList size={20} className="stroke-[2.5]" />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-none mb-1">{plan.name}</h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-tighter">{plan.exercises.length} esercizi</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onModifyPlan?.(plan)}
                    className="p-2 text-accent hover:bg-accent/20 rounded-full transition-all active:scale-90"
                    title="Modifica Scheda"
                  >
                    <Edit2 size={14} className="stroke-[2.5]" />
                  </button>
                  <button
                    onClick={() => exportPlan(plan)}
                    className="p-2 text-accent hover:bg-accent/20 rounded-full transition-all active:scale-90"
                    title="Esporta Scheda"
                  >
                    <Download size={14} className="stroke-[2.5]" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePlan(plan.id);
                    }}
                    className="p-2 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all active:scale-90"
                    title="Elimina Scheda"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => onStartPlan(plan)}
                    className="w-10 h-10 rounded-full bg-transparent text-accent flex items-center justify-center shadow-[0_0_15px_rgba(220,252,4,0.1)] hover:scale-110 hover:bg-accent/10 active:scale-90 transition-all ml-1 group border border-accent"
                  >
                    <Play size={18} fill="currentColor" className="text-accent" />
                  </button>
                </div>
              </motion.div>
            ))}
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
