import React from 'react';
import { AppData } from '../types';
import { Download, Upload, Trash2, ArrowLeft, FileJson } from 'lucide-react';

interface DataManagementProps {
  data: AppData;
  onImport: (data: AppData) => void;
  onBack: () => void;
}

export function DataManagement({ data, onImport, onBack }: DataManagementProps) {
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
        // Basic validation
        if (importedData.plans && importedData.sessions) {
          onImport(importedData);
          alert('Dati importati con successo!');
        } else {
          alert('Formato file JSON non valido.');
        }
      } catch (err) {
        alert('Errore durante la lettura del file JSON.');
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    if (confirm('Sei sicuro di voler cancellare TUTTI i dati? Questa azione è irreversibile.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in duration-300">
      <header className="flex items-center space-x-4">
        <button onClick={onBack} className="p-2 rounded-full bg-white/5 text-white hover:text-accent hover:bg-accent/10 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold">Gestione Dati</h2>
      </header>

      <div className="grid gap-6">
        <div className="hardware-card p-6 space-y-4">
          <div className="flex items-center space-x-3 mb-2">
            <FileJson size={24} className="accent-text" />
            <h3 className="font-bold">Esporta Backup</h3>
          </div>
          <p className="text-sm text-white/60">
            Salva tutti i tuoi allenamenti e le tue schede in un file JSON locale.
          </p>
          <button 
            onClick={exportData}
            className="w-full py-3 rounded-lg bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all flex items-center justify-center space-x-2 active:scale-95 shadow-[0_0_15px_rgba(220,252,4,0.1)]"
          >
            <Download size={18} className="stroke-[3]" />
            <span className="mono-label font-bold">Download JSON</span>
          </button>
        </div>

        <div className="hardware-card p-6 space-y-4">
          <div className="flex items-center space-x-3 mb-2">
            <Upload size={24} className="text-accent" />
            <h3 className="font-bold">Importa Backup</h3>
          </div>
          <p className="text-sm text-white/60">
            Carica un file JSON precedentemente esportato per ripristinare i tuoi dati.
          </p>
          <label className="w-full py-3 rounded-lg bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(220,252,4,0.1)]">
            <Upload size={18} className="stroke-[3]" />
            <span className="mono-label font-bold">Seleziona File JSON</span>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>

        <div className="hardware-card p-6 space-y-4 border-red-500/20">
          <div className="flex items-center space-x-3 mb-2">
            <Trash2 size={24} className="text-red-500" />
            <h3 className="font-bold">Pericolo</h3>
          </div>
          <p className="text-sm text-white/60">
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
    </div>
  );
}
