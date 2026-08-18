// src/components/billing/ChargeTypeModal.jsx

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Tag, Loader2, X, Save, FileText, DollarSign } from 'lucide-react';

// Redux Thunks
import { createChargeType } from '../../store/slices/chargeTypeSlice';

const INITIAL_MODAL_STATE = {
  name: '',
  defaultCharge: '',
  notes: ''
};

export default function ChargeTypeModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_MODAL_STATE);

  const closeModal = () => {
    setFormData(INITIAL_MODAL_STATE);
    onClose();
  };

  const handleSaveChargeType = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Charge Name is required.");
    if (formData.defaultCharge === '') return toast.error("Default Charge is required.");
    
    setIsSubmitting(true);
    
    const payload = {
      ...formData,
      defaultCharge: Number(formData.defaultCharge)
    };

    try {
      await dispatch(createChargeType(payload)).unwrap();
      toast.success("Charge type created successfully.");
      closeModal();
    } catch (err) {
      toast.error(`Error saving charge type: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Common Input Styles
  const inputClass = "w-full bg-slate-50 border border-slate-200 focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all placeholder:font-medium placeholder:text-slate-400";
  const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1 mb-1.5";

  // Prevent SSR crashing and ensure document exists
  if (typeof document === 'undefined') return null;

  // FIX: AnimatePresence must wrap conditional motion components, NOT the portal itself.
  // The Portal must be the outer wrapper to avoid Framer Motion choking on the portal object.
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="charge-type-modal-wrapper"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 h-[100dvh] w-screen overflow-hidden"
        >
          
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={closeModal} 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
          />
          
          {/* Centered Modal Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }} 
            className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200 max-h-[90dvh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-brand-gold/10 text-brand-gold rounded-xl flex items-center justify-center shadow-inner border border-brand-gold/20">
                  <Tag size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Create Charge Type</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Billing Variable</p>
                </div>
              </div>
              <button onClick={closeModal} disabled={isSubmitting} className="h-8 w-8 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-full flex items-center justify-center transition-colors shadow-sm shrink-0">
                <X size={16} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form id="chargeTypeForm" onSubmit={handleSaveChargeType} className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
              
              <div className="flex flex-col gap-5">
                <div>
                  <label className={labelClass}><FileText size={12} /> Charge Name <span className="text-red-400">*</span></label>
                  <input 
                    type="text" 
                    required
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className={inputClass} 
                    placeholder="e.g. Storage Fee, Carton Fee..." 
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className={labelClass}><DollarSign size={12}/> Default Charge Amount <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                    <input 
                      type="number" 
                      required
                      step="0.01"
                      min="0"
                      value={formData.defaultCharge} 
                      onChange={e => setFormData({...formData, defaultCharge: e.target.value})} 
                      className={`${inputClass} pl-11 !text-emerald-700 !bg-emerald-50/30 !border-emerald-200 focus:!ring-emerald-500/20`} 
                      placeholder="0.00" 
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Internal Notes (Optional)</label>
                  <textarea 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                    className={`${inputClass} min-h-[80px] resize-none`} 
                    placeholder="Add any contextual billing notes..." 
                    disabled={isSubmitting}
                  />
                </div>

                
              </div>

            </form>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-white flex gap-3 shrink-0">
              <button type="button" onClick={closeModal} disabled={isSubmitting} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" form="chargeTypeForm" disabled={isSubmitting || !formData.name || formData.defaultCharge === ''} className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Create Charge Type
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}