import React from 'react';
import { motion } from 'framer-motion';
import { Layers, Edit2, Trash2, Box } from 'lucide-react';

export default function LocationGrid({ filteredLocations, openEditModal, handleDelete }) {
  
  // Helper to calculate total allocated items
  const getLocationTotals = (inventoryArray) => {
    if (!inventoryArray) return 0;
    return inventoryArray.reduce((sum, current) => sum + (parseInt(current.allocatedQty) || 0), 0);
  };

  if (filteredLocations.length === 0) {
    return (
      <div className="py-20 text-center text-slate-400 font-bold text-sm bg-white/30 rounded-[2rem] border border-white/60">
        No locations found matching your criteria.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {filteredLocations.map((loc) => {
        const totalUsed = getLocationTotals(loc.assignedMaterials);
        const maxUnits = loc.maxStorageUnits || 0;
        
        // Calculate remaining availability (preventing negative numbers if over-allocated)
        const availableSpace = Math.max(0, maxUnits - totalUsed);
        
        // Calculate percentage for the progress bar
        const capacityPercentage = maxUnits > 0 ? Math.min(Math.round((totalUsed / maxUnits) * 100), 100) : 100;
        
        return (
          <motion.div 
            layout
            key={loc._id} 
            className="bg-white/60 backdrop-blur-xl border border-white/60 p-5 rounded-[2rem] hover:border-brand-gold/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 group relative flex flex-col justify-between shadow-sm"
          >
            <div>
              {/* Actions */}
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditModal(loc)} className="p-2 bg-white rounded-xl shadow-sm hover:bg-slate-900 hover:text-brand-gold transition-colors border border-slate-100 text-slate-600"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(loc._id)} className="p-2 bg-white rounded-xl shadow-sm hover:bg-red-500 hover:text-white transition-colors border border-slate-100 text-red-500"><Trash2 size={14} /></button>
              </div>

              <div className="mb-5">
                <h3 className="font-black text-slate-900 text-xl tracking-tight pr-16 truncate">{loc.designation}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-block text-[9px] bg-slate-900 text-brand-gold border border-slate-800 px-2.5 py-1 rounded-md font-black uppercase tracking-widest shadow-sm">
                    {loc.storageCategory}
                  </span>
                  <span className="inline-block text-[9px] bg-white border border-slate-200/80 text-slate-500 px-2.5 py-1 rounded-md font-black uppercase tracking-widest shadow-sm">
                    Lvl: {loc.level || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Sub-Inventory List Breakdown */}
              <div className="border-t border-slate-200/60 pt-4 mb-4 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Layers size={14} className="text-brand-gold"/> Stored Assets
                </p>
                
                {!loc.assignedMaterials || loc.assignedMaterials.length === 0 ? (
                  <div className="py-4 bg-white/40 rounded-2xl text-center border border-dashed border-slate-200">
                    <p className="text-xs text-slate-400 font-bold">Location Empty</p>
                  </div>
                ) : (
                  <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {loc.assignedMaterials.map((m) => (
                      <div key={m._id || Math.random()} className="bg-white/90 border border-slate-100 p-3 rounded-2xl flex justify-between items-center text-xs shadow-sm">
                        <div className="overflow-hidden mr-2">
                          <p className="font-black text-slate-900 truncate tracking-tight">{m.inventory?.itemName || 'Unknown Item'}</p>
                          <div className="flex gap-2 items-center mt-1">
                            <p className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 rounded">{m.inventory?.sku || 'N/A'}</p>
                            {m.lotBatchId !== 'N/A' && <p className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 rounded">Lot: {m.lotBatchId}</p>}
                          </div>
                        </div>
                        <span className="font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl text-[11px] text-center shrink-0">
                          {m.allocatedQty}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Progress Utilization Tracker & Availability */}
            <div className="pt-4 border-t border-slate-200/60 mt-auto flex flex-col gap-3">
              
              <div className="space-y-2">
                <div className="flex justify-between items-end text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <span>Usage: {totalUsed} / {maxUnits}</span>
                  <span className={capacityPercentage >= 90 ? 'text-red-500' : capacityPercentage >= 75 ? 'text-amber-500' : 'text-slate-900'}>
                    {capacityPercentage}%
                  </span>
                </div>
                <div className="w-full h-2 bg-white border border-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      capacityPercentage >= 90 
                        ? 'bg-red-500' 
                        : capacityPercentage >= 75 
                          ? 'bg-amber-400' 
                          : 'bg-brand-gold'
                    }`} 
                    style={{ width: `${capacityPercentage}%` }} 
                  />
                </div>
              </div>

              {/* Dynamic Availability Indicator */}
              <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Box size={12} /> Available Space
                </span>
                <span className={`text-[11px] font-black px-2 py-1 rounded-lg border uppercase tracking-wider shadow-sm ${
                  availableSpace === 0
                    ? 'bg-red-50 text-red-600 border-red-200'
                    : capacityPercentage >= 75
                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                }`}>
                  {availableSpace} {availableSpace === 1 ? 'Unit' : 'Units'}
                </span>
              </div>

            </div>
          </motion.div>
        );
      })}
    </div>
  );
}