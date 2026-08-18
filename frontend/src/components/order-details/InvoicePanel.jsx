import React from 'react';
import { CreditCard } from 'lucide-react';

export default function InvoicePanel({ subtotal, shipping, setShipping, tax, grandTotal }) {
  return (
    <div className="bg-slate-950 text-white p-6 rounded-3xl shadow-xl border border-slate-900 relative z-10 overflow-hidden">
       <div className="absolute -right-8 -top-8 w-32 h-32 bg-brand-gold/10 rounded-full blur-2xl pointer-events-none"></div>
       <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4 border-b border-white/10 pb-3 relative z-10">
           <CreditCard size={14}/> Invoice Preview
       </h3>
       <div className="text-sm font-medium space-y-3 relative z-10 text-slate-300">
         <div className="flex justify-between"><span>Subtotal</span> <span className="font-mono text-white">${subtotal.toFixed(2)}</span></div>
         <div className="flex justify-between items-center">
             <span>Shipping Cost</span> 
             <div className="flex items-center border border-white/20 rounded-lg overflow-hidden bg-white/5 w-24">
                 <span className="px-2 text-xs text-slate-400">$</span>
                 <input 
                     type="number" 
                     className="w-full bg-transparent text-white font-mono outline-none py-1 text-right pr-2 text-sm" 
                     value={shipping.shippingCost} 
                     onChange={(e) => setShipping({...shipping, shippingCost: e.target.value})} 
                 />
             </div>
         </div>
         <div className="flex justify-between"><span>Estimated Tax</span> <span className="font-mono text-white">${tax.toFixed(2)}</span></div>
         <div className="flex justify-between border-t pt-4 mt-2 border-white/10 text-white items-end">
           <span className="text-xs uppercase tracking-widest font-black text-slate-400">Total</span> 
           <span className="font-mono text-3xl font-black text-brand-gold tracking-tight">${grandTotal.toFixed(2)}</span>
         </div>
       </div>
    </div>
  );
}