import React from 'react';
import { Search } from 'lucide-react';

export default function LocationFilterBoard({ searchTerm, setSearchTerm, typeFilter, setTypeFilter }) {
  return (
    <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-4 rounded-3xl flex flex-wrap gap-4 items-center shadow-sm">
      <div className="flex-1 min-w-[200px] relative">
        <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search locations, shelves, SKU items, or lot numbers..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all" 
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Type:</span>
        <select 
          value={typeFilter} 
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all cursor-pointer"
        >
          <option value="All">All Storage Types</option>
          <option value="Rack">Rack</option>
          <option value="Shelf">Shelf</option>
          <option value="Floor">Floor</option>
          <option value="Bin">Bin</option>
          <option value="Pallet">Pallet</option>
          <option value="Vault">Vault</option>
        </select>
      </div>
    </div>
  );
}