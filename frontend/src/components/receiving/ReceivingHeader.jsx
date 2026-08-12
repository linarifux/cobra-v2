import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, Download, Plus, Store } from 'lucide-react';

export default function ReceivingHeader({ exportToCSV, openNewModal }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
      
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <ArrowRightLeft className="text-brand-gold" size={24} /> Receiving Logs
        </h1>
        <p className="text-slate-500 font-medium mt-1 text-sm">Manage and confirm inbound shipments.</p>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
        <button 
          onClick={() => navigate('/vendors')}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-white/60 hover:bg-white border border-slate-200 text-slate-600 hover:text-brand-gold rounded-xl text-xs font-black uppercase tracking-widest shadow-sm transition-all backdrop-blur-md active:scale-95"
        >
          <Store size={16} /> <span className="hidden sm:inline">Manage</span> Vendors
        </button>
        
        <button 
          onClick={exportToCSV} 
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-black text-slate-700 shadow-sm transition-all active:scale-95 uppercase tracking-widest"
        >
          <Download size={16} /> Export
        </button>
        
        <button 
          onClick={openNewModal} 
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-brand-gold rounded-xl text-xs font-black shadow-lg shadow-slate-900/20 transition-all active:scale-95 uppercase tracking-widest"
        >
          <Plus size={16} /> Add Receipt
        </button>
      </div>
      
    </div>
  );
}