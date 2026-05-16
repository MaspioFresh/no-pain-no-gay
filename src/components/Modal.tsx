import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'ghost';
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  icon?: 'info' | 'warning' | 'success';
  actions?: ModalAction[];
  children?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, message, icon = 'info', actions, children }: ModalProps) {
  const IconComponent = icon === 'warning' ? AlertTriangle : icon === 'success' ? CheckCircle : Info;
  const iconColor = icon === 'warning' ? 'text-red-500' : icon === 'success' ? 'text-accent' : 'text-accent';
  const iconGlow = icon === 'warning' ? 'shadow-[0_0_30px_rgba(239,68,68,0.15)]' : 'shadow-[0_0_30px_rgba(220,252,4,0.1)]';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`fixed left-4 right-4 top-1/2 -translate-y-1/2 z-[101] max-w-sm mx-auto hardware-card p-6 flex flex-col space-y-5 ${iconGlow}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl bg-white/5 ${iconColor}`}>
                  <IconComponent size={20} />
                </div>
                <h3 className="font-black text-base tracking-tight">{title}</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            {children ? (
              <div className="flex-1">{children}</div>
            ) : (
              <>
                {message && <p className="text-sm text-white/60 leading-relaxed">{message}</p>}
                
                {/* Actions */}
                {actions && actions.length > 0 && (
                  <div className="flex flex-col space-y-2">
                    {actions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => { action.onClick(); onClose(); }}
                        className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all active:scale-95 border ${
                          action.variant === 'danger'
                            ? 'border-red-500 text-red-500 bg-transparent hover:bg-red-500/10'
                            : action.variant === 'ghost'
                            ? 'border-white/10 text-white/40 bg-transparent hover:bg-white/5'
                            : 'border-accent text-[#0c0d0e] bg-accent shadow-[0_0_20px_rgba(220,252,4,0.2)] hover:bg-accent/90'
                        }`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook per usare il modal facilmente
interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  icon?: 'info' | 'warning' | 'success';
  actions?: ModalAction[];
}

export function useModal() {
  const [state, setState] = React.useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
  });

  const showModal = (opts: Omit<ModalState, 'isOpen'>) => {
    setState({ ...opts, isOpen: true });
  };

  const closeModal = () => {
    setState(prev => ({ ...prev, isOpen: false }));
  };

  // Shorthand: show an alert-style modal (single OK button)
  const showAlert = (title: string, message: string, icon?: 'info' | 'warning' | 'success') => {
    showModal({
      title,
      message,
      icon: icon || 'info',
      actions: [{ label: 'OK', onClick: () => {}, variant: 'primary' }],
    });
  };

  // Shorthand: show a confirm-style modal
  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmLabel = 'Conferma', dangerConfirm = false) => {
    showModal({
      title,
      message,
      icon: dangerConfirm ? 'warning' : 'info',
      actions: [
        {
          label: confirmLabel,
          onClick: onConfirm,
          variant: dangerConfirm ? 'danger' : 'primary',
        },
        { label: 'Annulla', onClick: () => {}, variant: 'ghost' },
      ],
    });
  };

  return { modalState: state, showModal, closeModal, showAlert, showConfirm };
}
