import React from 'react';
import { Plus, X, Layers } from 'lucide-react';

export default function CategoryHeader({ showAddForm, onToggleForm }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200/60 pb-4 gap-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Layers className="text-slate-800" size={24} /> Categories
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Define, edit, and organize system product taxonomy hierarchies mapped to operating divisions.</p>
      </div>
      <button 
        onClick={onToggleForm}
        className="flex items-center gap-1.5 px-4 py-2 bg-slate-990 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm shrink-0"
      >
        {showAddForm ? <X size={14} /> : <Plus size={14} />} 
        {showAddForm ? 'Cancel Form' : 'Add Category'}
      </button>
    </div>
  );
}