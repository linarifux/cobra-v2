import React from 'react';
import { CalendarClock } from 'lucide-react';

export default function LifecycleTimestampsPanel({
  createdAt,
  shipmentCreatedAt, setShipmentCreatedAt,
  shippedAt, setShippedAt,
  deliveredAt, setDeliveredAt,
  cancelledAt, setCancelledAt,
  isSaving
}) {
  const premiumInputClass = "w-full bg-white p-3 rounded-xl text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm transition-all disabled:opacity-60";

  // Helper to strip the time and strictly return YYYY-MM-DD for the date input
  const extractDate = (dateTimeStr) => dateTimeStr ? dateTimeStr.split('T')[0] : '';

  // Reusable component to handle the "Not set yet" placeholder trick
  const DateInput = ({ label, value, onChange }) => (
    <div>
      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
        {label}
      </label>
      <input 
        type={value ? "date" : "text"} 
        placeholder="Not set yet"
        onFocus={(e) => e.target.type = 'date'}
        onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
        className={premiumInputClass}
        value={extractDate(value)} 
        onChange={(e) => onChange(e.target.value)} 
        disabled={isSaving}
      />
    </div>
  );

  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] relative z-10">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2 border-b border-white/60 pb-3">
        <CalendarClock size={14} className="text-brand-gold" /> Order Timeline & Lifecycle
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Read-only original order placement date */}
        <div>
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Order Placed At</label>
          <input 
            type="text" 
            className="w-full bg-slate-100 p-3 rounded-xl text-xs font-medium border border-slate-200 shadow-inner text-slate-500 cursor-not-allowed" 
            value={extractDate(createdAt)} 
            placeholder="Not set yet"
            readOnly
            disabled
          />
        </div>

        <DateInput label="Packed / Picked At" value={shipmentCreatedAt} onChange={setShipmentCreatedAt} />
        <DateInput label="Shipped At" value={shippedAt} onChange={setShippedAt} />
        <DateInput label="Delivered At" value={deliveredAt} onChange={setDeliveredAt} />
        <DateInput label="Cancelled At" value={cancelledAt} onChange={setCancelledAt} />
      </div>
    </div>
  );
}