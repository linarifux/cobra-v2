import React from 'react';

export default function AddDivisionForm({ newDivision, setNewDivision, onSubmit, staffList }) {
  return (
    <form 
      onSubmit={onSubmit} 
      className="bg-white/40 backdrop-blur-xl border border-white/60 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-5 items-end animate-in fade-in slide-in-from-top-3 duration-300 shadow-sm"
    >
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5 pl-1">
          Division Name <span className="text-red-400">*</span>
        </label>
        <input 
          type="text" 
          placeholder="e.g. Animal Nutrition"
          value={newDivision.name}
          onChange={e => setNewDivision({...newDivision, name: e.target.value})}
          className="w-full px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all"
          required
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
          className="w-full px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-xs font-mono uppercase font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all"
          required
        />
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="flex-1 w-full">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5 pl-1">
            Division Head / Manager
          </label>
          <select 
            value={newDivision.manager}
            onChange={e => setNewDivision({...newDivision, manager: e.target.value})}
            className="w-full px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all cursor-pointer"
          >
            <option value="">Select System Staff...</option>
            {staffList.map(member => (
              <option key={member.id} value={member.name}>{member.name}</option>
            ))}
          </select>
        </div>
        
        <button 
          type="submit" 
          className="w-full sm:w-auto px-8 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] uppercase rounded-xl tracking-widest shrink-0 transition-colors shadow-md"
        >
          Save
        </button>
      </div>
    </form>
  );
}