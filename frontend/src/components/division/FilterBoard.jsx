import React from 'react';
import { Filter, Search } from 'lucide-react';

export default function FilterBoard({ 
  searchQuery, 
  setSearchQuery, 
  statusFilter, 
  setStatusFilter, 
  managerFilter, 
  setManagerFilter, 
  clearFilters, 
  staffList 
}) {
  const isFiltered = statusFilter !== 'All' || managerFilter !== 'All' || searchQuery !== '';

  return (
    <div className="bg-white/30 backdrop-blur-sm border border-slate-200/60 p-4 rounded-2xl flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600">
      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] uppercase tracking-wider font-black shrink-0">
        <Filter size={14} /> Filter Board:
      </div>

      <div className="relative flex items-center min-w-[200px]">
        <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
        <input 
          type="text"
          placeholder="Search name or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-2.5 py-1 text-slate-800 outline-none focus:ring-1 focus:ring-slate-900 font-semibold text-xs h-[28px]"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-slate-400 font-medium">Status:</span>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 outline-none focus:ring-1 focus:ring-slate-900 font-semibold h-[28px]"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-slate-400 font-medium">Manager:</span>
        <select 
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 outline-none focus:ring-1 focus:ring-slate-900 font-semibold h-[28px]"
        >
          <option value="All">All Managers</option>
          {staffList.map((staffMember) => (
            <option key={staffMember.id} value={staffMember.name}>{staffMember.name}</option>
          ))}
        </select>
      </div>
      
      {isFiltered && (
        <button 
          onClick={clearFilters}
          className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 bg-red-50 px-2 py-0.5 rounded-md transition-colors ml-auto"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}