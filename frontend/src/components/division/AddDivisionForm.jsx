import React from 'react';

export default function AddDivisionForm({ newDivision, setNewDivision, onSubmit, staffList }) {
  return (
    <form 
      onSubmit={onSubmit} 
      className="bg-white/60 border border-slate-200/80 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 items-end animate-in fade-in slide-in-from-top-3 duration-300 shadow-sm"
    >
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
          Division Name
        </label>
        <input 
          type="text" 
          placeholder="e.g. Animal Nutrition"
          value={newDivision.name}
          onChange={e => setNewDivision({...newDivision, name: e.target.value})}
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-slate-990"
          required
        />
      </div>
      <div>
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
          Internal Code
        </label>
        <input 
          type="text" 
          placeholder="e.g. DIV-ANM"
          value={newDivision.code}
          onChange={e => setNewDivision({...newDivision, code: e.target.value})}
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase font-semibold outline-none focus:ring-2 focus:ring-slate-900"
          required
        />
      </div>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Division Head / Manager
          </label>
          <select 
            value={newDivision.manager}
            onChange={e => setNewDivision({...newDivision, manager: e.target.value})}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-slate-900 h-[34px]"
          >
            <option value="">Select System Staff...</option>
            {staffList.map(member => (
              <option key={member.id} value={member.name}>{member.name}</option>
            ))}
          </select>
        </div>
        <button 
          type="submit" 
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl h-[34px] tracking-wider shrink-0"
        >
          Save
        </button>
      </div>
    </form>
  );
}