import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

const STANDARD_STATUSES = [
  'New',
  'Pending',
  'Picked',
  'Shipped',
  'Hold',
  'Cancelled',
  'Delivered',
  'Billed',
];

export default function OrderStatusPanel({
  orderStatus,
  setOrderStatus,
  isRushOrder,
  setIsRushOrder,
  isLoading = false,
}) {
  const isCustomStatus =
    orderStatus && !STANDARD_STATUSES.includes(orderStatus);

  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-3xl flex flex-col justify-between min-h-[130px] transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
      <h3 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">
        Order Status
      </h3>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center flex-1 py-4 gap-2 bg-slate-50/50 border border-slate-100 rounded-xl shadow-inner">
          <Loader2 className="animate-spin text-brand-gold" size={20} />
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Loading Status...
          </span>
        </div>
      ) : (
        <div className="mt-auto space-y-2">
          <select
            value={orderStatus}
            onChange={(e) => setOrderStatus(e.target.value)}
            className="w-full bg-white text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 cursor-pointer outline-none focus:border-brand-gold transition-all shadow-sm"
          >
            {isCustomStatus && (
              <option value={orderStatus}>{orderStatus}</option>
            )}
            {STANDARD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <label className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 hover:bg-slate-100 transition-colors shadow-sm w-full">
              <input
                type="checkbox"
                checked={isRushOrder}
                onChange={(e) => setIsRushOrder(e.target.checked)}
                className="accent-red-500 w-3.5 h-3.5 rounded-sm cursor-pointer"
              />
              <span className="text-red-600 flex items-center gap-1 uppercase tracking-widest text-[9px] font-black">
                <AlertTriangle size={12} /> Rush
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}