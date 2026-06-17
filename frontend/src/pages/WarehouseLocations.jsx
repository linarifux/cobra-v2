import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, X, Edit2, Trash2, Layers, Loader2, Minus, Package
} from 'lucide-react';

// Import Redux Thunks
import { 
  fetchLocations, 
  createLocation, 
  updateLocation, 
  deleteLocation 
} from '../store/slices/locationSlice';
import { fetchInventory } from '../store/slices/inventorySlice';

// Import Confirm Hook
import { useConfirm } from '../providers/ConfirmProvider';

export default function WarehouseLocations() {
  const dispatch = useDispatch();
  const confirm = useConfirm();

  // Safely access Redux state for Locations and Inventory
  const { items: apiLocations = [], status, error } = useSelector(state => state.locations || {});
  const { items: inventoryList = [], status: invStatus } = useSelector(state => state.inventory || {});

  // Load external collections on mount
  useEffect(() => {
    if (status === 'idle') dispatch(fetchLocations());
    if (invStatus === 'idle') dispatch(fetchInventory());
  }, [status, invStatus, dispatch]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeLocation, setActiveLocation] = useState(null); // null = Add, object = Edit
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State aligned with the updated Mongoose Schema (using 'inventory' ObjectId)
  const [formData, setFormData] = useState({ 
    designation: '', 
    level: '', 
    storageCategory: 'Rack', 
    maxStorageUnits: 100,
    assignedMaterials: [{ id: Date.now().toString(), inventory: '', lotBatchId: '', allocatedQty: '' }]
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  // Safely map backend items to the local view format
  const filteredLocations = useMemo(() => {
    return apiLocations.filter(loc => {
      const searchTarget = searchTerm.toLowerCase();
      const locName = loc.designation?.toLowerCase() || '';
      const locLevel = loc.level?.toLowerCase() || '';

      const matchesSearch = locName.includes(searchTarget) ||
                            locLevel.includes(searchTarget) ||
                            (loc.assignedMaterials && loc.assignedMaterials.some(m => 
                              m.inventory?.itemName?.toLowerCase().includes(searchTarget) || 
                              m.inventory?.sku?.toLowerCase().includes(searchTarget) || 
                              m.lotBatchId?.toLowerCase().includes(searchTarget)
                            ));
                            
      const matchesType = typeFilter === 'All' || loc.storageCategory === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [apiLocations, searchTerm, typeFilter]);

  // Modal Handlers
  const openAddModal = () => {
    setFormData({ 
      designation: '', 
      level: '', 
      storageCategory: 'Rack', 
      maxStorageUnits: 100,
      assignedMaterials: [{ id: Date.now().toString(), inventory: '', lotBatchId: '', allocatedQty: '' }]
    });
    setActiveLocation(null);
    setIsModalOpen(true);
  };

  const openEditModal = (loc) => {
    setFormData({
      designation: loc.designation,
      level: loc.level || '', 
      storageCategory: loc.storageCategory || 'Rack',
      maxStorageUnits: loc.maxStorageUnits || 100,
      assignedMaterials: loc.assignedMaterials?.length > 0 
        ? loc.assignedMaterials.map(m => ({ 
            ...m, 
            id: m._id || Date.now().toString(),
            // Extract the ID from the populated inventory object
            inventory: m.inventory?._id || m.inventory || '' 
          })) 
        : [{ id: Date.now().toString(), inventory: '', lotBatchId: '', allocatedQty: '' }]
    });
    setActiveLocation(loc);
    setIsModalOpen(true);
  };

  // Dynamic Inventory Line Handlers inside Form
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

  const handleSave = async () => {
    if (!formData.designation) return alert("Location Designation is required.");
    setIsSubmitting(true);

    // Clean payload strictly mapping to backend schema expectations
    const cleanInventory = formData.assignedMaterials
      .filter(line => line.inventory && line.inventory !== '')
      .map(line => ({
        inventory: line.inventory, // Sending the ObjectId to Mongoose
        lotBatchId: line.lotBatchId || 'N/A',
        allocatedQty: parseInt(line.allocatedQty) || 0
      }));

    const payload = {
      designation: formData.designation,
      level: formData.level || 'N/A',
      storageCategory: formData.storageCategory,
      maxStorageUnits: parseInt(formData.maxStorageUnits) || 100,
      assignedMaterials: cleanInventory,
      status: 'Active'
    };

    try {
      console.log(activeLocation);
      if (activeLocation) {
        await dispatch(updateLocation({ id: activeLocation._id, locationData: payload })).unwrap();
      } else {
        await dispatch(createLocation(payload)).unwrap();
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save location:", err);
      alert(`Error saving location: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Location?',
      message: 'Are you sure you want to permanently delete this storage location? All inventory associations mapped to this rack will be removed.',
      confirmText: 'Delete Location',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        await dispatch(deleteLocation(id)).unwrap();
      } catch (err) {
        console.error("Failed to delete location:", err);
      }
    }
  };

  const getLocationTotals = (inventoryArray) => {
    if (!inventoryArray) return 0;
    return inventoryArray.reduce((sum, current) => sum + (parseInt(current.allocatedQty) || 0), 0);
  };

  // Render Loader if initial fetch is pending
  if (status === 'loading' && apiLocations.length === 0) {
    return (
      <div className="h-full flex justify-center items-center py-20 text-slate-400">
        <Loader2 className="animate-spin text-brand-gold" size={32} />
      </div>
    );
  }

  // Render Error state if fetch failed
  if (status === 'failed') {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-2xl text-center text-sm font-bold border border-red-200 m-6">
        Failed to load locations: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto p-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Warehouse Locations</h1>
          <p className="text-slate-500 font-medium">Manage storage zones, dynamic item placements, and batch lots.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-brand-gold rounded-xl text-sm font-black shadow-xl shadow-slate-900/20 transition-all active:scale-95"
        >
          <Plus size={16} /> New Location
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-4 rounded-3xl flex flex-wrap gap-4 items-center shadow-sm">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search locations, shelves, SKU items, or lot numbers..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all" 
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Type:</span>
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all cursor-pointer"
          >
            <option value="All">All Storage Types</option>
            <option value="Rack">Rack</option>
            <option value="Shelf">Shelf</option>
            <option value="Floor">Floor</option>
            <option value="Bin">Bin</option>
            <option value="Pallet">Pallet</option>
            <option value="Vault">Vault</option>
          </select>
        </div>
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredLocations.map((loc) => {
          const totalUsed = getLocationTotals(loc.assignedMaterials);
          const capacityPercentage = Math.min(Math.round((totalUsed / (loc.maxStorageUnits || 1)) * 100), 100);
          
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
                  <div className="flex gap-2 mt-2">
                    <span className="inline-block text-[9px] bg-slate-900 text-brand-gold border border-slate-800 px-2.5 py-1 rounded-md font-black uppercase tracking-widest shadow-sm">{loc.storageCategory}</span>
                    <span className="inline-block text-[9px] bg-white border border-slate-200/80 text-slate-500 px-2.5 py-1 rounded-md font-black uppercase tracking-widest shadow-sm">Lvl: {loc.level || 'N/A'}</span>
                  </div>
                </div>

                {/* Sub-Inventory List Breakdown */}
                <div className="border-t border-slate-200/60 pt-4 mb-4 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Layers size={14} className="text-brand-gold"/> Stored Assets</p>
                  
                  {!loc.assignedMaterials || loc.assignedMaterials.length === 0 ? (
                    <div className="py-4 bg-white/40 rounded-2xl text-center border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400 font-bold">Location Empty</p>
                    </div>
                  ) : (
                    <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 scrollbar-hide">
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
              
              {/* Progress Utilization Tracker */}
              <div className="space-y-2 pt-4 border-t border-slate-200/60 mt-auto">
                <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <span>Usage: {totalUsed} / {loc.maxStorageUnits}</span>
                  <span className={capacityPercentage >= 90 ? 'text-red-500' : 'text-slate-900'}>{capacityPercentage}%</span>
                </div>
                <div className="w-full h-2 bg-white border border-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${capacityPercentage >= 90 ? 'bg-red-500' : 'bg-brand-gold'}`} 
                    style={{ width: `${capacityPercentage}%` }} 
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add/Edit Slide-Over Frame */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" 
              onClick={() => !isSubmitting && setIsModalOpen(false)} 
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
                  <button disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
                </div>
                
                <div className="space-y-6">
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

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide pb-10">
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
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all disabled:opacity-50 text-xs uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="flex-1 flex justify-center items-center py-3.5 bg-slate-900 hover:bg-slate-800 text-brand-gold font-black rounded-2xl shadow-xl shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-70 text-xs uppercase tracking-widest"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (activeLocation ? 'Save Updates' : 'Create Location')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}