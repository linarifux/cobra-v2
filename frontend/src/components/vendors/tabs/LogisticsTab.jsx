import React from 'react';
import { Truck } from 'lucide-react';

export default function LogisticsTab() {
  const carriers = ['UPS Ground', 'FedEx Air'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {carriers.map(c => (
        <div key={c} className="p-4 bg-white/50 rounded-2xl border border-white/50">
          <div className="flex items-center gap-2 mb-2 font-bold"><Truck size={14} /> {c}</div>
          <div className="flex justify-between text-xs text-slate-500">On-Time Rate <span className="font-bold text-emerald-600">99%</span></div>
        </div>
      ))}
    </div>
  );
}