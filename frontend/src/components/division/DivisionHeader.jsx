import React from 'react';
import { Layers, Plus } from 'lucide-react';

export default function DivisionHeader({ showAddForm, setShowAddForm }) {
  return (
    <div className="flex justify-between items-center border-b border-slate-200/60 pb-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Layers size={24} className="text-slate-800" /> Divisions
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage operational organizational units, inventory holdings, and active category depths.
        </p>
      </div>
      <button 
        onClick={() => setShowAddForm(!showAddForm)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
      >
        <Plus size={14} /> {showAddForm ? 'Cancel' : 'Add Division'}
      </button>
    </div>
  );
}