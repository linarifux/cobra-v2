import React from 'react';
import { PlusCircle, Check, X, Loader2 } from 'lucide-react';

export default function CategoryForm({ 
  formData, 
  setFormData, 
  apiCustomers = [],
  divisions = [], 
  categories = [], 
  editingId, 
  onSave, 
  onCancel,
  isSubmitting 
}) {
  return (
    <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 items-end shadow-sm animate-in fade-in slide-in-from-top-3 duration-300">
      
      {/* 1. Customer Assignment */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block pl-1">
          Customer <span className="text-red-400">*</span>
        </label>
        <select 
          className="w-full bg-white/60 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-brand-gold outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 cursor-pointer transition-all disabled:opacity-50" 
          value={formData.customer} 
          onChange={(e) => setFormData({...formData, customer: e.target.value, division: '', parent: 'None'})}
          disabled={isSubmitting}
        >
          <option value="" disabled>Select Customer...</option>
          {apiCustomers.map((cust) => (
            <option key={cust._id} value={cust._id}>{cust.customerName}</option>
          ))}
        </select>
      </div>

      {/* 2. Assigned Division (Filtered by Customer) */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block pl-1">
          Division Branch <span className="text-red-400">*</span>
        </label>
        <select 
          className="w-full bg-white/60 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 cursor-pointer transition-all disabled:opacity-50" 
          value={formData.division} 
          onChange={(e) => setFormData({...formData, division: e.target.value, parent: 'None'})}
          disabled={isSubmitting || !formData.customer || divisions.length === 0}
        >
          {divisions.length === 0 ? (
            <option value="">No divisions found...</option>
          ) : (
            <>
              {divisions.map((div) => (
                <option key={div._id} value={div._id}>{div.divisionName}</option>
              ))}
            </>
          )}
        </select>
      </div>

      {/* 3. Category Name */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block pl-1">
          Category Name <span className="text-red-400">*</span>
        </label>
        <input 
          className="w-full bg-white/60 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all disabled:opacity-50" 
          value={formData.name} 
          onChange={(e) => setFormData({...formData, name: e.target.value})} 
          placeholder="e.g. Dry Food" 
          disabled={isSubmitting}
        />
      </div>

      {/* 4. Parent Category (Filtered by Division) */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block pl-1">
          Parent Node
        </label>
        <select 
          className="w-full bg-white/60 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 cursor-pointer transition-all disabled:opacity-50" 
          value={formData.parent} 
          onChange={(e) => setFormData({...formData, parent: e.target.value})}
          disabled={isSubmitting || !formData.division}
        >
          <option value="None">None (Top Level)</option>
          {categories
            .filter(c => c._id !== editingId) // Prevent a category from being set as its own parent
            .map(c => (
              <option key={c._id} value={c._id}>
                {c.categoryName} (Lvl {c.hierarchyDepth})
              </option>
          ))}
        </select>
      </div>

      {/* 5. Actions */}
      <div className="flex gap-3 w-full items-end h-[42px]">
        <button 
          onClick={onSave} 
          disabled={isSubmitting || !formData.name || !formData.division}
          className="flex-1 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-70 h-full"
        >
           {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : (editingId ? <Check size={14}/> : <PlusCircle size={14} />)} 
           {editingId ? 'Save' : 'Add Node'}
        </button>
        
        {editingId && (
          <button 
            onClick={onCancel} 
            disabled={isSubmitting}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-xl transition-all h-full flex items-center justify-center border border-slate-200 shadow-sm disabled:opacity-50"
            title="Cancel Edit"
          >
            <X size={14}/>
          </button>
        )}
      </div>
    </div>
  );
}