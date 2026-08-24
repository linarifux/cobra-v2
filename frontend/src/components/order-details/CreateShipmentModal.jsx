import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudUpload, X, MapPin, Truck, PackageCheck, MessageSquare, Loader2, Plus, Trash2, Scale, Maximize } from 'lucide-react';
import { fetchCarrierPackages } from '../../store/slices/carrierSlice';

export default function CreateShipmentModal({
  isOpen,
  onClose,
  onSubmit,
  isCreatingShipment,
  address,
  shipping,
  packages,
  notes,
  onAddPackage,
  onUpdatePackage,
  onRemovePackage,
  onWeightChange,
  cartoonsCount,        // <-- ADDED
  setCartoonsCount      // <-- ADDED
}) {
  const dispatch = useDispatch();

  // REMOVED local state: const [cartoonsCount, setCartoonsCount] = useState(0);

  // Grab the carrier list and the newly fetched package types from Redux
  const { items: carriersData, packageTypes, packageStatus } = useSelector(state => state.carriers || {});

  // Trigger package fetch when modal opens and a carrier is selected
  useEffect(() => {
    if (isOpen && shipping?.carrierId) {
      // Find the selected carrier object to extract the official ShipStation ID
      const activeCarrier = carriersData.find(c => String(c._id) === String(shipping.carrierId));
      if (activeCarrier && activeCarrier.shipStationId) {
        dispatch(fetchCarrierPackages(activeCarrier.shipStationId));
      }
    }
  }, [isOpen, shipping?.carrierId, carriersData, dispatch]);

  // --- Bulletproof Array Extraction to prevent .map() crashes ---
  const safePackageTypes = useMemo(() => {
    if (!packageTypes) return [];
    if (Array.isArray(packageTypes)) return packageTypes;
    if (Array.isArray(packageTypes.packages)) return packageTypes.packages;
    if (Array.isArray(packageTypes.data)) return packageTypes.data;
    return [];
  }, [packageTypes]);

  // --- Aggregate Summary Calculations ---
  const totalOunces = packages.reduce((sum, pkg) => sum + (Number(pkg.weightInOunces) || 0), 0);
  const summaryLbs = Math.floor(totalOunces / 16);
  const summaryOz = (totalOunces % 16).toFixed(1);

  // Approximate stacking calculation for final dimensions
  const finalLength = Math.max(0, ...packages.map(p => Number(p.length) || 0));
  const finalWidth = Math.max(0, ...packages.map(p => Number(p.width) || 0));
  const finalHeight = packages.reduce((sum, p) => sum + (Number(p.height) || 0), 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => !isCreatingShipment && onClose()} 
          />
          
          {/* Modal Content */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.95, opacity: 0 }} 
            className="relative w-full max-w-2xl bg-white/95 backdrop-blur-xl border border-white/50 p-6 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center border border-blue-200">
                  <CloudUpload size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Create ShipStation Shipment</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Review Payload Information</p>
                </div>
              </div>
              <button 
                onClick={() => onClose()} 
                className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <X size={16}/>
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 flex items-center gap-1.5"><MapPin size={12}/> Destination</h4>
                    <p className="text-xs font-bold text-slate-700">{address.name || 'No Name Provided'}</p>
                    <p className="text-xs text-slate-600">{address.street || 'No Street Provided'} {address.line2}</p>
                    <p className="text-xs text-slate-600">{address.city}, {address.state} {address.zip} {address.country}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 flex items-center gap-1.5"><Truck size={12}/> Carrier & Service</h4>
                    <p className="text-xs font-bold text-slate-700">{shipping.carrierType || 'Not Selected'}</p>
                    <p className="text-xs text-slate-600">{shipping.serviceCode || 'Not Selected'}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2">Zone: Auto-calculated</p>
                  </div>
               </div>

               {/* Multi-Package Configuration */}
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                      <PackageCheck size={12}/> Package Configuration
                    </h4>
                  </div>

                  {/* SUMMARY BOX: Total Weight & Final Dimensions */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex items-center gap-3">
                      <div className="p-2 bg-blue-100 text-blue-500 rounded-lg"><Scale size={16} /></div>
                      <div>
                        <p className="text-[9px] font-black uppercase text-blue-400 mb-0.5 tracking-wider">Total Weight</p>
                        <p className="text-sm font-bold text-blue-700">{summaryLbs} <span className="text-[10px] text-blue-500 font-medium">lb</span> {summaryOz} <span className="text-[10px] text-blue-500 font-medium">oz</span></p>
                      </div>
                    </div>
                    <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-500 rounded-lg"><Maximize size={16} /></div>
                      <div>
                        <p className="text-[9px] font-black uppercase text-emerald-400 mb-0.5 tracking-wider">Est. Final Dimensions</p>
                        <p className="text-sm font-bold text-emerald-700">{finalLength} × {finalWidth} × {finalHeight} <span className="text-[10px] text-emerald-500 font-medium">in</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Cartoons Input */}
                  <div className="mb-5">
                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1.5 block">Cartoons</label>
                    <input 
                      type="number" 
                      min="0"
                      value={cartoonsCount}
                      onChange={(e) => setCartoonsCount(e.target.value)}
                      className="w-full bg-white p-2.5 rounded-lg text-xs font-bold border border-slate-200 outline-none focus:border-blue-500 shadow-sm transition-all"
                      placeholder="Total Cartoons"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    {packages.map((pkg, i) => {
                      const lbs = Math.floor((Number(pkg.weightInOunces) || 0) / 16);
                      const oz = (Number(pkg.weightInOunces) || 0) % 16;

                      return (
                        <div key={pkg.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group">
                          {packages.length > 1 && (
                            <button 
                              onClick={() => onRemovePackage(pkg.id)}
                              className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors"
                              title="Remove Box"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          
                          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 border-b border-slate-100 pb-2 mb-3">
                            Box {i + 1}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* Package Type Dropdown */}
                            <div className="col-span-1 md:col-span-2">
                              <label className="text-[9px] uppercase font-bold text-slate-400 mb-1.5 flex justify-between items-center">
                                <span>Package Type</span>
                                {packageStatus === 'loading' && <Loader2 size={10} className="animate-spin text-blue-400" />}
                              </label>
                              <select
                                value={pkg.packageCode || 'package'}
                                onChange={(e) => onUpdatePackage(pkg.id, 'packageCode', e.target.value)}
                                className="w-full bg-slate-50 p-2.5 rounded-lg text-xs font-bold border border-slate-200 outline-none focus:border-blue-500 transition-colors shadow-inner cursor-pointer"
                              >
                                {safePackageTypes.map(pt => {
                                  const code = pt.packageCode || pt.package_code || pt.code;
                                  return (
                                    <option key={code} value={code}>
                                      {pt.name}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            {/* Split Weight Input */}
                            <div>
                              <label className="text-[9px] uppercase font-bold text-slate-400 mb-1.5 block">Weight</label>
                              <div className="flex gap-2">
                                <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-lg focus-within:border-blue-500 transition-colors shadow-inner">
                                  <input 
                                    type="number" min="0" 
                                    value={lbs === 0 && oz === 0 && !pkg.weightInOunces ? '' : lbs} 
                                    onChange={(e) => onWeightChange(pkg.id, pkg.weightInOunces, 'lbs', e.target.value)}
                                    className="w-full bg-transparent p-2 text-xs font-bold text-center outline-none" 
                                    placeholder="0"
                                  />
                                  <span className="text-[10px] font-black text-slate-400 pr-3">lb</span>
                                </div>
                                <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-lg focus-within:border-blue-500 transition-colors shadow-inner">
                                  <input 
                                    type="number" min="0" max="15.99" step="0.1"
                                    value={oz === 0 && lbs === 0 && !pkg.weightInOunces ? '' : oz} 
                                    onChange={(e) => onWeightChange(pkg.id, pkg.weightInOunces, 'oz', e.target.value)}
                                    className="w-full bg-transparent p-2 text-xs font-bold text-center outline-none" 
                                    placeholder="0"
                                  />
                                  <span className="text-[10px] font-black text-slate-400 pr-3">oz</span>
                                </div>
                              </div>
                            </div>

                            {/* Split Dimensions Input */}
                            <div>
                              <label className="text-[9px] uppercase font-bold text-slate-400 mb-1.5 block">Dimensions (L x W x H)</label>
                              <div className="flex items-center gap-1.5">
                                <input 
                                  type="number" min="0" step="0.1" placeholder="L"
                                  value={pkg.length !== undefined ? pkg.length : ''} 
                                  onChange={(e) => onUpdatePackage(pkg.id, 'length', e.target.value)}
                                  className="w-full bg-slate-50 p-2 rounded-lg text-xs font-bold text-center border border-slate-200 outline-none focus:border-blue-500 transition-colors shadow-inner" 
                                />
                                <span className="text-slate-300 text-xs font-black">×</span>
                                <input 
                                  type="number" min="0" step="0.1" placeholder="W"
                                  value={pkg.width !== undefined ? pkg.width : ''} 
                                  onChange={(e) => onUpdatePackage(pkg.id, 'width', e.target.value)}
                                  className="w-full bg-slate-50 p-2 rounded-lg text-xs font-bold text-center border border-slate-200 outline-none focus:border-blue-500 transition-colors shadow-inner" 
                                />
                                <span className="text-slate-300 text-xs font-black">×</span>
                                <input 
                                  type="number" min="0" step="0.1" placeholder="H"
                                  value={pkg.height !== undefined ? pkg.height : ''} 
                                  onChange={(e) => onUpdatePackage(pkg.id, 'height', e.target.value)}
                                  className="w-full bg-slate-50 p-2 rounded-lg text-xs font-bold text-center border border-slate-200 outline-none focus:border-blue-500 transition-colors shadow-inner" 
                                />
                                <span className="text-[10px] font-black text-slate-400 pl-1">in</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <button 
                      onClick={onAddPackage}
                      className="w-full py-2.5 flex items-center justify-center gap-1.5 bg-white border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-500 hover:text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all mt-2"
                    >
                      <Plus size={14} /> Add Another Box
                    </button>
                  </div>
               </div>
               
               <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                  <h4 className="text-[10px] font-black uppercase text-amber-600 mb-2 flex items-center gap-1.5"><MessageSquare size={12}/> Notes Payload</h4>
                  <p className="text-xs text-amber-800 italic">"{notes || 'No internal notes provided'}"</p>
               </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-100 shrink-0 mt-2">
              <button 
                type="button" 
                onClick={() => onClose()} 
                disabled={isCreatingShipment} 
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => onSubmit()}  // <-- Removed the local state argument to force reliance on synced parent state
                disabled={isCreatingShipment} 
                className="flex-[2] flex justify-center items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/30 transition-all disabled:opacity-70"
              >
                {isCreatingShipment ? <Loader2 size={16} className="animate-spin" /> : <><CloudUpload size={16} /> Push to ShipStation</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}