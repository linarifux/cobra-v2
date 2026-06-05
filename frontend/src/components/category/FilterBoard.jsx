import React from 'react';
import { Filter } from 'lucide-react';

export default function FilterBoard({ 
  divisions, 
  divisionFilter, 
  setDivisionFilter, 
  levelFilter, 
  setLevelFilter 
}) {
  return (
    <div className="bg-white/30 backdrop-blur-sm border border-slate-200/60 p-4 rounded-2xl flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600">
      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] uppercase tracking-wider font-black shrink-0">
        <Filter size={14} /> Filter Board:
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-slate-400 font-medium">Division:</span>
        <select 
          value={divisionFilter}
          onChange={(e) => setDivisionFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 outline-none focus:ring-1 focus:ring-slate-900 font-semibold"
        >
          <option value="All">All Divisions</option>
          {divisions.map((div, idx) => <option key={idx} value={div}>{div}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-slate-400 font-medium">Hierarchy Level:</span>
        <select 
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 outline-none focus:ring-1 focus:ring-slate-900 font-semibold"
        >
          <option value="All">All Levels</option>
          {[1, 2, 3, 4].map(l => <option key={l} value={l}>Level {l}</option>)}
        </select>
      </div>
      
      {(divisionFilter !== 'All' || levelFilter !== 'All') && (
        <button 
          onClick={() => { setDivisionFilter('All'); setLevelFilter('All'); }}
          className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 bg-red-50 px-2 py-0.5 rounded-md transition-colors ml-auto"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}