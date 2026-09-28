import React from 'react';
import { Calendar, CheckCircle2 } from 'lucide-react';

export default function BillingFilters({
  customers,
  customerFilter,
  setCustomerFilter,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  applyCartonFee,
  setApplyCartonFee
}) {
  const inputClass = "w-full bg-white/60 border border-slate-200 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400";
  const labelClass = "text-xs font-bold text-slate-700 mb-1.5 block";

  return (
    <div className="flex flex-wrap items-end gap-6 px-2">
      <div className="w-full sm:w-64">
        <label className={labelClass}>Customer</label>
        <select 
          value={customerFilter} 
          onChange={e => setCustomerFilter(e.target.value)}
          className={`${inputClass} cursor-pointer appearance-none`}
        >
          <option value="">All Customers</option>
          {customers.map(c => (
            <option key={c._id} value={c._id}>{c.customerName}</option>
          ))}
        </select>
      </div>
      
      <div className="w-full sm:w-48">
        <label className={labelClass}>From Date</label>
        <div className="relative">
          <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input 
            type="date" 
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className={inputClass} 
          />
        </div>
      </div>
      
      <div className="w-full sm:w-48">
        <label className={labelClass}>To Date</label>
        <div className="relative">
          <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input 
            type="date" 
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className={inputClass} 
          />
        </div>
      </div>

      <div className="flex items-center h-[38px]">
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className="relative flex items-center justify-center">
            <input 
              type="checkbox" 
              checked={applyCartonFee}
              onChange={e => setApplyCartonFee(e.target.checked)}
              className="peer appearance-none w-[18px] h-[18px] border-[1.5px] border-slate-300 rounded bg-white checked:bg-brand-gold checked:border-brand-gold transition-all cursor-pointer"
            />
            <CheckCircle2 size={12} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
          </div>
          <span className="text-xs font-bold text-slate-700 select-none">
            Carton Fee Applied Only
          </span>
        </label>
      </div>
    </div>
  );
}