import React from 'react';
import { CreditCard, Scale, Database } from 'lucide-react';

export default function InvoicePanel({ currentOrder, shipping, setShipping }) {
  // STRICTLY Pull from Database (currentOrder)
  const dbWeightOz = currentOrder?.shippingDetails?.totalWeightOunces || 0;
  const displayLbs = (dbWeightOz / 16).toFixed(2);

  // If backend provides subtotal/totalAmount, use them. Otherwise, calculate strictly from DB items array.
  const dbSubtotal = currentOrder?.subtotal ?? (currentOrder?.items || []).reduce((acc, item) => acc + (Number(item.unitPrice || 0) * Number(item.quantity || 0)), 0);
  const dbProcessingFees = currentOrder?.processingFees?.totalProcessingFee || 0;
  const dbShippingCost = currentOrder?.shippingDetails?.shippingCost || 0;
  
  // Tax might be stored or computed based on DB subtotal
  const dbTax = currentOrder?.tax ?? (dbSubtotal * 0.08);

  const dbGrandTotal = currentOrder?.totalAmount ?? (dbSubtotal + dbProcessingFees + dbShippingCost + dbTax);

  return (
    <div className="bg-slate-950 text-white p-6 rounded-3xl shadow-xl border border-slate-900 relative z-10 overflow-hidden">
       <div className="absolute -right-8 -top-8 w-32 h-32 bg-brand-gold/10 rounded-full blur-2xl pointer-events-none"></div>
       <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3 relative z-10">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
               <CreditCard size={14}/> Invoice Summary
           </h3>
           <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
               <Database size={10} /> Live DB Data
           </span>
       </div>
       
       <div className="text-sm font-medium space-y-3 relative z-10 text-slate-300">
         
         {/* Live Operational Weight from DB */}
         <div className="flex justify-between items-center mb-1">
             <span className="flex items-center gap-1.5"><Scale size={14} className="text-slate-400" /> Op. Weight</span> 
             <span className="font-mono text-white text-xs">{displayLbs} LBS</span>
         </div>

         <div className="flex justify-between"><span>Items Subtotal</span> <span className="font-mono text-white">${(dbSubtotal || 0).toFixed(2)}</span></div>
         
         {/* Display Live Processing Fees from DB */}
         <div className="flex justify-between"><span>Processing Fees</span> <span className="font-mono text-white">${(dbProcessingFees || 0).toFixed(2)}</span></div>
         
         <div className="flex justify-between items-center">
             <span>Shipping Cost</span> 
             <div className="flex items-center border border-white/20 rounded-lg overflow-hidden bg-white/5 w-24 transition-colors focus-within:border-brand-gold/50 focus-within:bg-white/10" title="Updates upon saving the order">
                 <span className="px-2 text-xs text-slate-400">$</span>
                 <input 
                     type="number" 
                     min="0"
                     className="w-full bg-transparent text-white font-mono outline-none py-1 text-right pr-2 text-sm" 
                     value={shipping.shippingCost} 
                     onChange={(e) => setShipping({...shipping, shippingCost: e.target.value})} 
                 />
             </div>
         </div>
         <div className="flex justify-between border-t pt-4 mt-2 border-white/10 text-white items-end">
           <span className="text-xs uppercase tracking-widest font-black text-slate-400">Total Charged</span> 
           <span className="font-mono text-3xl font-black text-brand-gold tracking-tight">${(dbGrandTotal || 0).toFixed(2)}</span>
         </div>
       </div>
    </div>
  );
}