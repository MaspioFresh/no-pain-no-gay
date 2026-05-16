import React from 'react';
import { AppData, AppSettings } from '../types';
import { Download, Upload, Trash2, ArrowLeft, FileJson, Palette, Weight, Scale, ScanLine } from 'lucide-react';
import { Modal, useModal } from './Modal';

interface SettingsViewProps {
  data: AppData;
  onImport: (data: AppData) => void;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  onBack: () => void;
}

const THEME_COLORS = [
  { name: 'Neon Yellow', value: '#dcfc04' },
  { name: 'Neon Green', value: '#4ade80' },
  { name: 'Neon Blue', value: '#3b82f6' },
  { name: 'Neon Purple', value: '#a855f7' },
  { name: 'Neon Orange', value: '#f97316' },
  { name: 'Neon Red', value: '#ef4444' },
];

export function SettingsView({ data, onImport, onUpdateSettings, onBack }: SettingsViewProps) {
  const settings = data.settings;
  const { modalState, closeModal, showAlert, showConfirm } = useModal();

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nopainnogay_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (importedData.plans && importedData.sessions) {
          onImport(importedData);
          showAlert('Dati importati', 'Backup ripristinato con successo!', 'success');
        } else {
          showAlert('Formato non valido', 'Il file JSON selezionato non è un backup valido.', 'warning');
        }
      } catch (err) {
        showAlert('Errore', 'Errore durante la lettura del file JSON.', 'warning');
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    showConfirm(
      'Reset Fabbrica',
      'Sei sicuro di voler cancellare TUTTI i dati? Schede, storico e impostazioni andranno persi definitivamente.',
      () => { localStorage.clear(); window.location.reload(); },
      'Cancella tutto',
      true
    );
  };

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in duration-300 pb-24">
      <header className="flex items-center space-x-4">
        <button onClick={onBack} className="p-2 rounded-full bg-white/5 text-white hover:text-accent hover:bg-accent/10 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold">Impostazioni</h2>
      </header>

      <div className="grid gap-6">

        {/* APP PREFERENCES */}
        <div className="hardware-card p-6 space-y-6">
          <div className="flex items-center space-x-3 mb-2 border-b border-white/5 pb-4">
            <Palette size={24} className="accent-text" />
            <h3 className="font-bold">Preferenze App</h3>
          </div>

          {/* Theme Color */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-white/80">Colore Tema</label>
            <div className="flex flex-wrap gap-3">
              {THEME_COLORS.map(color => (
                <button
                  key={color.value}
                  onClick={() => {
                    onUpdateSettings({ themeColor: color.value });
                    document.documentElement.style.setProperty('--accent', color.value);
                  }}
                  className={`w-10 h-10 rounded-full border-2 transition-all active:scale-90 ${settings.themeColor === color.value ? 'border-white scale-110 shadow-[0_0_15px_currentColor]' : 'border-transparent'}`}
                  style={{ backgroundColor: color.value, color: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Weight Unit */}
          <div className="space-y-3 pt-4 border-t border-white/5">
            <label className="text-sm font-bold text-white/80 flex items-center space-x-2">
              <Scale size={16} className="text-accent" />
              <span>Unità di Misura Globale</span>
            </label>
            <div className="flex p-1 bg-white/5 rounded-xl">
              <button
                onClick={() => onUpdateSettings({ unit: 'kg' })}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${settings.unit === 'kg' ? 'bg-accent text-[#0c0d0e] shadow-[0_0_15px_rgba(220,252,4,0.2)]' : 'text-white/40 hover:text-white'}`}
              >
                KG
              </button>
              <button
                onClick={() => onUpdateSettings({ unit: 'lb' })}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${settings.unit === 'lb' ? 'bg-accent text-[#0c0d0e] shadow-[0_0_15px_rgba(220,252,4,0.2)]' : 'text-white/40 hover:text-white'}`}
              >
                LB
              </button>
            </div>
          </div>

          {/* Weight Entry Mode */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <label className="text-sm font-bold text-white/80 flex items-center space-x-2">
              <Weight size={16} className="text-accent" />
              <span>Modalità Inserimento Peso</span>
            </label>
            <p className="text-xs text-white/40 leading-relaxed">
              <strong className="text-white/60">Peso Totale:</strong> inserisci il peso complessivo sollevato.<br />
              <strong className="text-white/60">Peso a Lato:</strong> inserisci il carico di un singolo disco/manubrio — l'app raddoppia automaticamente nello storico.
            </p>

            {/* Barbell */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs text-white/60 font-bold uppercase tracking-widest">
                <span>🏋️</span><span>Bilanciere</span>
              </div>
              <div className="flex p-1 bg-white/5 rounded-xl">
                <button
                  onClick={() => onUpdateSettings({ barbellMode: 'total' })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${settings.barbellMode === 'total' || !settings.barbellMode ? 'bg-accent text-[#0c0d0e] shadow-[0_0_15px_rgba(220,252,4,0.2)]' : 'text-white/40 hover:text-white'}`}
                >
                  PESO TOTALE
                </button>
                <button
                  onClick={() => onUpdateSettings({ barbellMode: 'perSide' })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${settings.barbellMode === 'perSide' ? 'bg-accent text-[#0c0d0e] shadow-[0_0_15px_rgba(220,252,4,0.2)]' : 'text-white/40 hover:text-white'}`}
                >
                  PESO A LATO
                </button>
              </div>
            </div>

            {/* Dumbbell */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs text-white/60 font-bold uppercase tracking-widest">
                <span>💪</span><span>Manubri</span>
              </div>
              <div className="flex p-1 bg-white/5 rounded-xl">
                <button
                  onClick={() => onUpdateSettings({ dumbbellMode: 'total' })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${settings.dumbbellMode === 'total' || !settings.dumbbellMode ? 'bg-accent text-[#0c0d0e] shadow-[0_0_15px_rgba(220,252,4,0.2)]' : 'text-white/40 hover:text-white'}`}
                >
                  PESO TOTALE
                </button>
                <button
                  onClick={() => onUpdateSettings({ dumbbellMode: 'perSide' })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${settings.dumbbellMode === 'perSide' ? 'bg-accent text-[#0c0d0e] shadow-[0_0_15px_rgba(220,252,4,0.2)]' : 'text-white/40 hover:text-white'}`}
                >
                  PESO A LATO
                </button>
              </div>
            </div>

            {/* Plate Loaded Machine */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs text-white/60 font-bold uppercase tracking-widest">
                <span>💿</span><span>Macchinario con Dischi</span>
              </div>
              <div className="flex p-1 bg-white/5 rounded-xl">
                <button
                  onClick={() => onUpdateSettings({ plateLoadedMode: 'total' })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${settings.plateLoadedMode === 'total' || !settings.plateLoadedMode ? 'bg-accent text-[#0c0d0e] shadow-[0_0_15px_rgba(220,252,4,0.2)]' : 'text-white/40 hover:text-white'}`}
                >
                  PESO TOTALE
                </button>
                <button
                  onClick={() => onUpdateSettings({ plateLoadedMode: 'perSide' })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${settings.plateLoadedMode === 'perSide' ? 'bg-accent text-[#0c0d0e] shadow-[0_0_15px_rgba(220,252,4,0.2)]' : 'text-white/40 hover:text-white'}`}
                >
                  PESO A LATO
                </button>
              </div>
            </div>

            {/* Default Focus Mode */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <label className="text-sm font-bold text-white/80 flex items-center space-x-2">
                <ScanLine size={18} className="text-white/40" />
                <span>Modalità Focus di Default</span>
              </label>
              <div className="flex p-1 bg-white/5 rounded-xl">
                <button
                  onClick={() => onUpdateSettings({ defaultFocusMode: true })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${settings.defaultFocusMode ? 'bg-accent text-[#0c0d0e] shadow-[0_0_15px_rgba(220,252,4,0.2)]' : 'text-white/40 hover:text-white'}`}
                >
                  ATTIVA
                </button>
                <button
                  onClick={() => onUpdateSettings({ defaultFocusMode: false })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!settings.defaultFocusMode ? 'bg-accent text-[#0c0d0e] shadow-[0_0_15px_rgba(220,252,4,0.2)]' : 'text-white/40 hover:text-white'}`}
                >
                  DISATTIVA
                </button>
              </div>

              <p className="text-[10px] text-white/40 leading-relaxed">
                Se attivo, gli allenamenti inizieranno mostrando un solo esercizio alla volta per favorire la concentrazione.
              </p>
            </div>
          </div>

        </div>

        {/* DATA MANAGEMENT */}
        <div className="hardware-card p-6 space-y-4">
          <div className="flex items-center space-x-3 mb-2 border-b border-white/5 pb-4">
            <FileJson size={24} className="accent-text" />
            <h3 className="font-bold">Gestione Dati</h3>
          </div>

          <div className="space-y-3">
            <button
              onClick={exportData}
              className="w-full py-3 rounded-lg bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all flex items-center justify-center space-x-2 active:scale-95 shadow-[0_0_15px_rgba(220,252,4,0.1)]"
            >
              <Download size={18} className="stroke-[3]" />
              <span className="mono-label font-bold">Esporta Backup (JSON)</span>
            </button>

            <label className="w-full py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95">
              <Upload size={18} />
              <span className="mono-label font-bold">Importa Backup</span>
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </div>

        {/* DANGER ZONE */}
        <div className="hardware-card p-6 space-y-4 border-red-500/20">
          <div className="flex items-center space-x-3 mb-2">
            <Trash2 size={24} className="text-red-500" />
            <h3 className="font-bold text-red-500">Pericolo</h3>
          </div>
          <p className="text-xs text-white/60">
            Cancellazione totale di tutti i dati memorizzati nel dispositivo.
          </p>
          <button
            onClick={clearAllData}
            className="w-full py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all flex items-center justify-center space-x-2"
          >
            <Trash2 size={18} />
            <span className="mono-label">Reset Fabbrica</span>
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
