import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

const ConfirmContext = createContext();

export const useConfirm = () => {
  return useContext(ConfirmContext);
};

export function ConfirmProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({});
  const [resolver, setResolver] = useState(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfig({
        title: options.title || 'Are you sure?',
        message: options.message || 'This action cannot be undone.',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'danger', // 'danger' | 'warning' | 'info'
      });
      setIsOpen(true);
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolver) resolver(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolver) resolver(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {/* The Global Glassmorphic Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" 
            onClick={handleCancel}
          />
          
          {/* Modal Container */}
          <div className="relative w-full max-w-sm bg-white/90 backdrop-blur-2xl border border-white p-6 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.1)] animate-in zoom-in-95 duration-200">
            
            <button 
              onClick={handleCancel}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border shadow-inner ${
                config.variant === 'danger' ? 'bg-red-50 text-red-500 border-red-100' : 
                config.variant === 'warning' ? 'bg-amber-50 text-amber-500 border-amber-100' : 
                'bg-blue-50 text-blue-500 border-blue-100'
              }`}>
                {config.variant === 'danger' ? <Trash2 size={28} /> : <AlertTriangle size={28} />}
              </div>

              <h2 className="text-lg font-black text-slate-900 tracking-tight">{config.title}</h2>
              <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">
                {config.message}
              </p>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={handleCancel}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                {config.cancelText}
              </button>
              <button 
                onClick={handleConfirm}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-wider text-white shadow-lg transition-all active:scale-95 ${
                  config.variant === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 
                  config.variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 
                  'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'
                }`}
              >
                {config.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}