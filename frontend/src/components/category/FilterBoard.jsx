import React from 'react';
import { Filter, X } from 'lucide-react';

export default function FilterBoard({ 
  apiCustomers = [],
  customerFilter,
  setCustomerFilter,
  divisions = [], 
  divisionFilter, 
  setDivisionFilter, 
  levelFilter, 
  setLevelFilter 
}) {
  const isFiltered = customerFilter !== 'All' || divisionFilter !== 'All' || levelFilter !== 'All';

  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-3xl flex flex-col lg:flex-row items-center gap-4 shadow-sm transition-all duration-300">
      
      {/* Title Label */}
      <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase tracking-widest font-black shrink-0 w-full lg:w-auto px-1 lg:px-0">
        <Filter size={14} className="text-brand-gold" /> Filter Board
      </div>
      
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto flex-1">
        
        {/* Customer Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 lg:flex-none">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 hidden sm:inline">Customer:</span>
          <select 
            value={customerFilter}
            onChange={(e) => {
              setCustomerFilter(e.target.value);
              setDivisionFilter('All'); // Reset division when customer changes
            }}
            className="w-full sm:w-auto min-w-[150px] bg-white/60 border border-slate-200 rounded-xl px-3 py-2 text-brand-gold outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 font-black text-xs cursor-pointer transition-all"
          >
            <option value="All">All Customers</option>
            {apiCustomers.map((cust) => (
              <option key={cust._id} value={cust._id}>{cust.customerName}</option>
            ))}
          </select>
        </div>

        {/* Division Filter (Driven by Customer) */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 lg:flex-none">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 hidden sm:inline">Division:</span>
          <select 
            value={divisionFilter}
            onChange={(e) => {
              setDivisionFilter(e.target.value);
              setLevelFilter('All'); // Reset level when division changes
            }}
            disabled={customerFilter !== 'All' && divisions.length === 0}
            className="w-full sm:w-auto min-w-[200px] bg-white/60 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 font-semibold text-xs cursor-pointer transition-all disabled:opacity-50"
          >
            <option value="All">All Divisions</option>
            {divisions.map((div, idx) => <option key={idx} value={div}>{div}</option>)}
          </select>
        </div>

        {/* Hierarchy Level Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 lg:flex-none">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 hidden sm:inline">Level:</span>
          <select 
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            disabled={divisionFilter === 'All'}
            className="w-full sm:w-auto min-w-[120px] bg-white/60 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 font-semibold text-xs cursor-pointer transition-all disabled:opacity-50"
          >
            <option value="All">All Levels</option>
            {[1, 2, 3, 4].map(l => <option key={l} value={l}>Level {l}</option>)}
          </select>
        </div>
        
        {/* Clear Filters Action */}
        {isFiltered && (
          <button 
            onClick={() => { setCustomerFilter('All'); setDivisionFilter('All'); setLevelFilter('All'); }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors shadow-sm w-full sm:w-auto shrink-0 lg:ml-auto"
            title="Clear all active filters"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>
      
    </div>
  );
}