import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Search, PlusCircle, Filter, Package, Trash2, Edit, X, 
  Tag, MapPin, User, DollarSign, ExternalLink, ImageIcon, Loader2 
} from 'lucide-react';

// Redux Actions
import { fetchInventory, createInventory, updateInventory, deleteInventory } from '../store/slices/inventorySlice';
import { fetchCustomers } from '../store/slices/customerSlice';
import { fetchDivisions } from '../store/slices/divisionSlice';
import { fetchCategories } from '../store/slices/categorySlice';

export default function InventoryPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Safely access Redux state
  const { items: apiInventory = [], status: invStatus } = useSelector(state => state.inventory || {});
  const { items: apiCustomers = [], status: custStatus } = useSelector(state => state.customers || {});
  const { items: apiDivisions = [], status: divStatus } = useSelector(state => state.divisions || {});
  const { items: apiCategories = [], status: catStatus } = useSelector(state => state.categories || {});

  // Load external collections on mount
  useEffect(() => {
    if (invStatus === 'idle') dispatch(fetchInventory());
    if (custStatus === 'idle') dispatch(fetchCustomers());
    if (divStatus === 'idle') dispatch(fetchDivisions());
    if (catStatus === 'idle') dispatch(fetchCategories());
  }, [invStatus, custStatus, divStatus, catStatus, dispatch]);

  const [showFormPanel, setShowFormPanel] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Unified Form Data State
  const [formData, setFormData] = useState({
    code: '', image: '', desc: '', customer: '', division: '',
    category: '', location: '', price: 0, available: 0, onOrder: 0, minThreshold: 20
  });

  // Filtering Conditions States
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // Ensure form has default selections once data loads
  useEffect(() => {
    if (!isEditMode && showFormPanel) {
      setFormData(prev => ({
        ...prev,
        customer: prev.customer || apiCustomers[0]?._id || '',
        division: prev.division || apiDivisions[0]?._id || '',
        category: prev.category || apiCategories[0]?._id || ''
      }));
    }
  }, [apiCustomers, apiDivisions, apiCategories, showFormPanel, isEditMode]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, image: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const openAddMode = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData({
      code: '', image: '', desc: '', 
      customer: apiCustomers[0]?._id || '', 
      division: apiDivisions[0]?._id || '',
      category: apiCategories[0]?._id || '', 
      location: 'Warehouse Alpha - A3', 
      price: 0, available: 0, onOrder: 0, minThreshold: 20
    });
    setShowFormPanel(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEditMode = (item) => {
    setIsEditMode(true);
    setEditingId(item.id);
    // Crucial Fix: Map the string IDs back to the form so the dropdowns highlight the correct value
    setFormData({ 
      code: item.code,
      desc: item.desc,
      customer: item.customerId, 
      division: item.divisionId,
      category: item.categoryId,
      location: item.location,
      price: item.price,
      available: item.available,
      onOrder: item.onOrder,
      minThreshold: item.minThreshold,
      image: item.image || ''
    });
    setShowFormPanel(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.desc || !formData.customer) return;
    setIsSubmitting(true);

    // Map UI state to backend MongoDB schema
    const payload = {
      sku: formData.code,
      itemName: formData.desc,
      customer: formData.customer,
      divisions: [formData.division], 
      categories: [formData.category], 
      locationCoordinates: formData.location,
      unitCost: Number(formData.price),
      unitsOnHand: Number(formData.available),
      pipelineSupply: Number(formData.onOrder),
      safetyBuffer: Number(formData.minThreshold || 20),
    };

    try {
      if (isEditMode) {
        await dispatch(updateInventory({ id: editingId, inventoryData: payload })).unwrap();
      } else {
        await dispatch(createInventory(payload)).unwrap();
      }
      setShowFormPanel(false);
    } catch (err) {
      console.error("Failed to save inventory:", err);
      alert(`Error saving inventory: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm("Are you sure you want to permanently delete this inventory asset item?")) {
      try {
        await dispatch(deleteInventory(id)).unwrap();
      } catch (err) {
        console.error("Failed to delete inventory:", err);
      }
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setDivisionFilter('All');
    setCategoryFilter('All');
    setOnlyAvailable(false);
  };

  // Map backend data into a flat UI structure for the table
  const mappedInventory = useMemo(() => {
    return apiInventory.map(item => ({
      id: item._id,
      code: item.sku,
      desc: item.itemName,
      customer: item.customer?.customerName || 'Unassigned',
      customerId: item.customer?._id || '',
      division: item.divisions?.[0]?.divisionName || 'Unassigned',
      divisionId: item.divisions?.[0]?._id || '',
      category: item.categories?.[0]?.categoryName || 'Unassigned',
      categoryId: item.categories?.[0]?._id || '',
      location: item.locationCoordinates || 'Unassigned',
      price: item.unitCost || 0,
      available: item.unitsOnHand || 0,
      onOrder: item.pipelineSupply || 0,
      minThreshold: item.safetyBuffer || 20,
      updatedAt: new Date(item.lastAuditedAt).toLocaleString(),
      updatedBy: item.lastAuditedBy || 'System'
    }));
  }, [apiInventory]);

  const filteredInventory = useMemo(() => {
    return mappedInventory.filter(item => {
      const query = search.toLowerCase().trim();
      const matchesSearch = query === '' || 
        item.desc.toLowerCase().includes(query) || 
        item.code.toLowerCase().includes(query) ||
        item.customer.toLowerCase().includes(query);
        
      const matchesDivision = divisionFilter === 'All' || item.divisionId === divisionFilter;
      const matchesCategory = categoryFilter === 'All' || item.categoryId === categoryFilter;
      const matchesStock = onlyAvailable ? item.available > 0 : true;

      return matchesSearch && matchesDivision && matchesCategory && matchesStock;
    });
  }, [search, divisionFilter, categoryFilter, onlyAvailable, mappedInventory]);

  if (invStatus === 'loading' && apiInventory.length === 0) {
    return (
      <div className="h-full flex justify-center items-center py-20 text-slate-400">
        <Loader2 className="animate-spin text-brand-gold" size={32} />
      </div>
    );
  }

  return (
    <div className="h-full max-w-[1400px] mx-auto p-6 space-y-6 animate-fade-in">
      {/* Registry Top Level Action Header */}
      <div className="flex justify-between items-center border-b border-slate-200/60 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Package size={24} className="text-slate-800" /> Customer Stock Inventory
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Track quantities, logistics, deposited items, and product assets linked to customer portal orders.</p>
        </div>
        <button 
          onClick={openAddMode}
          className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-slate-800 transition-all shadow-sm uppercase tracking-wider"
        >
          <PlusCircle size={15} /> Add New Asset Item
        </button>
      </div>

      {/* Drawer Management Input Panel (Add / Edit Form Actions) */}
      {showFormPanel && (
        <form onSubmit={handleFormSubmit} className="bg-white/70 backdrop-blur-md border border-slate-200/80 p-6 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/40">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              {isEditMode ? `Modify Item Node: ${formData.code}` : 'Register New Deposited Stock Item'}
            </h3>
            <button type="button" disabled={isSubmitting} onClick={() => setShowFormPanel(false)} className="text-slate-400 hover:text-slate-600 disabled:opacity-50"><X size={16} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-bold">
            {/* Image Placeholder */}
            <div className="md:col-span-2 lg:col-span-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-3 flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                {formData.image ? <img src={formData.image} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={18} className="text-slate-400" />}
              </div>
              <div className="space-y-1 flex-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Product Main Image Node</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-[11px] text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer disabled:opacity-50" disabled={isSubmitting} />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Item Code / SKU <span className="text-red-500">*</span></label>
              <input type="text" required placeholder="e.g. A0340" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 font-mono uppercase" disabled={isSubmitting} />
            </div>
            
            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Item Description Summary <span className="text-red-500">*</span></label>
              <input type="text" required placeholder="Asset title specifications..." value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20" disabled={isSubmitting}/>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Depositor / Customer <span className="text-red-500">*</span></label>
              <select required value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} disabled={isSubmitting || custStatus === 'loading'} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none h-[34px]">
                <option value="" disabled>Select active depositor...</option>
                {apiCustomers.map(cust => <option key={cust._id} value={cust._id}>{cust.customerName}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Operational Division</label>
              <select value={formData.division} onChange={e => setFormData({...formData, division: e.target.value})} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none h-[34px]">
                {apiDivisions.map(div => <option key={div._id} value={div._id}>{div.divisionName}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Category Classification</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none h-[34px]">
                {apiCategories.map(cat => <option key={cat._id} value={cat._id}>{cat.categoryName}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Logistics Vault Location</label>
              <input type="text" placeholder="e.g. Warehouse Alpha - A3" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 h-[34px]" disabled={isSubmitting}/>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Unit Value Cost ($)</label>
              <input type="number" step="0.01" min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20" disabled={isSubmitting}/>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Available On-Hand</label>
              <input type="number" min="0" value={formData.available} onChange={e => setFormData({...formData, available: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20" disabled={isSubmitting}/>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Pipeline Inbound</label>
              <input type="number" min="0" value={formData.onOrder} onChange={e => setFormData({...formData, onOrder: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20" disabled={isSubmitting}/>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Low Stock Cushion</label>
              <input type="number" min="0" value={formData.minThreshold} onChange={e => setFormData({...formData, minThreshold: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20" disabled={isSubmitting}/>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 lg:col-span-4 border-t border-slate-200/40 mt-2">
              <button type="button" disabled={isSubmitting} onClick={() => setShowFormPanel(false)} className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-black uppercase tracking-wider text-[10px] rounded-xl transition-colors disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="flex justify-center items-center min-w-[120px] px-6 py-2 bg-brand-gold hover:bg-brand-gold-hover text-white font-black uppercase tracking-wider text-[10px] rounded-xl shadow-lg shadow-brand-gold/20 transition-all disabled:opacity-70 h-[34px]">
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : (isEditMode ? 'Commit Changes' : 'Save Record')}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter Board Row */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-3xl flex flex-wrap gap-4 items-center text-xs font-bold text-slate-600 shadow-sm">
        <div className="flex items-center gap-1 text-slate-500 text-[11px] uppercase tracking-wider font-black shrink-0">
          <Filter size={14} className="text-brand-gold" /> Filter Matrix:
        </div>

        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-2 text-slate-400" size={14} />
          <input 
            placeholder="Search code, description, or customer accounts..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/60 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-slate-900 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 font-semibold"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">Division:</span>
          <select value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value)} className="bg-white/60 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 font-semibold">
            <option value="All">All Divisions</option>
            {apiDivisions.map(d => <option key={d._id} value={d._id}>{d.divisionName}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">Category:</span>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-white/60 border border-slate-200 rounded-xl px-2 py-1.5 text-slate-800 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 font-semibold">
            <option value="All">All Categories</option>
            {apiCategories.map(c => <option key={c._id} value={c._id}>{c.categoryName}</option>)}
          </select>
        </div>

        <label className="flex items-center gap-2 text-[11px] font-black uppercase text-slate-500 cursor-pointer select-none ml-2">
          <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} className="rounded text-brand-gold focus:ring-0 w-3.5 h-3.5 accent-brand-gold" />
          In Stock Only
        </label>

        {(divisionFilter !== 'All' || categoryFilter !== 'All' || onlyAvailable || search !== '') && (
          <button 
            onClick={handleClearFilters}
            className="flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors ml-auto"
          >
            <X size={12} /> Reset
          </button>
        )}
      </div>

      {/* Advanced Interactive Master Table */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/20 border-b border-white/40">
              <tr>
                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Identity SKU</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Description / Classification</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Customer Allocation</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Logistics Deployment</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Value Cost</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Stock Availability</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40 text-xs font-bold">
              {filteredInventory.length > 0 ? (
                filteredInventory.map((item) => {
                  const isLowStock = item.available <= item.minThreshold;
                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => navigate(`/inventory/${item.id}`)}
                      className="hover:bg-white/60 transition-colors group cursor-pointer"
                    >
                      {/* Interactive Identifier SKU */}
                      <td className="p-4 font-mono font-black text-slate-900 tracking-wider text-[13px]">
                        <span className="bg-white/60 border border-slate-200/60 group-hover:bg-brand-gold group-hover:border-brand-gold group-hover:text-white transition-all px-2 py-0.5 rounded-md flex items-center gap-1 w-max shadow-sm">
                          {item.code} <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                      </td>

                      {/* Summary Node */}
                      <td className="p-4 max-w-[300px]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/60 border border-slate-200/60 flex items-center justify-center shrink-0 text-slate-400 shadow-sm">
                            <Package size={16} />
                          </div>
                          <div className="truncate">
                            <p className="text-slate-900 text-[13px] font-black truncate group-hover:text-brand-gold transition-colors">{item.desc}</p>
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-white/60 border border-slate-200/60 text-slate-600 font-bold tracking-wide uppercase px-1.5 py-0.5 rounded-md">
                              <Tag size={10} className="text-slate-400" /> {item.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Customer / Account Assignment */}
                      <td className="p-4">
                        <div className="text-slate-700 flex items-center gap-1.5 text-[12px] font-bold">
                          <User size={12} className="text-brand-gold shrink-0" />
                          <span className="truncate max-w-[150px]">{item.customer}</span>
                        </div>
                      </td>

                      {/* Logistics Deployment */}
                      <td className="p-4 space-y-1">
                        <p className="text-slate-500 font-black uppercase tracking-wider text-[9px]">{item.division}</p>
                        <div className="flex items-center gap-1 text-slate-800 text-[11px] font-bold">
                          <MapPin size={11} className="text-brand-gold shrink-0" />
                          <span className="truncate max-w-[150px]">{item.location}</span>
                        </div>
                      </td>

                      {/* Cost Valuations */}
                      <td className="p-4 text-slate-900 font-mono text-[13px] font-black">
                        {item.price > 0 ? (
                          <span className="flex items-center">
                            <DollarSign size={12} className="text-slate-400 -mr-0.5" />
                            {item.price.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold text-[10px] tracking-widest uppercase bg-white/50 px-2 py-0.5 rounded-md border border-slate-200/60">N/A</span>
                        )}
                      </td>

                      {/* Stock Counters */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="space-y-1 text-center">
                            <span className={`inline-block min-w-[42px] px-2 py-0.5 rounded-md text-[11px] font-mono font-black border ${isLowStock ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200/60'}`}>
                              {item.available}
                            </span>
                            <span className="block text-[9px] font-bold tracking-wider text-slate-400 uppercase">Avail</span>
                          </div>
                          
                          {item.onOrder > 0 && (
                            <div className="space-y-1 border-l border-white/60 pl-3 text-center">
                              <span className="block text-[11px] text-blue-600 font-mono font-black">+{item.onOrder}</span>
                              <span className="block text-[9px] font-bold tracking-wider text-blue-400 uppercase">Inbound</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Modification Actions Bar (Using stopPropagation so clicks here don't trigger the row navigation) */}
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEditMode(item)}
                            className="p-2 text-slate-400 hover:text-brand-gold bg-white/40 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                            title="Modify Asset Node"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 text-slate-400 hover:text-red-500 bg-white/40 hover:bg-red-50 hover:border-red-100 rounded-xl transition-all shadow-sm border border-transparent"
                            title="Purge Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center font-bold text-slate-500 text-sm bg-white/10">
                    No active stock parameters matching your exact query criteria could be indexed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}