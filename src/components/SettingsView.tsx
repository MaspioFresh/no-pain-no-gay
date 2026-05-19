import React from 'react';
import { AppData, AppSettings } from '../types';
import { Download, Upload, Trash2, ArrowLeft, FileJson, Palette, Weight, Scale, ScanLine, Bell } from 'lucide-react';
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

  const [notificationPermission, setNotificationPermission] = React.useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );

  const requestNotificationPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
        if (permission === 'granted') {
          try {
            const iconUrl = new URL('/no-pain-no-gay/pwa-192x192.png', window.location.origin).href;
            new Notification('No Pain No Gay', {
              body: 'Notifiche attivate con successo!',
              icon: iconUrl
            });
          } catch (e) {
            console.error('Notification constructor failed, using fallback', e);
          }
        }
      });
    }
  };

  const testNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const iconUrl = new URL('/no-pain-no-gay/pwa-192x192.png', window.location.origin).href;
      const title = 'No Pain No Gay';
      const options = {
        body: 'Questo è un test delle notifiche del timer!',
        icon: iconUrl,
        tag: 'rest-timer',
        renotify: true,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        silent: false
      };

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, options);
        }).catch(() => {
          new Notification(title, options);
        });
      } else {
        new Notification(title, options);
      }
    }
  };

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
        <button onClick={onBack} className="btn-icon">
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
                    const COMPLEMENTARY_COLORS: Record<string, string> = {
                      '#dcfc04': '#a855f7', // Yellow -> Purple
                      '#4ade80': '#ec4899', // Green -> Pink
                      '#3b82f6': '#f97316', // Blue -> Orange
                      '#a855f7': '#dcfc04', // Purple -> Yellow
                      '#f97316': '#3b82f6', // Orange -> Blue
                      '#ef4444': '#06b6d4', // Red -> Cyan
                    };
                    const complementary = COMPLEMENTARY_COLORS[color.value] || '#a855f7';
                    document.documentElement.style.setProperty('--accent-complementary', complementary);
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

            {/* Notifications */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <label className="text-sm font-bold text-white/80 flex items-center space-x-2">
                <Bell size={16} className="text-accent" />
                <span>Notifiche del Timer</span>
              </label>
              {typeof window !== 'undefined' && 'Notification' in window ? (
                <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                  <div className="text-xs text-white/60">
                    Stato: {notificationPermission === 'granted' ? (
                      <span className="text-green-400 font-bold">Attive</span>
                    ) : notificationPermission === 'denied' ? (
                      <span className="text-red-400 font-bold">Bloccate (controlla le impostazioni del browser)</span>
                    ) : (
                      <span>Non autorizzate</span>
                    )}
                  </div>
                  {notificationPermission !== 'granted' && notificationPermission !== 'denied' && (
                    <button
                      onClick={requestNotificationPermission}
                      className="px-3 py-1.5 text-xs font-bold bg-accent text-[#0c0d0e] rounded-lg shadow-[0_0_10px_rgba(220,252,4,0.2)] active:scale-95 transition-all cursor-pointer"
                    >
                      ATTIVA
                    </button>
                  )}
                  {notificationPermission === 'granted' && (
                    <button
                      onClick={testNotification}
                      className="px-3 py-1.5 text-xs font-bold bg-white/10 text-white rounded-lg active:scale-95 transition-all hover:bg-white/20 cursor-pointer"
                    >
                      TEST
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-white/40 leading-relaxed">
                  Le notifiche non sono supportate da questo browser/dispositivo.
                </p>
              )}
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
              className="w-full btn-secondary"
            >
              <Download size={18} className="stroke-[3]" />
              <span className="mono-label font-bold">Esporta Backup (JSON)</span>
            </button>

            <label className="w-full btn-ghost text-white hover:text-white hover:bg-white/10 flex items-center justify-center space-x-2">
              <Upload size={18} />
              <span className="mono-label font-bold text-white">Importa Backup</span>
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
            className="w-full btn-danger"
          >
            <Trash2 size={18} className="stroke-[3]" />
            <span className="uppercase tracking-widest font-black text-sm">Reset Fabbrica</span>
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
