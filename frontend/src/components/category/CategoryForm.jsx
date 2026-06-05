import React from 'react';
import { PlusCircle, Check, X } from 'lucide-react';

export default function CategoryForm({ 
  formData, 
  setFormData, 
  divisions, 
  categories, 
  editingId, 
  onSave, 
  onCancel 
}) {
  return (
    <div className="bg-white/60 border border-slate-200/80 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end shadow-sm animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Category Name</label>
        <input 
          className="w-full bg-white p-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-slate-900" 
          value={formData.name} 
          onChange={(e) => setFormData({...formData, name: e.target.value})} 
          placeholder="e.g. Dry Food" 
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Level</label>
        <select 
          className="w-full bg-white p-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-slate-900 h-[38px]" 
          value={formData.level} 
          onChange={(e) => setFormData({...formData, level: parseInt(e.target.value)})}
        >
          {[1, 2, 3, 4].map(l => <option key={l} value={l}>Level {l}</option>)}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Parent Category</label>
        <select 
          className="w-full bg-white p-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-slate-900 h-[38px]" 
          value={formData.parent} 
          onChange={(e) => setFormData({...formData, parent: e.target.value})}
        >
          <option value="None">None (Root)</option>
          {categories.filter(c => c.id !== editingId).map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Assigned Division</label>
        <select 
          className="w-full bg-white p-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-slate-900 h-[38px]" 
          value={formData.division} 
          onChange={(e) => setFormData({...formData, division: e.target.value})}
        >
          {divisions.map((div, index) => (
            <option key={index} value={div}>{div}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 w-full">
        <button 
          onClick={onSave} 
          className="flex-1 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 h-[38px]"
        >
           {editingId ? <Check size={14}/> : <PlusCircle size={14} />} 
           {editingId ? 'Save Changes' : 'Save'}
        </button>
        {editingId && (
          <button 
            onClick={onCancel} 
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl transition-all h-[38px] flex items-center justify-center border border-slate-200"
            title="Cancel Edit"
          >
            <X size={14}/>
          </button>
        )}
      </div>
    </div>
  );
}