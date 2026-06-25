import React from 'react';
import { Search, X } from 'lucide-react';

export default function ReceivingFilterBoard({ 
  searchTerm, setSearchTerm, 
  fromDate, setFromDate, 
  toDate, setToDate, 
  clearFilters 
}) {
  return (
    <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-4 rounded-[2rem] flex flex-wrap gap-4 items-end shadow-sm">
      <div className="flex-[2] min-w-[200px] relative">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Search Database</label>
        <div className="relative">
          <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by ID, Vendor, Customer, or Item..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-11 pr-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none transition-all" 
          />
        </div>
      </div>
      <div className="flex-1 min-w-[140px]">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Received From</label>
        <input 
          type="date" 
          value={fromDate} 
          onChange={(e) => setFromDate(e.target.value)} 
          className="w-full px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none transition-all cursor-pointer" 
        />
      </div>
      <div className="flex-1 min-w-[140px]">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Received To</label>
        <input 
          type="date" 
          value={toDate} 
          onChange={(e) => setToDate(e.target.value)} 
          className="w-full px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none transition-all cursor-pointer" 
        />
      </div>
      {(searchTerm || fromDate || toDate) && (
        <button onClick={clearFilters} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors">
          <X size={14} /> Clear
        </button>
      )}
    </div>
  );
}