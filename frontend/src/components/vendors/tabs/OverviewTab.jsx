import React from 'react';
import { TrendingUp, DollarSign, Package } from 'lucide-react';

export default function OverviewTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-6 bg-white/50 rounded-2xl border border-white/50">
        <h3 className="text-[10px] font-black uppercase text-slate-400 mb-2">Performance Score</h3>
        <div className="flex items-center gap-2 text-emerald-600 font-black text-3xl">
          <TrendingUp /> 98.4%
        </div>
      </div>
      <div className="p-6 bg-white/50 rounded-2xl border border-white/50">
        <h3 className="text-[10px] font-black uppercase text-slate-400 mb-2">Total Spend (YTD)</h3>
        <div className="flex items-center gap-2 text-slate-900 font-black text-3xl">
          <DollarSign /> $42,500
        </div>
      </div>
    </div>
  );
}