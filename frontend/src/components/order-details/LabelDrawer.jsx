import React from 'react';
import { PackageCheck, X, MapPin, Loader2, CheckCircle2, Printer, Trash2 } from 'lucide-react';

export default function LabelDrawer({
  fulfillOpen, setFulfillOpen, fulfillmentData, setFulfillmentData, 
  warehouses, isLoadingWarehouses, isLabelPurchased, isShipmentCreated, 
  handleGenerateLabel, isGeneratingLabel, handleCancelShipment, isCancellingShipment, 
  handlePrintPurchasedLabel, isDownloadingLabel, handleVoidLabel, isVoidingLabel
}) {
  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${fulfillOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setFulfillOpen(false)} />
      <div className={`relative w-full max-w-[400px] bg-white/95 backdrop-blur-2xl border-l border-white/50 p-6 shadow-2xl h-full overflow-y-auto transition-transform duration-300 ease-in-out flex flex-col ${fulfillOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-black uppercase tracking-wider text-sm text-slate-800 flex items-center gap-2">
              <PackageCheck size={18} className="text-brand-gold"/> Generate Shipping Label
            </h2>
          </div>
          <button onClick={() => setFulfillOpen(false)} className="text-slate-500 hover:text-slate-900 bg-slate-100 p-1.5 rounded-full transition-colors"><X size={16}/></button>
        </div>
        
        <div className="space-y-5 flex-1">
          
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60 shadow-sm">
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block flex items-center gap-1.5">
              <MapPin size={12}/> Origin Warehouse
            </label>
            {isLoadingWarehouses ? (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 p-2 border border-slate-100 rounded-lg bg-white/50">
                <Loader2 size={14} className="animate-spin text-brand-gold"/> Loading locations...
              </div>
            ) : (
              <select
                value={fulfillmentData.shipFromId}
                onChange={(e) => setFulfillmentData(p => ({ ...p, shipFromId: e.target.value }))}
                className="w-full bg-white p-2.5 rounded-lg text-xs font-bold outline-none border border-slate-200 focus:border-brand-gold shadow-sm transition-all"
              >
                <option value="" disabled>Select a shipping origin...</option>
                {warehouses?.map(wh => (
                  <option key={wh.warehouse_id} value={wh.warehouse_id}>{wh.name}</option>
                ))}
              </select>
            )}
            
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none mt-3">
              <input 
                type="checkbox" 
                checked={fulfillmentData.isResidential}
                onChange={(e) => setFulfillmentData(p => ({...p, isResidential: e.target.checked}))}
                className="accent-brand-gold w-3.5 h-3.5 rounded-sm" 
              /> Residential Destination
            </label>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-200 shrink-0 bg-white/95">
           <div className="space-y-3">
               {!isLabelPurchased ? (
                 <>
                   <button 
                     onClick={handleGenerateLabel}
                     disabled={isGeneratingLabel || !fulfillmentData.shipFromId}
                     className="w-full flex justify-center items-center gap-2 text-white py-3.5 rounded-xl text-xs font-black shadow-md transition-all bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {isGeneratingLabel ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                     Purchase Label
                   </button>
                   {isShipmentCreated && (
                     <button
                       onClick={handleCancelShipment}
                       disabled={isCancellingShipment}
                       className="w-full flex justify-center items-center gap-2 text-red-600 bg-red-50 py-3.5 rounded-xl text-xs font-black shadow-sm border border-red-200 transition-all hover:bg-red-100 disabled:opacity-50"
                     >
                       {isCancellingShipment ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                       Cancel Shipment
                     </button>
                   )}
                 </>
               ) : (
                 <>
                   <button 
                     onClick={handlePrintPurchasedLabel}
                     disabled={isDownloadingLabel}
                     className="w-full flex justify-center items-center gap-2 text-white py-3.5 rounded-xl text-xs font-black shadow-md transition-all bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
                   >
                     {isDownloadingLabel ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                     Download Purchased Label
                   </button>
                   <button
                     onClick={handleVoidLabel}
                     disabled={isVoidingLabel}
                     className="w-full flex justify-center items-center gap-2 text-white bg-red-600 py-3.5 rounded-xl text-xs font-black shadow-md transition-all hover:bg-red-500 disabled:opacity-50"
                   >
                     {isVoidingLabel ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                     Void Label
                   </button>
                 </>
               )}
           </div>
        </div>
      </div>
    </div>
  );
}