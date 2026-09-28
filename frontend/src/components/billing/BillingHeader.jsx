import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, Loader2, Plus, DollarSign } from 'lucide-react';

export default function BillingHeader({ 
  filteredCount, 
  totalUnbilled, 
  selectedCount, 
  isProcessing, 
  onBatchProcess, 
  onOpenModal 
}) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col xl:flex-row justify-between items-start gap-6 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-sm">
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          New Charges 
        </h1>
        <p className="text-slate-600 text-sm font-medium">{filteredCount} new charges to be processed</p>
        <p className="text-slate-900 text-sm font-black flex items-center gap-1">
          Total : <span className="text-brand-gold"><DollarSign size={14} className="inline -mt-0.5 -mr-1" />{totalUnbilled.toFixed(2)}</span>
        </p>
      </div>
      
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full xl:w-auto">
        <button className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-brand-gold underline underline-offset-4 decoration-slate-300 hover:decoration-brand-gold transition-all">
          Download Charges <ArrowDownToLine size={14} />
        </button>
        
        <button 
          onClick={() => navigate('/orders?status=Billed')}
          className="text-sm font-semibold text-slate-600 hover:text-brand-gold underline underline-offset-4 decoration-slate-300 hover:decoration-brand-gold transition-all mr-2"
        >
          View billed charges
        </button>
        
        {/* Action Buttons */}
        <button 
          onClick={onBatchProcess}
          disabled={selectedCount === 0 || isProcessing}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
            selectedCount > 0 
              ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20' 
              : 'bg-slate-100 text-slate-400 border border-slate-200/60 cursor-not-allowed'
          }`}
        >
          {isProcessing ? <Loader2 size={14} className="animate-spin" /> : null}
          {selectedCount > 0 ? `Process ${selectedCount} Charges` : 'Select Charges'}
        </button>

        <button 
          onClick={onOpenModal}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
        >
          <Plus size={14} /> Add Charge Type
        </button>
      </div>
    </div>
  );
}