import React from 'react';
import { Loader2 } from 'lucide-react';

export default function AddDivisionForm({ newDivision, setNewDivision, onSubmit, staffList, customersList, isSubmitting }) {
  return (
    <form 
      onSubmit={onSubmit} 
      className="bg-white/40 backdrop-blur-xl border border-white/60 p-6 rounded-3xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-end animate-in fade-in slide-in-from-top-3 duration-300 shadow-sm"
    >
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5 pl-1">
          Assigned Customer <span className="text-red-400">*</span>
        </label>
        <select 
          value={newDivision.customer}
          onChange={e => setNewDivision({...newDivision, customer: e.target.value})}
          className="w-full px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all cursor-pointer disabled:opacity-50"
          required
          disabled={isSubmitting}
        >
          {customersList.map(cust => (
            <option key={cust._id} value={cust._id}>{cust.customerName}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5 pl-1">
          Division Name <span className="text-red-400">*</span>
        </label>
        <input 
          type="text" 
          placeholder="e.g. Animal Nutrition"
          value={newDivision.name}
          onChange={e => setNewDivision({...newDivision, name: e.target.value})}
          className="w-full px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all disabled:opacity-50"
          required
          disabled={isSubmitting}
        />
      </div>
      
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5 pl-1">
          Internal Code <span className="text-red-400">*</span>
        </label>
        <input 
          type="text" 
          placeholder="e.g. DIV-ANM"
          value={newDivision.code}
          onChange={e => setNewDivision({...newDivision, code: e.target.value})}
          className="w-full px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-xs font-mono uppercase font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all disabled:opacity-50"
          required
          disabled={isSubmitting}
        />
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="flex-1 w-full">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5 pl-1">
            Division Head
          </label>
          <select 
            value={newDivision.manager}
            onChange={e => setNewDivision({...newDivision, manager: e.target.value})}
            className="w-full px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all cursor-pointer disabled:opacity-50"
            disabled={isSubmitting}
          >
            <option value="">Unassigned</option>
            {staffList.map(member => (
              <option key={member.id} value={member.name}>{member.name}</option>
            ))}
          </select>
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full sm:w-auto px-8 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] uppercase rounded-xl tracking-widest shrink-0 transition-colors shadow-md disabled:opacity-70 flex justify-center items-center h-[42px]"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
        </button>
      </div>
    </form>
  );
}