import React from 'react';
import { Search, X, Filter } from 'lucide-react';

export default function ReceivingFilterBoard({ 
  // Text & Date Filters
  searchTerm, setSearchTerm, 
  fromDate, setFromDate, 
  toDate, setToDate, 
  
  // Relational Filters
  customerFilter, setCustomerFilter, customersList = [],
  divisionFilter, setDivisionFilter, divisionsList = [],
  itemFilter, setItemFilter, inventoryList = [],
  
  // Actions
  clearFilters 
}) {

  // Determine if the clear button should be visible
  const hasActiveFilters = 
    searchTerm !== '' || 
    fromDate !== '' || 
    toDate !== '' || 
    customerFilter !== 'All' || 
    divisionFilter !== 'All' || 
    itemFilter !== 'All';

  const inputClass = "w-full px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none transition-all";

  return (
    <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-5 rounded-[2rem] shadow-sm space-y-4">
      
      {/* --- ROW 1: Search & Date Ranges --- */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-[2] min-w-[250px] relative">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Search Database</label>
          <div className="relative">
            <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by ID, Vendor, PO, or Description..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className={`${inputClass} pl-11`}
            />
          </div>
        </div>
        
        <div className="flex-1 min-w-[140px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Received From</label>
          <input 
            type="date" 
            value={fromDate} 
            onChange={(e) => setFromDate(e.target.value)} 
            className={`${inputClass} cursor-pointer`}
          />
        </div>
        
        <div className="flex-1 min-w-[140px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Received To</label>
          <input 
            type="date" 
            value={toDate} 
            onChange={(e) => setToDate(e.target.value)} 
            className={`${inputClass} cursor-pointer`}
          />
        </div>
      </div>

      {/* --- ROW 2: Relational Dropdowns --- */}
      <div className="flex flex-wrap gap-4 items-end pt-1">
        
        <div className="flex-1 min-w-[180px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1 flex items-center gap-1.5">
            <Filter size={10} className="text-brand-gold" /> Customer Filter
          </label>
          <select 
            value={customerFilter} 
            onChange={(e) => setCustomerFilter(e.target.value)} 
            className={`${inputClass} cursor-pointer`}
          >
            <option value="All">All Customers</option>
            {customersList.map(cust => (
              <option key={cust._id} value={cust._id}>{cust.customerName}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1 flex items-center gap-1.5">
            <Filter size={10} className="text-brand-gold" /> Division Filter
          </label>
          <select 
            value={divisionFilter} 
            onChange={(e) => setDivisionFilter(e.target.value)} 
            className={`${inputClass} cursor-pointer`}
            disabled={customerFilter === 'All' && divisionsList.length === 0}
          >
            <option value="All">All Divisions</option>
            {divisionsList.map(div => (
              <option key={div._id} value={div._id}>{div.divisionName}</option>
            ))}
          </select>
        </div>

        <div className="flex-[1.5] min-w-[200px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1 flex items-center gap-1.5">
            <Filter size={10} className="text-brand-gold" /> Asset / Item Code
          </label>
          <select 
            value={itemFilter} 
            onChange={(e) => setItemFilter(e.target.value)} 
            className={`${inputClass} cursor-pointer`}
          >
            <option value="All">All Assets / Items</option>
            {inventoryList.map(inv => (
              <option key={inv._id} value={inv._id}>
                {inv.productCode || inv.sku} — {inv.description || inv.itemName}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Button */}
        {hasActiveFilters && (
          <button 
            onClick={clearFilters} 
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors shadow-sm h-[42px] shrink-0"
          >
            <X size={14} /> Clear
          </button>
        )}

      </div>
    </div>
  );
}