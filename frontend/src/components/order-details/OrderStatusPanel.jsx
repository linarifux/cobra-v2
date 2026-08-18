import React from 'react';
import { AlertTriangle, Globe } from 'lucide-react';

export default function OrderStatusPanel({ orderStatus, setOrderStatus, isRushOrder, setIsRushOrder, isInternational, setIsInternational }) {
  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-3xl flex flex-col justify-between min-h-[130px] transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
       <h3 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Order Status</h3>
       <div className="mt-auto space-y-2">
         <select 
           value={orderStatus} 
           onChange={(e) => setOrderStatus(e.target.value)} 
           className="w-full bg-white text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 cursor-pointer outline-none focus:border-brand-gold transition-all shadow-sm"
          >
              <option value="New">New</option>
              <option value="Pending">Pending</option>
              <option value="Picked">Picked</option>
              <option value="Shipped">Shipped</option>
              <option value="Hold">Hold</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Delivered">Delivered</option>
              <option value="Billed">Billed</option>
          </select>
          
          <div className="flex gap-2">
            <label className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 hover:bg-slate-100 transition-colors shadow-sm">
              <input 
                type="checkbox" 
                checked={isRushOrder}
                onChange={(e) => setIsRushOrder(e.target.checked)}
                className="accent-red-500 w-3.5 h-3.5 rounded-sm cursor-pointer" 
              /> 
              <span className="text-red-600 flex items-center gap-1 uppercase tracking-widest text-[9px] font-black">
                <AlertTriangle size={12}/> Rush
              </span>
            </label>
            <label className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 hover:bg-slate-100 transition-colors shadow-sm">
              <input 
                type="checkbox" 
                checked={isInternational}
                onChange={(e) => setIsInternational(e.target.checked)}
                className="accent-blue-600 w-3.5 h-3.5 rounded-sm cursor-pointer" 
              /> 
              <span className="text-blue-600 flex items-center gap-1 uppercase tracking-widest text-[9px] font-black">
                <Globe size={12}/> Intl
              </span>
            </label>
          </div>
       </div>
    </div>
  );
}