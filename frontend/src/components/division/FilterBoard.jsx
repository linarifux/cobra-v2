import React from 'react';
import { Filter, Search, X } from 'lucide-react';

export default function FilterBoard({ 
  searchQuery, 
  setSearchQuery, 
  statusFilter, 
  setStatusFilter, 
  managerFilter, 
  setManagerFilter, 
  customerFilter,
  setCustomerFilter,
  clearFilters, 
  staffList,
  customersList 
}) {
  const isFiltered = statusFilter !== 'All' || managerFilter !== 'All' || customerFilter !== 'All' || searchQuery !== '';

  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-3xl flex flex-col lg:flex-row items-center gap-4 shadow-sm transition-all duration-300">
      
      {/* Title Label */}
      <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase tracking-widest font-black shrink-0 w-full lg:w-auto px-1 lg:px-0">
        <Filter size={14} className="text-brand-gold" /> Filter Board
      </div>

      {/* Search Input */}
      <div className="relative flex-1 w-full min-w-[200px]">
        <Search size={16} className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
        <input 
          type="text"
          placeholder="Search by division name or internal code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/60 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 font-semibold text-xs transition-all"
        />
      </div>
      
      {/* Filters & Actions */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto">
        
        {/* Customer Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 hidden lg:inline">Customer:</span>
          <select 
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="w-full sm:w-auto bg-white/60 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 font-semibold text-xs cursor-pointer transition-all"
          >
            <option value="All">All Customers</option>
            {customersList.map((cust) => (
              <option key={cust._id} value={cust._id}>{cust.customerName}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto bg-white/60 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 font-semibold text-xs cursor-pointer transition-all"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        
        {/* Clear Filters Button */}
        {isFiltered && (
          <button 
            onClick={clearFilters}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors shadow-sm w-full sm:w-auto shrink-0"
            title="Clear all filters"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>
      
    </div>
  );
}