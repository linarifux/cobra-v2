import React, { useState } from 'react';
import { Truck, Weight, AlertTriangle, Edit2, Check, ExternalLink } from 'lucide-react';

const generateTrackingLink = (carrier, trackingNumber) => {
  if (!trackingNumber) return '#';
  const c = (carrier || '').toLowerCase().replace(/\s+/g, '');
  if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  if (c.includes('usps')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  if (c.includes('dhl')) return `https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`;
  return `https://www.google.com/search?q=track+package+${trackingNumber}`;
};

export default function ShippingPanel({ 
  shipping, setShipping, 
  cartoonsCount, setCartoonsCount, 
  palletsCount, setPalletsCount, 
  packages, totalItemWeightOz, 
  isWeightMismatched, orderStatus 
}) {
  const [editingLogistics, setEditingLogistics] = useState(false);

  return (
    <>
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-3xl flex flex-col justify-between min-h-[130px] transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
         <div className="flex justify-between items-center mb-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Truck size={14}/> Shipping Method</h3>
          <button onClick={() => setEditingLogistics(!editingLogistics)} className="text-slate-400 hover:text-brand-gold transition-colors duration-200 shrink-0 bg-white/50 p-1.5 rounded-md border border-slate-100">
              {editingLogistics ? <Check size={12} className="text-emerald-600"/> : <Edit2 size={12}/>}
          </button>
         </div>
         
         {editingLogistics ? (
             <div className="space-y-2 mt-auto">
                 <input className="w-full bg-white p-2 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={shipping.carrierType} onChange={(e) => setShipping({...shipping, carrierType: e.target.value})} placeholder="Carrier (e.g. UPS)" />
                 <input className="w-full bg-white p-2 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={shipping.serviceCode} onChange={(e) => setShipping({...shipping, serviceCode: e.target.value})} placeholder="Service Code" />
                 <input className="w-full bg-white p-2 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={shipping.trackingNumber} onChange={(e) => setShipping({...shipping, trackingNumber: e.target.value})} placeholder="Tracking Number" />
                 <input type="number" className="w-full bg-white p-2 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={shipping.shippingCost} onChange={(e) => setShipping({...shipping, shippingCost: e.target.value})} placeholder="Shipping Cost ($)" />
                 
                 <div className="grid grid-cols-2 gap-2">
                   <input type="number" className="w-full bg-white p-2 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={cartoonsCount} onChange={(e) => setCartoonsCount(e.target.value)} placeholder="Cartons" title="Cartons" />
                   <input type="number" className="w-full bg-white p-2 rounded-lg text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm" value={palletsCount} onChange={(e) => setPalletsCount(e.target.value)} placeholder="Pallets" title="Pallets" />
                 </div>
             </div>
         ) : (
             <div className="text-sm font-bold text-slate-900 min-w-0 flex flex-col justify-between h-full mt-auto">
                 <div>
                   <p className="truncate text-slate-800 tracking-tight">{shipping.carrierType || 'No Carrier'} {shipping.serviceCode && `- ${shipping.serviceCode}`}</p>
                   <p className="text-slate-400 font-medium text-xs mt-1 border-b border-slate-100 pb-2">Cost: ${Number(shipping.shippingCost).toFixed(2)}</p>
                 </div>
                 
                 {orderStatus === 'Shipped' && shipping.trackingNumber ? (
                    <div className="mt-2">
                       <a 
                         href={generateTrackingLink(shipping.carrierType, shipping.trackingNumber)}
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="inline-flex items-center justify-between w-full text-blue-600 hover:text-blue-800 text-[10px] font-mono bg-blue-50/50 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors border border-blue-100"
                       >
                         <span className="truncate">{shipping.trackingNumber}</span>
                         <ExternalLink size={12} className="shrink-0 ml-2" />
                       </a>
                    </div>
                 ) : (
                    shipping.trackingNumber && orderStatus !== 'Shipped' && (
                       <p className="text-slate-400 text-[10px] break-all font-mono mt-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                         Tracking: {shipping.trackingNumber}
                       </p>
                    )
                 )}
             </div>
         )}
      </div>

      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-3xl flex flex-col justify-between min-h-[130px] transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
         <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center justify-between">
           <span className="flex items-center gap-1.5"><Weight size={14}/> Shipment Metrics</span>
           {isWeightMismatched && <AlertTriangle size={12} className="text-amber-500" title="Item weight and package weight do not match" />}
         </h3>
         <div className="text-xs font-bold text-slate-900 mt-auto grid grid-cols-5 gap-2 divide-x divide-slate-200/60">
             <div className="col-span-2">
               <p className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                 {Math.floor(totalItemWeightOz / 16)} <span className="text-[9px] font-bold text-slate-400 mr-1">lb</span>
                 {+(totalItemWeightOz % 16).toFixed(1)} <span className="text-[9px] font-bold text-slate-400">oz</span>
               </p>
               <p className="text-slate-400 text-[8px] font-bold mt-0.5 uppercase tracking-wider">Total Wgt</p>
             </div>
             <div className="pl-2 sm:pl-2">
               <p className="text-lg sm:text-xl font-black text-slate-800 tracking-tight truncate">{packages.length}</p>
               <p className="text-slate-400 text-[8px] font-bold mt-0.5 uppercase tracking-wider">Boxes</p>
             </div>
             <div className="pl-2 sm:pl-2">
               <p className="text-lg sm:text-xl font-black text-slate-800 tracking-tight truncate">{cartoonsCount}</p>
               <p className="text-slate-400 text-[8px] font-bold mt-0.5 uppercase tracking-wider">Cartons</p>
             </div>
             <div className="pl-2 sm:pl-2">
               <p className="text-lg sm:text-xl font-black text-slate-800 tracking-tight truncate">{palletsCount}</p>
               <p className="text-slate-400 text-[8px] font-bold mt-0.5 uppercase tracking-wider">Pallets</p>
             </div>
          </div>
      </div>
    </>
  );
}