import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Minus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createLocation, updateLocation } from '../../store/slices/locationSlice';

const INITIAL_FORM_STATE = { 
  designation: '', 
  level: '', 
  storageCategory: 'Rack', 
  maxStorageUnits: 100,
  assignedMaterials: [{ id: Date.now().toString(), inventory: '', lotBatchId: '', allocatedQty: '' }]
};

// --- PROFESSIONAL ERROR HANDLER ---
// Since our backend now returns clean AppError messages, we just gracefully pass them through.
const formatErrorMessage = (err) => {
  if (typeof err === 'string') return err; // Catches our custom backend messages
  if (err?.message) return err.message;    // Catches standard JS errors
  return 'An unexpected server error occurred. Please try again.';
};

export default function LocationModal({ isOpen, onClose, activeLocation, inventoryList }) {
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Initialize Form Data when modal opens or activeLocation changes
  useEffect(() => {
    if (isOpen) {
      if (activeLocation) {
        setFormData({
          designation: activeLocation.designation || '',
          level: activeLocation.level || '', 
          storageCategory: activeLocation.storageCategory || 'Rack',
          maxStorageUnits: activeLocation.maxStorageUnits || 100,
          assignedMaterials: activeLocation.assignedMaterials?.length > 0 
            ? activeLocation.assignedMaterials.map(m => ({ 
                ...m, 
                id: m._id || Date.now().toString() + Math.random(),
                inventory: m.inventory?._id || m.inventory || '' 
              })) 
            : [{ id: Date.now().toString(), inventory: '', lotBatchId: '', allocatedQty: '' }]
        });
      } else {
        setFormData(INITIAL_FORM_STATE);
      }
    }
  }, [isOpen, activeLocation]);

  const addInventoryLine = () => {
    setFormData(prev => ({
      ...prev,
      assignedMaterials: [...prev.assignedMaterials, { id: Date.now().toString(), inventory: '', lotBatchId: '', allocatedQty: '' }]
    }));
  };

  const removeInventoryLine = (id) => {
    if (formData.assignedMaterials.length > 1) {
      setFormData(prev => ({
        ...prev,
        assignedMaterials: prev.assignedMaterials.filter(line => line.id !== id)
      }));
    }
  };

  const updateInventoryLine = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      assignedMaterials: prev.assignedMaterials.map(line => line.id === id ? { ...line, [field]: value } : line)
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault(); // Prevents page reload on form submit (Enter key)

    // 1. Proactive Frontend Validation
    if (!formData.designation || formData.designation.trim() === '') {
      return toast.warning('Missing Field', { description: 'Location Designation is required.' });
    }
    
    setIsSubmitting(true);

    const cleanInventory = formData.assignedMaterials
      .filter(line => line.inventory && line.inventory !== '')
      .map(line => ({
        inventory: line.inventory,
        lotBatchId: line.lotBatchId || 'N/A',
        allocatedQty: parseInt(line.allocatedQty) || 0
      }));

    const payload = {
      designation: formData.designation.trim(),
      level: formData.level || 'N/A',
      storageCategory: formData.storageCategory,
      maxStorageUnits: parseInt(formData.maxStorageUnits) || 100,
      assignedMaterials: cleanInventory,
      status: 'Active'
    };

    try {
      const actionPromise = activeLocation 
        ? dispatch(updateLocation({ id: activeLocation._id, locationData: payload })).unwrap()
        : dispatch(createLocation(payload)).unwrap();

      // 2. Map the promise to our Sonner toast with the translated error message
      toast.promise(actionPromise, {
        loading: activeLocation ? 'Updating location...' : 'Creating new location...',
        success: `Location successfully ${activeLocation ? 'updated' : 'created'}.`,
        error: (err) => formatErrorMessage(err)
      });

      // Wait for the action to complete.
      await actionPromise;
      
      // Only close the modal if the save was successful
      onClose(); 
    } catch (err) {
      // Intentionally caught silently. toast.promise renders the error message to the user!
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" 
        onClick={() => !isSubmitting && onClose()} 
      />
      <motion.div 
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-lg h-full bg-white shadow-2xl border-l border-slate-200 p-6 md:p-8 overflow-y-auto flex flex-col justify-between"
      >
        <div>
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Package className="text-brand-gold" size={20} />
              {activeLocation ? 'Edit Architecture' : 'New Location'}
            </h2>
            <button type="button" disabled={isSubmitting} onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
          </div>
          
          {/* Changed from <div> to <form> for native submit handling */}
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block pl-1">Designation <span className="text-red-400">*</span></label>
                <input 
                  type="text" 
                  placeholder="e.g., Aisle 4-C"
                  required
                  disabled={isSubmitting}
                  value={formData.designation}
                  onChange={(e) => setFormData({...formData, designation: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all disabled:opacity-50" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block pl-1">Max Units <span className="text-red-400">*</span></label>
                <input 
                  type="number" 
                  min="1"
                  required
                  disabled={isSubmitting}
                  value={formData.maxStorageUnits}
                  onChange={(e) => setFormData({...formData, maxStorageUnits: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all disabled:opacity-50" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block pl-1">Category</label>
                <select 
                  value={formData.storageCategory}
                  disabled={isSubmitting}
                  onChange={(e) => setFormData({...formData, storageCategory: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all cursor-pointer disabled:opacity-50"
                >
                  <option value="Rack">Rack</option>
                  <option value="Shelf">Shelf</option>
                  <option value="Floor">Floor</option>
                  <option value="Bin">Bin</option>
                  <option value="Pallet">Pallet</option>
                  <option value="Vault">Vault</option>
                  <option value="Cooler">Cooler</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block pl-1">Level / Row</label>
                <input 
                  type="text" 
                  placeholder="e.g., Tier 3"
                  disabled={isSubmitting}
                  value={formData.level}
                  onChange={(e) => setFormData({...formData, level: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all disabled:opacity-50" 
                />
              </div>
            </div>

            {/* Multi-item Dynamic Allocation Form Space */}
            <div className="pt-6 border-t border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mapped Materials</label>
                <button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={addInventoryLine} 
                  className="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors uppercase disabled:opacity-50"
                >
                  <Plus size={12}/> Mix Asset
                </button>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar pb-10">
                {formData.assignedMaterials.map((line, idx) => (
                  <div key={line.id || idx} className="p-5 bg-white border border-slate-200 rounded-[1.5rem] relative space-y-4 shadow-sm">
                    {formData.assignedMaterials.length > 1 && (
                      <button 
                        type="button" 
                        disabled={isSubmitting}
                        onClick={() => removeInventoryLine(line.id)} 
                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Minus size={14}/>
                      </button>
                    )}
                    <div className="pr-8">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Inventory Asset</label>
                      <select
                        disabled={isSubmitting}
                        value={line.inventory}
                        onChange={(e) => updateInventoryLine(line.id, 'inventory', e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 mt-1.5 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <option value="">Select Asset from Catalog...</option>
                        {inventoryList.map(inv => (
                          <option key={inv._id} value={inv._id}>
                            {inv.sku} — {inv.itemName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Lot Batch ID</label>
                        <input 
                          type="text"
                          placeholder="e.g., LOT-9912"
                          disabled={isSubmitting}
                          value={line.lotBatchId}
                          onChange={(e) => updateInventoryLine(line.id, 'lotBatchId', e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 mt-1.5 transition-all disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Allocated Qty</label>
                        <input 
                          type="number"
                          min="0"
                          placeholder="0"
                          disabled={isSubmitting}
                          value={line.allocatedQty}
                          onChange={(e) => updateInventoryLine(line.id, 'allocatedQty', e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 mt-1.5 transition-all disabled:opacity-50 text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Form Footer Actions moved inside the form */}
            <div className="pt-6 mt-6 border-t border-slate-100 flex gap-3">
              <button 
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all disabled:opacity-50 text-xs uppercase tracking-widest"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1 flex justify-center items-center py-3.5 bg-slate-900 hover:bg-slate-800 text-brand-gold font-black rounded-2xl shadow-xl shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-70 text-xs uppercase tracking-widest"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (activeLocation ? 'Save Updates' : 'Create Location')}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}