import React from 'react';
import { MessageSquare, Calculator, Info } from 'lucide-react';

const FeeRow = ({ label, sourceField, value, isZero }) => {
  return (
    <div className={`flex justify-between items-center py-2 border-b border-slate-100/50 last:border-0 ${isZero ? 'opacity-40' : 'opacity-100'}`}>
        <div className="flex flex-col pr-4">
           <span className="text-[11px] font-bold text-slate-800">{label}</span>
           <span className="text-[9px] font-medium text-slate-400 mt-0.5 tracking-wide leading-tight">{sourceField}</span>
        </div>
        <span className="font-mono text-xs font-black text-slate-700">${Number(value || 0).toFixed(2)}</span>
    </div>
  );
};

export default function NotesAndFeesPanel({ notes, setNotes, currentOrder, processingFeesPreview }) {
  // Safely extract the live fees
  const pfp = processingFeesPreview || {};
  const total = pfp.totalProcessingFee || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Order Notes */}
      <div className="bg-amber-50/80 border border-amber-200/60 p-6 rounded-3xl shadow-sm backdrop-blur-xl relative z-10 flex flex-col min-h-[300px]">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-800 mb-3 flex items-center gap-2">
          <MessageSquare size={14}/> Order Notes
        </h3>
        <textarea 
          value={notes} 
          onChange={(e) => setNotes(e.target.value)}
          className="flex-1 w-full bg-white border border-amber-200/60 rounded-xl p-4 text-xs font-medium text-slate-700 focus:border-amber-400 outline-none resize-none shadow-inner"
          placeholder="Add internal notes or customer requests here..."
        />
      </div>

      {/* Processing Fees Breakdown */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] relative z-10 flex flex-col min-h-[300px]">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2 border-b border-white/60 pb-3">
          <Calculator size={14} className="text-brand-gold"/> Processing Fees Breakdown
        </h3>
        
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar pr-2 mb-4">
          <FeeRow 
            label="Base Processing Fee" 
            sourceField="Applied to the 1st 3 line items. Scales up if total weight > 10 lbs." 
            value={pfp.baseFee} 
            isZero={!pfp.baseFee} 
          />
          <FeeRow 
            label="Weight Surcharge" 
            sourceField="Applied per lb if total order weight is > 20 lbs." 
            value={pfp.weightSurcharge} 
            isZero={!pfp.weightSurcharge} 
          />
          <FeeRow 
            label="Line Item Surcharge" 
            sourceField="Applied per line item over 3 items." 
            value={pfp.lineItemSurcharge} 
            isZero={!pfp.lineItemSurcharge} 
          />
          <FeeRow 
            label="Package Surcharge" 
            sourceField="Applied per package over 1 package." 
            value={pfp.packageSurcharge} 
            isZero={!pfp.packageSurcharge} 
          />
          <FeeRow 
            label="Piece Surcharge" 
            sourceField="Applied per total piece/unit count." 
            value={pfp.pieceSurcharge} 
            isZero={!pfp.pieceSurcharge} 
          />
          <FeeRow 
            label="Carton Surcharge" 
            sourceField="Applied per carton used." 
            value={pfp.cartonSurcharge} 
            isZero={!pfp.cartonSurcharge} 
          />
          <FeeRow 
            label="Pallet Processing Fee" 
            sourceField="Applied per pallet used." 
            value={pfp.palletFee} 
            isZero={!pfp.palletFee} 
          />
          <FeeRow 
            label="Rush Surcharge" 
            sourceField="Applied if 'Rush' status toggle is active." 
            value={pfp.rushFee} 
            isZero={!pfp.rushFee} 
          />
          <FeeRow 
            label="International Surcharge" 
            sourceField="Applied if 'Intl' status toggle is active." 
            value={pfp.internationalFee} 
            isZero={!pfp.internationalFee} 
          />
        </div>

        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60 shadow-inner shrink-0">
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest font-black text-slate-500">Total Calculation</span>
              <span className="text-[9px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                <Info size={10} /> Auto-calculated from order attributes
              </span>
            </div>
            <span className="font-mono text-2xl font-black text-brand-gold tracking-tight">
              ${total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}