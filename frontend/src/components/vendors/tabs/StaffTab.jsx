import React from 'react';
import { User, Settings } from 'lucide-react';

export default function StaffTab() {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center p-4 bg-white/50 rounded-xl border border-white/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center"><User size={14} /></div>
          <div>
            <p className="font-bold text-sm">John Doe</p>
            <p className="text-[10px] text-slate-500">Account Manager</p>
          </div>
        </div>
        <button className="text-slate-400 hover:text-slate-900"><Settings size={16} /></button>
      </div>
    </div>
  );
}