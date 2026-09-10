import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Truck, Weight, AlertTriangle, Edit2, Check, ExternalLink, X, Search, Loader2, Clock, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { fetchRatesByShipmentId, clearShipmentRates } from '../../store/slices/rateSlice';

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
  totalBoxesCount,
  isWeightMismatched, orderStatus,
  carriersData = [],
  setManualBoxesCount, setManualTotalWeightOz, shipmentId
}) {
  const dispatch = useDispatch();
  const { shipmentRates = [], shipmentRatesStatus } = useSelector(state => state.rates || {});

  const [editingLogistics, setEditingLogistics] = useState(false);
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);

  // Local state initialized carefully to respect active prop overrides
  const [localLbs, setLocalLbs] = useState(Math.floor((totalItemWeightOz || 0) / 16));
  const [localOz, setLocalOz] = useState(+((totalItemWeightOz || 0) % 16).toFixed(1));
  const [localBoxes, setLocalBoxes] = useState(totalBoxesCount !== undefined ? totalBoxesCount : packages?.length || 0);

  // Modal temporary state
  const [modalLbs, setModalLbs] = useState(0);
  const [modalOz, setModalOz] = useState(0);
  const [modalBoxes, setModalBoxes] = useState(0);
  const [modalCartons, setModalCartons] = useState(0);
  const [modalPallets, setModalPallets] = useState(0);

  // Lock body scroll when modals are open
  useEffect(() => {
    if (isMetricsModalOpen || isRatesModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMetricsModalOpen, isRatesModalOpen]);

  // Sync values strictly to the actively utilized parent props to prevent reversion to default lengths
  useEffect(() => {
    setLocalLbs(Math.floor((totalItemWeightOz || 0) / 16));
    setLocalOz(+((totalItemWeightOz || 0) % 16).toFixed(1));
    setLocalBoxes(totalBoxesCount !== undefined ? totalBoxesCount : packages?.length || 0);
  }, [totalItemWeightOz, totalBoxesCount, packages?.length]);

  // Push updates to parent if the optional setter props are provided
  useEffect(() => {
    if (setManualTotalWeightOz) {
      setManualTotalWeightOz((Number(localLbs) * 16) + Number(localOz));
    }
  }, [localLbs, localOz, setManualTotalWeightOz]);

  useEffect(() => {
    if (setManualBoxesCount) {
      setManualBoxesCount(Number(localBoxes));
    }
  }, [localBoxes, setManualBoxesCount]);

  const handleOpenMetricsModal = () => {
    setModalLbs(localLbs);
    setModalOz(localOz);
    setModalBoxes(localBoxes);
    setModalCartons(cartoonsCount || 0);
    setModalPallets(palletsCount || 0);
    setIsMetricsModalOpen(true);
  };
  
  const handleSaveMetrics = () => {
    setLocalLbs(modalLbs);
    setLocalOz(modalOz);
    setLocalBoxes(modalBoxes);
    setCartoonsCount(modalCartons);
    setPalletsCount(modalPallets);
    setIsMetricsModalOpen(false);
  };

  const handleBrowseRates = () => {
    if (!shipmentId) {
      toast.error('Shipment ID Missing', { description: 'Cannot fetch live rates until the order is pushed to ShipStation.' });
      return;
    }
    setIsRatesModalOpen(true);
    dispatch(fetchRatesByShipmentId(shipmentId));
  };

  const handleSelectRate = (rate) => {
    let matchedCarrierId = shipping.carrierId;
    let matchedCarrierType = shipping.carrierType;

    const parentCarrier = carriersData.find(c => 
      (c.enabledServices || []).some(s => s.serviceCode === rate.serviceCode)
    );

    if (parentCarrier) {
      matchedCarrierId = parentCarrier._id;
      matchedCarrierType = parentCarrier.carrierType;
    }

    setShipping({
      ...shipping,
      carrierId: matchedCarrierId,
      carrierType: matchedCarrierType,
      serviceCode: rate.serviceCode,
      shippingCost: rate.shipmentCost || 0
    });
    
    setIsRatesModalOpen(false);
    dispatch(clearShipmentRates());
  };

  return (
    <>
      {/* SHIPPING METHOD PANEL */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-3xl flex flex-col justify-between min-h-[130px] transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
         <div className="flex justify-between items-center mb-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Truck size={14}/> Shipping Method</h3>
          <button onClick={() => setEditingLogistics(!editingLogistics)} className="text-slate-400 hover:text-brand-gold transition-colors duration-200 shrink-0 bg-white/50 p-1.5 rounded-md border border-slate-100">
              {editingLogistics ? <Check size={12} className="text-emerald-600"/> : <Edit2 size={12}/>}
          </button>
         </div>
         
         {editingLogistics ? (
             <div className="space-y-3 mt-auto">
                 <select 
                   className="w-full bg-white p-2.5 rounded-xl text-xs font-bold text-slate-800 border border-slate-200 focus:border-brand-gold outline-none shadow-sm cursor-pointer"
                   value={`${shipping.carrierId || ''}|${shipping.carrierType || ''}|${shipping.serviceCode || ''}`}
                   onChange={(e) => {
                     const [carrierId, carrierType, serviceCode] = e.target.value.split('|');
                     setShipping({ ...shipping, carrierId, carrierType, serviceCode });
                   }}
                 >
                   <option value="||">Select Carrier Service...</option>
                   {carriersData.map(carrier => {
                     const cType = carrier.carrierType || '';
                     const cId = carrier._id || '';
                     
                     const activeServices = (carrier.enabledServices || []).filter(s => s.isActive);
                     if (activeServices.length === 0) return null;

                     return activeServices.map(service => (
                       <option key={`${cId}-${service.serviceCode}`} value={`${cId}|${cType}|${service.serviceCode}`}>
                         {cType.toUpperCase()} - {service.serviceName || service.serviceCode}
                       </option>
                     ));
                   })}
                 </select>

                 <button 
                    onClick={handleBrowseRates}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white p-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-md active:scale-95"
                 >
                   <Search size={14} /> Browse Live Rates
                 </button>
             </div>
         ) : (
             <div className="text-sm font-bold text-slate-900 min-w-0 flex flex-col justify-between h-full mt-auto">
                 <div>
                   <p className="truncate text-slate-800 tracking-tight">{shipping.carrierType ? shipping.carrierType.toUpperCase() : 'No Carrier'} {shipping.serviceCode && `- ${shipping.serviceCode}`}</p>
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

      {/* SHIPMENT METRICS PANEL */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-3xl flex flex-col justify-between min-h-[130px] transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
         <div className="flex justify-between items-center mb-3">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
             <Weight size={14}/> Shipment Metrics
             {isWeightMismatched && <AlertTriangle size={12} className="text-amber-500 ml-1" title="Item weight and package weight do not match" />}
           </h3>
           <button onClick={handleOpenMetricsModal} className="text-slate-400 hover:text-brand-gold transition-colors duration-200 shrink-0 bg-white/50 p-1.5 rounded-md border border-slate-100">
              <Edit2 size={12}/>
           </button>
         </div>
         
         <div className="text-xs font-bold text-slate-900 mt-auto grid grid-cols-5 gap-2 divide-x divide-slate-200/60 items-end pb-1">
             <div className="col-span-2">
               <p className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                 {localLbs} <span className="text-[9px] font-bold text-slate-400 mr-1">lb</span>
                 {localOz} <span className="text-[9px] font-bold text-slate-400">oz</span>
               </p>
               <p className="text-slate-400 text-[8px] font-bold mt-0.5 uppercase tracking-wider">Total Wgt</p>
             </div>
             <div className="pl-2 sm:pl-2 flex flex-col justify-end">
               <p className="text-lg sm:text-xl font-black text-slate-800 tracking-tight truncate">{localBoxes}</p>
               <p className="text-slate-400 text-[8px] font-bold mt-0.5 uppercase tracking-wider">Boxes</p>
             </div>
             <div className="pl-2 sm:pl-2 flex flex-col justify-end">
               <p className="text-lg sm:text-xl font-black text-slate-800 tracking-tight truncate">{cartoonsCount}</p>
               <p className="text-slate-400 text-[8px] font-bold mt-0.5 uppercase tracking-wider">Cartons</p>
             </div>
             <div className="pl-2 sm:pl-2 flex flex-col justify-end">
               <p className="text-lg sm:text-xl font-black text-slate-800 tracking-tight truncate">{palletsCount}</p>
               <p className="text-slate-400 text-[8px] font-bold mt-0.5 uppercase tracking-wider">Pallets</p>
             </div>
          </div>
      </div>

      {/* METRICS EDIT MODAL */}
      <AnimatePresence>
        {isMetricsModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" 
              onClick={() => setIsMetricsModalOpen(false)} 
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 10 }} 
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-white/95 backdrop-blur-2xl border border-white/50 p-6 sm:p-8 rounded-[2rem] shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Weight size={20} className="text-brand-gold" /> Edit Metrics
                  </h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                    Update logistics data manually
                  </p>
                </div>
                <button 
                  onClick={() => setIsMetricsModalOpen(false)} 
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-5 mb-6">
                <div className="col-span-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Total Weight (Lbs)</label>
                  <input 
                    type="number" 
                    min="0" 
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-900 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none transition-all" 
                    value={modalLbs} 
                    onChange={(e) => setModalLbs(e.target.value)} 
                  />
                </div>
                
                <div className="col-span-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Total Weight (Oz)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="15.99" 
                    step="0.1" 
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-900 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none transition-all" 
                    value={modalOz} 
                    onChange={(e) => setModalOz(e.target.value)} 
                  />
                </div>
                
                <div className="col-span-2 border-t border-slate-100 pt-5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Total Boxes / Parcels</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-900 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none transition-all" 
                    value={modalBoxes} 
                    onChange={(e) => setModalBoxes(e.target.value)} 
                  />
                </div>
                
                <div className="col-span-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Cartons</label>
                  <input 
                    type="number" 
                    min="0" 
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-900 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none transition-all" 
                    value={modalCartons} 
                    onChange={(e) => setModalCartons(e.target.value)} 
                  />
                </div>
                
                <div className="col-span-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Pallets</label>
                  <input 
                    type="number" 
                    min="0" 
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-900 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none transition-all" 
                    value={modalPallets} 
                    onChange={(e) => setModalPallets(e.target.value)} 
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsMetricsModalOpen(false)} 
                  className="flex-1 px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveMetrics} 
                  className="flex-[2] flex justify-center items-center gap-2 px-4 py-3.5 bg-slate-900 hover:bg-slate-800 text-brand-gold rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-slate-900/20 transition-all active:scale-95"
                >
                  Save Metrics
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LIVE RATES MODAL */}
      <AnimatePresence>
        {isRatesModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" 
              onClick={() => {
                setIsRatesModalOpen(false);
                dispatch(clearShipmentRates());
              }} 
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 10 }} 
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl border border-white/50 p-6 sm:p-8 rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 shrink-0">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Truck size={20} className="text-brand-gold" /> Available Rates
                  </h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                    Select a service to update shipping method
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsRatesModalOpen(false);
                    dispatch(clearShipmentRates());
                  }} 
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-[200px]">
                {shipmentRatesStatus === 'loading' ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-3 py-10">
                    <Loader2 className="animate-spin text-brand-gold" size={32} />
                    <p className="text-xs font-black tracking-widest uppercase text-slate-400">Fetching live rates...</p>
                  </div>
                ) : shipmentRates.length > 0 ? (
                  <div className="space-y-3">
                    {shipmentRates.map((rate, index) => (
                      <div 
                        key={index}
                        onClick={() => handleSelectRate(rate)}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-gold hover:shadow-md cursor-pointer transition-all active:scale-[0.98]"
                      >
                        <div className="mb-2 sm:mb-0">
                          <p className="text-sm font-bold text-slate-900">{rate.serviceName}</p>
                          <div className="flex items-center gap-3 mt-1 text-[11px] font-medium text-slate-500">
                            <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                              <Truck size={12} className="text-slate-400" />
                              {rate.serviceCode}
                            </span>
                            {rate.transitDays && (
                              <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                                <Clock size={12} className="text-slate-400" />
                                {rate.transitDays} Days
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-base font-black text-brand-gold bg-brand-gold/10 px-3 py-1.5 rounded-lg shrink-0">
                          <DollarSign size={14} />
                          {rate.shipmentCost.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full space-y-3 py-10 text-center">
                    <AlertTriangle size={32} className="text-slate-300" />
                    <div>
                      <p className="text-sm font-bold text-slate-700">No Rates Found</p>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-1">Please ensure the shipping address is valid.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}