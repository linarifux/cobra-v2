import React from 'react';
import { ArrowRightLeft, Download, Plus } from 'lucide-react';

export default function ReceivingHeader({ exportToCSV, openNewModal }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <ArrowRightLeft className="text-brand-gold" size={24} /> Receiving Logs
        </h1>
        <p className="text-slate-500 font-medium mt-1">Manage and confirm inbound shipments.</p>
      </div>
      <div className="flex gap-3">
        <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-black text-slate-700 shadow-sm transition-all active:scale-95 uppercase tracking-wider">
          <Download size={16} /> Export
        </button>
        <button onClick={openNewModal} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-brand-gold rounded-xl text-sm font-black shadow-lg shadow-slate-900/20 transition-all active:scale-95 uppercase tracking-wider">
          <Plus size={16} /> Add Receipt
        </button>
      </div>
    </div>
  );
}