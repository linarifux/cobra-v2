import React from 'react';
import { Search, Filter, X } from 'lucide-react';

export default function InventoryFilterBar({ 
  search, setSearch, 
  customerFilter, setCustomerFilter,
  divisionFilter, setDivisionFilter, 
  categoryFilter, setCategoryFilter, 
  onlyAvailable, setOnlyAvailable, 
  apiCustomers, 
  apiDivisions, 
  apiCategories, 
  onClearFilters 
}) {
  // Added customerFilter to the clear logic check
  const hasActiveFilters = customerFilter !== 'All' || divisionFilter !== 'All' || categoryFilter !== 'All' || onlyAvailable || search !== '';

  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-3xl flex flex-wrap gap-4 items-center text-xs font-bold text-slate-600 shadow-sm">
      <div className="flex items-center gap-1 text-slate-500 text-[11px] uppercase tracking-wider font-black shrink-0">
        <Filter size={14} className="text-brand-gold" /> Filter Matrix:
      </div>

      <div className="flex-1 min-w-[200px] relative">
        <Search className="absolute left-3 top-2 text-slate-400" size={14} />
        <input 
          placeholder="Search code, description, or accounts..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/60 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-slate-900 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 font-semibold"
        />
      </div>

      {/* NEW: Customer Dropdown */}
      <div className="flex items-center gap-1.5">
        <span className="text-slate-400 font-medium">Customer:</span>
        <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className="bg-white/60 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 font-semibold">
          <option value="All">All Customers</option>
          {apiCustomers.map(c => <option key={c._id} value={c._id}>{c.customerName}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-slate-400 font-medium">Division:</span>
        <select value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value)} className="bg-white/60 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 font-semibold">
          <option value="All">All Divisions</option>
          {apiDivisions.map(d => <option key={d._id} value={d._id}>{d.divisionName}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-slate-400 font-medium">Category:</span>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-white/60 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 font-semibold">
          <option value="All">All Categories</option>
          {apiCategories.map(c => <option key={c._id} value={c._id}>{c.categoryName}</option>)}
        </select>
      </div>

      <label className="flex items-center gap-2 text-[11px] font-black uppercase text-slate-500 cursor-pointer select-none ml-2">
        <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} className="rounded text-brand-gold focus:ring-0 w-3.5 h-3.5 accent-brand-gold" />
        In Stock Only
      </label>

      {hasActiveFilters && (
        <button 
          onClick={onClearFilters}
          className="flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors ml-auto"
        >
          <X size={12} /> Reset
        </button>
      )}
    </div>
  );
}