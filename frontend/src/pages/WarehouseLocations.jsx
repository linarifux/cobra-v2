import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, X, Edit2, Trash2, Layers, Loader2, Minus
} from 'lucide-react';

// Import Redux Thunks
import { 
  fetchLocations, 
  createLocation, 
  updateLocation, 
  deleteLocation 
} from '../store/slices/locationSlice';

export default function WarehouseLocations() {
  const dispatch = useDispatch();

  // Safely access Redux state
  const { items: apiLocations = [], status, error } = useSelector(state => state.locations || {});

  // Load external collections on mount
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchLocations());
    }
  }, [status, dispatch]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeLocation, setActiveLocation] = useState(null); // null = Add, object = Edit
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State aligned with Mongoose Schema
  const [formData, setFormData] = useState({ 
    designation: '', 
    level: '', 
    storageCategory: 'Rack', 
    maxStorageUnits: 100,
    assignedMaterials: [{ id: Date.now().toString(), itemReference: '', lotBatchId: '', allocatedQty: '' }]
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  // Safely map backend items to the local view format
  const filteredLocations = useMemo(() => {
    return apiLocations.filter(loc => {
      // Safely check fields, defaulting to empty strings if missing
      const searchTarget = searchTerm.toLowerCase();
      const locName = loc.designation?.toLowerCase() || '';
      const locLevel = loc.level?.toLowerCase() || '';

      const matchesSearch = locName.includes(searchTarget) ||
                            locLevel.includes(searchTarget) ||
                            (loc.assignedMaterials && loc.assignedMaterials.some(inv => 
                              inv.itemReference?.toLowerCase().includes(searchTarget) || 
                              inv.lotBatchId?.toLowerCase().includes(searchTarget)
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
      assignedMaterials: [{ id: Date.now().toString(), itemReference: '', lotBatchId: '', allocatedQty: '' }]
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
        ? loc.assignedMaterials.map(m => ({ ...m, id: m._id || Date.now().toString() })) 
        : [{ id: Date.now().toString(), itemReference: '', lotBatchId: '', allocatedQty: '' }]
    });
    setActiveLocation(loc);
    setIsModalOpen(true);
  };

  // Dynamic Inventory Line Handlers inside Form
  const addInventoryLine = () => {
    setFormData(prev => ({
      ...prev,
      assignedMaterials: [...prev.assignedMaterials, { id: Date.now().toString(), itemReference: '', lotBatchId: '', allocatedQty: '' }]
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
      .filter(line => line.itemReference && line.itemReference.trim() !== '')
      .map(line => ({
        itemReference: line.itemReference,
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
    if (window.confirm('Are you sure you want to permanently delete this location?')) {
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
      <div className="bg-red-50 text-red-600 p-6 rounded-2xl text-center text-sm font-bold border border-red-200">
        Failed to load locations: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Warehouse Locations</h1>
          <p className="text-slate-500 font-medium">Manage storage zones, dynamic item placements, and batch lots.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-gold hover:bg-brand-gold-hover text-white rounded-xl text-sm font-black shadow-lg shadow-brand-gold/20 transition-all active:scale-95"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredLocations.map((loc) => {
          const totalUsed = getLocationTotals(loc.assignedMaterials);
          const capacityPercentage = Math.min(Math.round((totalUsed / (loc.maxStorageUnits || 1)) * 100), 100);
          
          return (
            <motion.div 
              layout
              key={loc._id} 
              className="bg-white/60 backdrop-blur-xl border border-white/60 p-5 rounded-3xl hover:border-brand-gold/50 hover:shadow-lg transition-all duration-300 group relative flex flex-col justify-between shadow-sm"
            >
              <div>
                {/* Actions */}
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(loc)} className="p-2 bg-white rounded-xl shadow-sm hover:bg-brand-gold hover:text-white transition-colors border border-slate-100 text-slate-600"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(loc._id)} className="p-2 bg-white rounded-xl shadow-sm hover:bg-red-500 hover:text-white transition-colors border border-slate-100 text-red-500"><Trash2 size={14} /></button>
                </div>

                <div className="mb-5">
                  <h3 className="font-black text-slate-900 text-lg leading-tight pr-14 truncate">{loc.designation}</h3>
                  <div className="flex gap-2 mt-1.5">
                    <span className="inline-block text-[9px] bg-white border border-slate-200/60 px-2 py-0.5 rounded-md font-black text-slate-600 uppercase tracking-wider shadow-sm">{loc.storageCategory}</span>
                    <span className="inline-block text-[9px] bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-md font-black uppercase tracking-wider shadow-sm">Shelf: {loc.level || 'N/A'}</span>
                  </div>
                </div>

                {/* Sub-Inventory List Breakdown */}
                <div className="border-t border-slate-200/60 pt-4 mb-4 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Layers size={14} className="text-brand-gold"/> Content Breakdown</p>
                  {!loc.assignedMaterials || loc.assignedMaterials.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium italic py-2 bg-white/40 rounded-xl text-center">Empty location</p>
                  ) : (
                    <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                      {loc.assignedMaterials.map((inv) => (
                        <div key={inv._id || Math.random()} className="bg-white/80 border border-slate-200 p-2.5 rounded-xl flex justify-between items-center text-xs shadow-sm">
                          <div className="overflow-hidden mr-2">
                            <p className="font-bold text-slate-900 truncate">{inv.itemReference}</p>
                            <p className="text-[10px] font-mono font-medium text-slate-500 truncate mt-0.5">Lot: {inv.lotBatchId}</p>
                          </div>
                          <span className="font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg text-[11px] min-w-[36px] text-center shrink-0">
                            {inv.allocatedQty}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Progress Utilization Tracker */}
              <div className="space-y-2 pt-4 border-t border-slate-200/60 mt-auto">
                <div className="flex justify-between text-[11px] font-black text-slate-500">
                  <span>Capacity: {totalUsed} / {loc.maxStorageUnits}</span>
                  <span className={capacityPercentage >= 90 ? 'text-red-500' : 'text-brand-gold'}>{capacityPercentage}%</span>
                </div>
                <div className="w-full h-2 bg-white/80 border border-slate-100 rounded-full overflow-hidden shadow-inner">
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
              className="relative w-full max-w-md h-full bg-white shadow-2xl border-l border-slate-200 p-6 md:p-8 overflow-y-auto flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                  <h2 className="text-xl font-black text-slate-900">{activeLocation ? 'Edit Location Architecture' : 'New Storage Location'}</h2>
                  <button disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
                </div>
                
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block pl-1">Location Designation <span className="text-red-400">*</span></label>
                      <input 
                        type="text" 
                        placeholder="e.g., Aisle 4-C"
                        required
                        disabled={isSubmitting}
                        value={formData.designation}
                        onChange={(e) => setFormData({...formData, designation: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all disabled:opacity-50" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block pl-1">Max Storage Units <span className="text-red-400">*</span></label>
                      <input 
                        type="number" 
                        min="1"
                        required
                        disabled={isSubmitting}
                        value={formData.maxStorageUnits}
                        onChange={(e) => setFormData({...formData, maxStorageUnits: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all disabled:opacity-50" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block pl-1">Storage Category</label>
                      <select 
                        value={formData.storageCategory}
                        disabled={isSubmitting}
                        onChange={(e) => setFormData({...formData, storageCategory: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all cursor-pointer disabled:opacity-50"
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
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block pl-1">Shelf / Row Level</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Tier 3"
                        disabled={isSubmitting}
                        value={formData.level}
                        onChange={(e) => setFormData({...formData, level: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all disabled:opacity-50" 
                      />
                    </div>
                  </div>

                  {/* Multi-item Dynamic Allocation Form Space */}
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Assigned Material Records</label>
                      <button 
                        type="button" 
                        disabled={isSubmitting}
                        onClick={addInventoryLine} 
                        className="flex items-center gap-1.5 text-[10px] font-black text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors uppercase disabled:opacity-50"
                      >
                        <Plus size={12}/> Mix Item
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 scrollbar-hide">
                      {formData.assignedMaterials.map((line, idx) => (
                        <div key={line.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative space-y-3 shadow-sm">
                          {formData.assignedMaterials.length > 1 && (
                            <button 
                              type="button" 
                              disabled={isSubmitting}
                              onClick={() => removeInventoryLine(line.id)} 
                              className="absolute top-3 right-3 text-slate-400 hover:text-red-500 bg-white p-1 rounded-md shadow-sm border border-slate-100 transition-colors disabled:opacity-50"
                            >
                              <Minus size={12}/>
                            </button>
                          )}
                          <div className="pr-6">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Item / SKU Reference</label>
                            <input 
                              type="text"
                              placeholder="e.g., Shipping Box L"
                              disabled={isSubmitting}
                              value={line.itemReference}
                              onChange={(e) => updateInventoryLine(line.id, 'itemReference', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 mt-1 transition-all disabled:opacity-50"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Lot Batch ID</label>
                              <input 
                                type="text"
                                placeholder="e.g., LOT-9912"
                                disabled={isSubmitting}
                                value={line.lotBatchId}
                                onChange={(e) => updateInventoryLine(line.id, 'lotBatchId', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 mt-1 transition-all disabled:opacity-50"
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
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 mt-1 transition-all disabled:opacity-50"
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
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-xl transition-all disabled:opacity-50 text-[11px] uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="flex-1 flex justify-center items-center py-3 bg-brand-gold hover:bg-brand-gold-hover text-white font-black rounded-xl shadow-lg shadow-brand-gold/20 transition-all active:scale-95 disabled:opacity-70 text-[11px] uppercase tracking-wider"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (activeLocation ? 'Save Changes' : 'Create Location')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}