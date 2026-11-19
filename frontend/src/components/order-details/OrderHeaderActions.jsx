import React from 'react';
import { ArrowLeft, Trash2, Ban, Printer, Save, CloudUpload, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OrderHeaderActions({
  orderStatus,
  isSaving,
  isDeleting,
  isCancellingOrder,
  isGeneratingDocs,
  isShipmentCreated,
  isLabelPurchased,
  handleDeleteOrder,
  handleCancelOrder,
  handlePrintDocsAndPick,
  handleSaveOrder,
  setCreateShipmentModalOpen,
  setFulfillOpen
}) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between bg-white/30 p-3 rounded-2xl border border-white/50 backdrop-blur-xl transition-all duration-300 gap-4 shadow-sm">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors duration-200 shrink-0">
        <ArrowLeft size={16} /> <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Back to Orders</span>
      </button>
      <div className="flex gap-2 shrink-0">
        <button 
          onClick={handleDeleteOrder}
          disabled={isSaving || isDeleting || isCancellingOrder}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-xl text-[11px] font-black shadow-sm hover:bg-slate-100 hover:text-slate-700 transition-all duration-200 disabled:opacity-70"
        >
          {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
        </button>
        
        {orderStatus !== 'Cancelled' && (
           <button 
             onClick={handleCancelOrder}
             disabled={isSaving || isDeleting || isCancellingOrder}
             className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-[11px] font-black shadow-sm hover:bg-red-100 transition-all duration-200 disabled:opacity-70"
           >
             {isCancellingOrder ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />} Cancel Order
           </button>
        )}

        <div className="w-px h-6 bg-slate-300/60 mx-1"></div>

        <button 
          onClick={handlePrintDocsAndPick}
          disabled={isGeneratingDocs || isSaving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[11px] font-black shadow-lg transition-all duration-200 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-70"
        >
          {isGeneratingDocs ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />} Print & Pick
        </button>

        <button 
          onClick={handleSaveOrder}
          disabled={isSaving || isDeleting}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[11px] font-black shadow-lg hover:bg-slate-800 transition-all duration-200 disabled:opacity-70"
        >
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Changes
        </button>

        {orderStatus === 'Picked' && (
          <button 
            onClick={() => setCreateShipmentModalOpen(true)}
            disabled={isShipmentCreated || isSaving}
            title={isShipmentCreated ? "Shipment already created in ShipStation." : ""}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[11px] font-black shadow-lg transition-all duration-200 ${isShipmentCreated ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-600/20 hover:scale-105'}`}
          >
            <CloudUpload size={14} /> Create Shipment
          </button>
        )}

        <button 
          onClick={() => setFulfillOpen(true)}
          disabled={!isShipmentCreated}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[11px] font-black shadow-lg transition-all duration-200 ${!isShipmentCreated ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-brand-gold text-white shadow-brand-gold/20 hover:scale-105'}`}
        >
          <CheckCircle2 size={14} /> {isLabelPurchased ? 'View Label' : 'Generate Label'}
        </button>
      </div>
    </div>
  );
}