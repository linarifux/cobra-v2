import React from 'react';
import { 
  LayoutList, 
  Sparkles, 
  Clock, 
  PackageCheck, 
  Truck, 
  PauseCircle, 
  XCircle, 
  CheckCircle2, 
  Receipt 
} from 'lucide-react';

const STATUSES = [
  { name: 'All Statuses', value: 'All', icon: LayoutList },
  { name: 'New', value: 'New', icon: Sparkles },
  { name: 'Pending', value: 'Pending', icon: Clock },
  { name: 'Picked', value: 'Picked', icon: PackageCheck },
  { name: 'Shipped', value: 'Shipped', icon: Truck },
  { name: 'Hold', value: 'Hold', icon: PauseCircle },
  { name: 'Cancelled', value: 'Cancelled', icon: XCircle },
  { name: 'Delivered', value: 'Delivered', icon: CheckCircle2 },
  { name: 'Billed', value: 'Billed', icon: Receipt },
];

export default function OrdersSidebar({ activeStatus, onStatusChange, statusCounts = {} }) {
  return (
    <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[2rem] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] h-full">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">
          Filter by Status
        </h3>
        
        <ul className="space-y-1.5">
          {STATUSES.map((status) => {
            const isActive = activeStatus === status.value;
            const Icon = status.icon;
            const count = statusCounts[status.value] || 0;
            
            return (
              <li key={status.value}>
                <button
                  onClick={() => onStatusChange(status.value)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-900 text-brand-gold shadow-md'
                      : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 border border-transparent hover:border-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} className={isActive ? 'text-brand-gold' : 'text-slate-400'} />
                    <span className="text-sm font-bold tracking-tight">{status.name}</span>
                  </div>
                  
                  {/* Notification Count Badge */}
                  <span className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-colors ${
                    isActive 
                      ? 'bg-brand-gold/20 text-brand-gold' 
                      : count > 0 
                        ? 'bg-slate-200/60 text-slate-500' 
                        : 'bg-transparent text-slate-300'
                  }`}>
                    {count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}