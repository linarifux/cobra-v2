import React, { useRef } from 'react';
import { CalendarClock, Calendar, X } from 'lucide-react';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const formatDisplayDateTime = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput : '';

  const month = MONTHS[d.getMonth()];
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();

  let hours = d.getHours();
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(d.getMinutes()).padStart(2, '0');

  return `${month} ${day}, ${year}, ${hoursStr}:${minutesStr} ${period}`;
};

function DateTimeInput({ label, value, onChange, disabled }) {
  const inputRef = useRef(null);
  const formatted = formatDisplayDateTime(value);

  const openPicker = () => {
    if (disabled || !inputRef.current) return;
    try {
      if (typeof inputRef.current.showPicker === 'function') {
        inputRef.current.showPicker();
      } else {
        inputRef.current.focus();
        inputRef.current.click();
      }
    } catch {
      inputRef.current.focus();
    }
  };

  return (
    <div className="min-w-0">
      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
        {label}
      </label>
      <div
        onClick={openPicker}
        className={`relative w-full bg-white p-3 rounded-xl text-xs font-medium border border-slate-200 focus-within:border-brand-gold shadow-sm transition-all flex items-center justify-between gap-2 ${
          disabled
            ? 'opacity-60 cursor-not-allowed'
            : 'cursor-pointer hover:border-slate-300'
        }`}
      >
        <span
          className={`whitespace-nowrap truncate ${
            formatted ? 'text-slate-800' : 'text-slate-400'
          }`}
          title={formatted || 'Not set yet'}
        >
          {formatted || 'Not set yet'}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {formatted && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              title={`Clear ${label}`}
              className="p-0.5 rounded-full text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X size={12} />
            </button>
          )}
          <Calendar size={14} className="text-slate-400" />
        </div>

        <input
          ref={inputRef}
          type="datetime-local"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          tabIndex={-1}
          aria-label={label}
          className="sr-only"
        />
      </div>
    </div>
  );
}

export default function LifecycleTimestampsPanel({
  createdAt,
  shipmentCreatedAt, setShipmentCreatedAt,
  shippedAt, setShippedAt,
  deliveredAt, setDeliveredAt,
  cancelledAt, setCancelledAt,
  isSaving,
}) {
  const formattedCreatedAt = formatDisplayDateTime(createdAt) || 'Not set yet';

  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] relative z-10">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2 border-b border-white/60 pb-3">
        <CalendarClock size={14} className="text-brand-gold" /> Order Timeline &amp; Lifecycle
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Read-only original order placement date & time */}
        <div className="min-w-0">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
            Order Placed At
          </label>
          <input
            type="text"
            className="w-full bg-slate-100 p-3 rounded-xl text-xs font-medium border border-slate-200 shadow-inner text-slate-500 cursor-not-allowed"
            value={formattedCreatedAt}
            placeholder="Not set yet"
            readOnly
            disabled
          />
        </div>

        <DateTimeInput
          label="Packed / Picked At"
          value={shipmentCreatedAt}
          onChange={setShipmentCreatedAt}
          disabled={isSaving}
        />
        <DateTimeInput
          label="Shipped At"
          value={shippedAt}
          onChange={setShippedAt}
          disabled={isSaving}
        />
        <DateTimeInput
          label="Delivered At"
          value={deliveredAt}
          onChange={setDeliveredAt}
          disabled={isSaving}
        />
        <DateTimeInput
          label="Cancelled At"
          value={cancelledAt}
          onChange={setCancelledAt}
          disabled={isSaving}
        />
      </div>
    </div>
  );
}
