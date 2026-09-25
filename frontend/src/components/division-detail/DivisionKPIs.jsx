import React from 'react';
import { Package, Users, DollarSign } from 'lucide-react';

export default function DivisionKPIs({ totalAssets, activeStaffCount, totalValuation }) {
  const kpis = [
    { 
      label: 'Total Assets', 
      val: totalAssets.toLocaleString(), 
      icon: <Package size={16} className="text-blue-500" />
    },
    { 
      label: 'Authorized Staff', 
      val: activeStaffCount, 
      icon: <Users size={16} className="text-emerald-500" />
    },
    { 
      label: 'Pool Valuation', 
      val: `$${(totalValuation).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 
      icon: <DollarSign size={16} className="text-brand-gold" />
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {kpis.map((stat, i) => (
        <div key={i} className="bg-white/40 border border-white/60 p-4 rounded-2xl flex items-center justify-between shadow-sm backdrop-blur-sm transition-all duration-300 hover:bg-white/60">
          <div>
            <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-0.5">{stat.label}</p>
            <p className="font-black text-lg text-slate-900">{stat.val}</p>
          </div>
          <div className="p-2 bg-white/60 rounded-xl shadow-sm border border-white/80">
            {stat.icon}
          </div>
        </div>
      ))}
    </div>
  );
}