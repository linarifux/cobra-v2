import React, { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { 
  Package, Search, Plus, Trash2, Edit2, X, Layers, Loader2, 
  AlertTriangle, DollarSign, Activity 
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Redux Actions
import { createInventory, updateInventory, deleteInventory } from '../../store/slices/inventorySlice';
import { useConfirm } from '../../providers/ConfirmProvider';

const INITIAL_FORM_STATE = {
  productCode: '',
  itemName: '',
  sku: '',
  status: 'Active',
  price: '',
  unitCost: '',
  available: '',
  min: '',
  max: '',
  description: ''
};

export default function InventoriesOfDivision({ division, inventory = [] }) {
  const dispatch = useDispatch();
  const confirm = useConfirm();

  // --- UI State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  
  // --- Form State ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // --- Data Filtering ---
  const filteredInventory = useMemo(() => {
    if (!searchTerm) return inventory;
    const lowerSearch = searchTerm.toLowerCase();
    return inventory.filter(item => 
      item.itemName?.toLowerCase().includes(lowerSearch) ||
      item.productCode?.toLowerCase().includes(lowerSearch) ||
      item.sku?.toLowerCase().includes(lowerSearch)
    );
  }, [inventory, searchTerm]);

  // --- Handlers ---
  const openAddPanel = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData(INITIAL_FORM_STATE);
    setShowPanel(true);
  };

  const openEditPanel = (item) => {
    setIsEditMode(true);
    setEditingId(item._id);
    setFormData({
      productCode: item.productCode || '',
      itemName: item.itemName || '',
      sku: item.sku || '',
      status: item.status || 'Active',
      price: item.price || '',
      unitCost: item.unitCost || '',
      available: item.available ?? '',
      min: item.min ?? '',
      max: item.max ?? '',
      description: item.description || ''
    });
    setShowPanel(true);
  };

  const handleClosePanel = () => {
    if (!isSubmitting) setShowPanel(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productCode.trim() || !formData.itemName.trim()) {
      return toast.warning('Missing Fields', { description: 'Product Code and Item Name are required.' });
    }

    setIsSubmitting(true);
    
    // Structure payload & enforce numeric typing based on Mongoose schema
    const payload = {
      productCode: formData.productCode.trim(),
      itemName: formData.itemName.trim(),
      sku: formData.sku?.trim().toUpperCase(),
      status: formData.status,
      description: formData.description?.trim(),
      
      // Numerics
      price: Number(formData.price) || 0,
      unitCost: Number(formData.unitCost) || 0,
      available: Number(formData.available) || 0,
      min: Number(formData.min) || 0,
      max: Number(formData.max) || 0,

      // Bind relational boundaries
      division: division._id,
      customer: division.customer?._id || division.customer
    };

    try {
      let actionPromise;
      if (isEditMode) {
        actionPromise = dispatch(updateInventory({ id: editingId, inventoryData: payload })).unwrap();
        toast.promise(actionPromise, { loading: 'Updating item...', success: 'Inventory item updated.', error: 'Failed to update.' });
      } else {
        actionPromise = dispatch(createInventory(payload)).unwrap();
        toast.promise(actionPromise, { loading: 'Creating item...', success: 'New inventory item added.', error: 'Failed to create.' });
      }
      
      await actionPromise;
      setShowPanel(false);
    } catch (error) {
      console.error("Failed to save inventory:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    const isConfirmed = await confirm({
      title: 'Delete Inventory Item?',
      message: `Are you sure you want to permanently remove "${item.itemName}" (${item.productCode})? This action will also remove associated audit ledgers.`,
      confirmText: 'Delete Item',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        const actionPromise = dispatch(deleteInventory(item._id)).unwrap();
        toast.promise(actionPromise, {
          loading: 'Deleting inventory...',
          success: 'Inventory item successfully removed.',
          error: 'Failed to delete item.'
        });
        await actionPromise;
      } catch (err) {
        console.error("Delete Error:", err);
      }
    }
  };

  // Utility to calculate stock health
  const getStockStatus = (available, min) => {
    if (available <= 0) return { label: 'Out of Stock', classes: 'bg-red-50 text-red-600 border-red-200' };
    if (available <= min) return { label: 'Low Stock', classes: 'bg-amber-50 text-amber-600 border-amber-200' };
    return { label: 'In Stock', classes: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-6 border-b border-slate-200/60">
        <div className="flex-1 w-full max-w-md relative">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Search Inventory</label>
          <div className="relative">
            <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by Name, Code, or SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        <button 
          onClick={openAddPanel}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-sm shrink-0"
        >
          <Plus size={14} /> New Item
        </button>
      </div>

      {/* 2. Inventory List View */}
      {filteredInventory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-50/50 rounded-[2rem] border border-slate-200 border-dashed">
          <Package size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-black text-slate-700 tracking-tight mb-1">No Inventory Found</h3>
          <p className="text-sm font-bold text-slate-400 max-w-sm">
            {searchTerm 
              ? `No items matched your search for "${searchTerm}".`
              : "This division has no inventory items registered yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[1.5rem] shadow-sm overflow-hidden flex flex-col">
          
          {/* List Header */}
          <div className="flex items-center px-6 py-4 bg-slate-50/50 border-b border-slate-100 hidden sm:flex">
            <div className="flex-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Profile</div>
            <div className="w-1/4 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Stock Levels</div>
            <div className="w-1/4 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Pricing</div>
            <div className="w-32 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</div>
          </div>

          {/* List Body */}
          <div className="flex flex-col divide-y divide-slate-100">
            <AnimatePresence>
              {filteredInventory.map((item) => {
                const stockHealth = getStockStatus(item.available, item.min);
                const isInactive = item.status === 'Inactive';

                return (
                  <motion.div 
                    key={item._id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className={`flex flex-col sm:flex-row sm:items-center px-6 py-4 hover:bg-slate-50/50 transition-colors group gap-4 sm:gap-0 ${isInactive && 'opacity-60 grayscale-[30%]'}`}
                  >
                    {/* Column 1: Identity */}
                    <div className="flex-1 flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 group-hover:border-brand-gold/30 group-hover:bg-white transition-colors overflow-hidden">
                        {item.productImage ? (
                          <img src={item.productImage} alt={item.itemName} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={18} className="text-slate-400 group-hover:text-brand-gold transition-colors" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 truncate" title={item.itemName}>
                            {item.itemName}
                          </h4>
                          {isInactive && (
                            <span className="text-[9px] font-black uppercase tracking-widest bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">Inactive</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded tracking-widest uppercase">
                            {item.productCode}
                          </span>
                          {item.sku && (
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-l border-slate-200 pl-2">
                              SKU: {item.sku}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Quantities */}
                    <div className="w-full sm:w-1/4 sm:pl-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-slate-900 leading-none">{item.available}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Available</span>
                        </div>
                        <span className={`inline-flex items-center w-max px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${stockHealth.classes}`}>
                          {stockHealth.label} (Min: {item.min})
                        </span>
                      </div>
                    </div>

                    {/* Column 3: Pricing */}
                    <div className="w-full sm:w-1/4 sm:pl-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-slate-700 flex items-center">
                          <DollarSign size={14} className="text-slate-400 mr-0.5"/> 
                          {Number(item.price || 0).toFixed(2)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Activity size={10} /> Cost: ${Number(item.unitCost || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Column 4: Actions */}
                    <div className="w-full sm:w-32 flex justify-end gap-2 shrink-0">
                      <button 
                        onClick={() => openEditPanel(item)}
                        className="p-2 text-slate-400 bg-white border border-slate-200 rounded-xl hover:text-brand-gold hover:border-brand-gold/50 shadow-sm transition-all" 
                        title="Edit Item"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item)}
                        className="p-2 text-slate-400 bg-white border border-slate-200 rounded-xl hover:text-red-600 hover:bg-red-50 hover:border-red-200 shadow-sm transition-all" 
                        title="Delete Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* 3. Slide-Over Panel for Add/Edit */}
      <AnimatePresence>
        {showPanel && (
          <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={handleClosePanel}
            />
            
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col border-l border-slate-200"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Package className="text-brand-gold" size={20} />
                  {isEditMode ? 'Edit Inventory Item' : 'New Inventory Item'}
                </h3>
                <button onClick={handleClosePanel} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                <div className="space-y-6">
                  
                  {/* Readonly Context Header */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Target Division</span>
                    <span className="font-bold text-slate-700">{division?.divisionName}</span>
                  </div>

                  {/* Core Identification */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Identification</h4>
                    
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Product Code <span className="text-red-400">*</span></label>
                      <input 
                        type="text" required placeholder="e.g. WIDGET-101"
                        value={formData.productCode} onChange={(e) => setFormData({...formData, productCode: e.target.value.toUpperCase()})} disabled={isSubmitting}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold font-mono uppercase text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none shadow-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Item Name <span className="text-red-400">*</span></label>
                      <input 
                        type="text" required placeholder="e.g. Standard Titanium Widget"
                        value={formData.itemName} onChange={(e) => setFormData({...formData, itemName: e.target.value})} disabled={isSubmitting}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">SKU / Barcode</label>
                      <input 
                        type="text" placeholder="Optional SKU"
                        value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value.toUpperCase()})} disabled={isSubmitting}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold font-mono uppercase text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Quantitative Data */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Stock Levels</h4>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Available</label>
                        <input 
                          type="number" min="0" placeholder="0"
                          value={formData.available} onChange={(e) => setFormData({...formData, available: e.target.value})} disabled={isSubmitting}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-center text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Min Threshold</label>
                        <input 
                          type="number" min="0" placeholder="0"
                          value={formData.min} onChange={(e) => setFormData({...formData, min: e.target.value})} disabled={isSubmitting}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-center text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Max Capacity</label>
                        <input 
                          type="number" min="0" placeholder="0"
                          value={formData.max} onChange={(e) => setFormData({...formData, max: e.target.value})} disabled={isSubmitting}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-center text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pricing Data */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Pricing ($)</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Retail Price</label>
                        <input 
                          type="number" step="0.01" min="0" placeholder="0.00"
                          value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} disabled={isSubmitting}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Unit Cost</label>
                        <input 
                          type="number" step="0.01" min="0" placeholder="0.00"
                          value={formData.unitCost} onChange={(e) => setFormData({...formData, unitCost: e.target.value})} disabled={isSubmitting}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Toggles & Details */}
                  <div className="space-y-4 pt-2 pb-6">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Additional Settings</h4>
                    
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Status</label>
                      <select 
                        value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} disabled={isSubmitting}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none shadow-sm cursor-pointer"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Description</label>
                      <textarea 
                        rows="3" placeholder="Item description..."
                        value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none shadow-sm resize-none custom-scrollbar"
                      />
                    </div>
                  </div>

                </div>

                {/* Footer Action Button */}
                <div className="mt-auto pt-6 border-t border-slate-100">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-brand-gold font-black py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-70 text-xs uppercase tracking-widest"
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (isEditMode ? 'Save Updates' : 'Deploy Item')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}