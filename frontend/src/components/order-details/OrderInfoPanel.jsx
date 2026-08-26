import React from 'react';
import { Briefcase, AlertTriangle, Globe, User, Clock } from 'lucide-react';

export default function OrderInfoPanel({ currentOrder, isRushOrder, isInternational, orderCreatorName, creationDate }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white/40 border border-white/60 p-5 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl">
      <div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Order Reference</span>
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-slate-900 tracking-tight">{currentOrder.orderNumber}</span>
          
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black tracking-widest shadow-sm transition-all duration-300">
            {currentOrder.orderType || 'WEBORD'}
          </span>

          {currentOrder.chargeCode && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border border-amber-200 text-amber-800 rounded-lg text-[10px] font-black tracking-widest shadow-sm transition-all duration-300">
              <Briefcase size={12} /> {currentOrder.chargeCode}
            </span>
          )}
          {isRushOrder && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 border border-red-200 text-red-800 rounded-lg text-[10px] font-black tracking-widest shadow-sm transition-all duration-300">
              <AlertTriangle size={12} /> RUSH
            </span>
          )}
          {isInternational && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 border border-blue-200 text-blue-800 rounded-lg text-[10px] font-black tracking-widest shadow-sm transition-all duration-300">
              <Globe size={12} /> INTL
            </span>
          )}
        </div>
        {orderCreatorName && (
          <p className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1.5">
            <User size={12} className="text-brand-gold" /> Order Placed by {orderCreatorName}
          </p>
        )}
      </div>
      <span className="px-3 py-1.5 text-[10px] uppercase font-black tracking-widest bg-slate-900 text-white rounded-lg shadow-md flex items-center gap-1.5">
        <Clock size={12} /> {creationDate}
      </span>
    </div>
  );
}