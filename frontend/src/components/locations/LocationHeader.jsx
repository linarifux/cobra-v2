import React from 'react';
import { Plus } from 'lucide-react';

export default function LocationHeader({ openAddModal }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Warehouse Locations</h1>
        <p className="text-slate-500 font-medium">Manage storage zones, dynamic item placements, and batch lots.</p>
      </div>
      <button 
        onClick={openAddModal}
        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-brand-gold rounded-xl text-sm font-black shadow-xl shadow-slate-900/20 transition-all active:scale-95"
      >
        <Plus size={16} /> New Location
      </button>
    </div>
  );
}