import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Plus, Download, Trash2, Edit2, 
  Search, X, Eye, Loader2, ArrowRightLeft, DollarSign, Filter
} from 'lucide-react';

// Redux Thunks
import { 
  fetchReceivingLogs, 
  createReceivingLog, 
  updateReceivingLog, 
  deleteReceivingLog 
} from '../store/slices/receivingSlice';
import { fetchCustomers } from '../store/slices/customerSlice';
import { fetchInventory } from '../store/slices/inventorySlice';
import { fetchLocations } from '../store/slices/locationSlice';
import { fetchDivisions } from '../store/slices/divisionSlice';
import { fetchCategories } from '../store/slices/categorySlice';

// Providers
import { useConfirm } from '../providers/ConfirmProvider';

const INITIAL_FORM_STATE = {
  dateReceived: new Date().toISOString().split('T')[0],
  vendor: '',
  customer: '',
  division: '',     // Added for Cascading Filter
  category: '',     // Added for Cascading Filter
  inventoryItem: '',
  description: '',
  description2: '',
  lot: '',
  location: '',
  quantity: '',
  skids: '',
  cartonsPerSkid: '',
  unitsPerCarton: '',
  numberOfCartons: '',
  unitWeight: '',
  charge: ''
};

export default function ReceivingOrders() {
  const dispatch = useDispatch();
  const confirm = useConfirm();

  // --- Redux State ---
  const { items: receivingData = [], status } = useSelector(state => state.receiving || {});
  const { items: customers = [], status: custStatus } = useSelector(state => state.customers || {});
  const { items: inventory = [], status: invStatus } = useSelector(state => state.inventory || {});
  const { items: locations = [], status: locStatus } = useSelector(state => state.locations || {});
  const { items: divisions = [], status: divStatus } = useSelector(state => state.divisions || {});
  const { items: categories = [], status: catStatus } = useSelector(state => state.categories || {});

  // Load all required data on mount
  useEffect(() => {
    if (status === 'idle') dispatch(fetchReceivingLogs());
    if (custStatus === 'idle') dispatch(fetchCustomers());
    if (invStatus === 'idle') dispatch(fetchInventory());
    if (locStatus === 'idle') dispatch(fetchLocations());
    if (divStatus === 'idle') dispatch(fetchDivisions());
    if (catStatus === 'idle') dispatch(fetchCategories());
  }, [status, custStatus, invStatus, locStatus, divStatus, catStatus, dispatch]);

  // --- UI State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRecordId, setActiveRecordId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // --- Filter State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // --- Data Processing (Table) ---
  const filteredData = useMemo(() => {
    return receivingData.filter(row => {
      const searchTarget = searchTerm.toLowerCase();
      
      const vendor = row.vendor?.toLowerCase() || '';
      const customerName = row.customer?.customerName?.toLowerCase() || '';
      const itemName = row.inventoryItem?.itemName?.toLowerCase() || '';
      const receivingId = row.receivingId?.toLowerCase() || '';

      const matchesSearch = vendor.includes(searchTarget) || 
                            customerName.includes(searchTarget) || 
                            itemName.includes(searchTarget) ||
                            receivingId.includes(searchTarget);

      const rowDate = new Date(row.dateReceived).toISOString().split('T')[0];
      const matchesFrom = !fromDate || rowDate >= fromDate;
      const matchesTo = !toDate || rowDate <= toDate;

      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [receivingData, searchTerm, fromDate, toDate]);

  // --- CASCADING DROPDOWN LOGIC ---

  // 1. Available Divisions (Filtered by Selected Customer's existing inventory)
  const availableDivisions = useMemo(() => {
    if (!formData.customer) return [];
    
    // Find all divisions tied to inventory items owned by this customer
    const validDivIds = new Set(
      inventory
        .filter(inv => (inv.customer?._id || inv.customer) === formData.customer)
        .flatMap(inv => inv.divisions?.map(d => d._id || d) || [])
    );
    return divisions.filter(d => validDivIds.has(d._id));
  }, [inventory, divisions, formData.customer]);

  // 2. Available Categories (Filtered by Selected Customer AND Selected Division)
  const availableCategories = useMemo(() => {
    if (!formData.customer || !formData.division) return [];
    
    const validCatIds = new Set(
      inventory
        .filter(inv => 
          (inv.customer?._id || inv.customer) === formData.customer &&
          inv.divisions?.some(d => (d._id || d) === formData.division)
        )
        .flatMap(inv => inv.categories?.map(c => c._id || c) || [])
    );
    return categories.filter(c => validCatIds.has(c._id));
  }, [inventory, categories, formData.customer, formData.division]);

  // 3. Final Available Inventory (Filtered by Customer + Division + Category)
  const availableInventory = useMemo(() => {
    if (!formData.customer || !formData.division || !formData.category) return [];
    
    return inventory.filter(inv => 
      (inv.customer?._id || inv.customer) === formData.customer &&
      inv.divisions?.some(d => (d._id || d) === formData.division) &&
      inv.categories?.some(c => (c._id || c) === formData.category)
    );
  }, [inventory, formData.customer, formData.division, formData.category]);

  // Cascade Change Handlers (Clears downstream fields when upstream changes)
  const handleCustomerChange = (e) => {
    setFormData({ ...formData, customer: e.target.value, division: '', category: '', inventoryItem: '' });
  };
  const handleDivisionChange = (e) => {
    setFormData({ ...formData, division: e.target.value, category: '', inventoryItem: '' });
  };
  const handleCategoryChange = (e) => {
    setFormData({ ...formData, category: e.target.value, inventoryItem: '' });
  };

  // --- Modal Controls ---
  const openNewModal = () => {
    setActiveRecordId(null);
    setFormData(INITIAL_FORM_STATE);
    setIsModalOpen(true);
  };

  const openEditModal = (row) => {
    setActiveRecordId(row._id);
    
    // Reverse-engineer the Division and Category to pre-fill the cascading dropdowns
    const invId = row.inventoryItem?._id || row.inventoryItem;
    const matchedInv = inventory.find(i => i._id === invId);
    const mappedDivision = matchedInv?.divisions?.[0]?._id || matchedInv?.divisions?.[0] || '';
    const mappedCategory = matchedInv?.categories?.[0]?._id || matchedInv?.categories?.[0] || '';

    setFormData({
      dateReceived: new Date(row.dateReceived).toISOString().split('T')[0],
      vendor: row.vendor || '',
      customer: row.customer?._id || row.customer || '',
      division: mappedDivision,
      category: mappedCategory,
      inventoryItem: invId || '',
      description: row.description || '',
      description2: row.description2 || '',
      lot: row.lot || '',
      location: row.location?._id || row.location || '',
      quantity: row.quantity || '',
      skids: row.skids || '',
      cartonsPerSkid: row.cartonsPerSkid || '',
      unitsPerCarton: row.unitsPerCarton || '',
      numberOfCartons: row.numberOfCartons || '',
      unitWeight: row.unitWeight || '',
      charge: row.charge || ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!isSubmitting) {
      setIsModalOpen(false);
      setTimeout(() => setActiveRecordId(null), 300);
    }
  };

  // --- CRUD Handlers ---
  const handleSaveShipment = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Filter out division & category since they are UI helpers, not DB schema fields
    const payload = {
      dateReceived: formData.dateReceived,
      vendor: formData.vendor,
      customer: formData.customer,
      inventoryItem: formData.inventoryItem,
      description: formData.description,
      description2: formData.description2,
      lot: formData.lot,
      location: formData.location || null, 
      quantity: Number(formData.quantity) || 0,
      skids: Number(formData.skids) || 0,
      cartonsPerSkid: Number(formData.cartonsPerSkid) || 0,
      unitsPerCarton: Number(formData.unitsPerCarton) || 0,
      numberOfCartons: Number(formData.numberOfCartons) || 0,
      unitWeight: Number(formData.unitWeight) || 0,
      charge: Number(formData.charge) || 0,
    };

    try {
      if (activeRecordId) {
        await dispatch(updateReceivingLog({ id: activeRecordId, updateData: payload })).unwrap();
      } else {
        await dispatch(createReceivingLog(payload)).unwrap();
      }
      closeModal();
    } catch (err) {
      alert(`Error saving receiving log: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Receiving Record?',
      message: 'Are you sure you want to permanently delete this inbound shipment record? Financial and inventory logs may be impacted.',
      confirmText: 'Delete Record',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        await dispatch(deleteReceivingLog(id)).unwrap();
      } catch (err) {
        console.error("Failed to delete receiving log:", err);
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFromDate('');
    setToDate('');
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Receiving ID', 'Vendor', 'Customer', 'Inventory Item', 'Lot', 'Location', 'Qty', 'Skids'];
    const csvContent = [
      headers.join(','), 
      ...filteredData.map(row => [
        new Date(row.dateReceived).toLocaleDateString(),
        row.receivingId,
        `"${row.vendor || ''}"`,
        `"${row.customer?.customerName || ''}"`,
        `"${row.inventoryItem?.itemName || ''}"`,
        `"${row.lot || ''}"`,
        `"${row.location?.designation || 'Unassigned'}"`,
        row.quantity,
        row.skids
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receiving-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Render Loader
  if (status === 'loading' && receivingData.length === 0) {
    return (
      <div className="h-full flex justify-center items-center py-20 text-slate-400">
        <Loader2 className="animate-spin text-brand-gold" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in-right relative max-w-[1500px] mx-auto p-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="text-brand-gold" size={24} /> Receiving Logs
          </h1>
          <p className="text-slate-500 font-medium mt-1">Manage and confirm inbound shipments.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-black text-slate-700 shadow-sm transition-all active:scale-95 uppercase tracking-wider">
            <Download size={16} /> Export
          </button>
          <button 
            onClick={openNewModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-brand-gold rounded-xl text-sm font-black shadow-lg shadow-slate-900/20 transition-all active:scale-95 uppercase tracking-wider"
          >
            <Plus size={16} /> Add Receipt
          </button>
        </div>
      </div>

      {/* Filter Board */}
      <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-4 rounded-[2rem] flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex-[2] min-w-[200px] relative">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Search Database</label>
          <div className="relative">
            <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by ID, Vendor, Customer, or Item..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-11 pr-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none transition-all" 
            />
          </div>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Received From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none transition-all cursor-pointer" />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Received To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none transition-all cursor-pointer" />
        </div>
        {(searchTerm || fromDate || toDate) && (
          <button onClick={clearFilters} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors">
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Main Data Table */}
      <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200/60 bg-slate-50/50">
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">RCV ID</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory Item</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Skids</th>
                <th className="p-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {filteredData.length > 0 ? (
                filteredData.map((row) => (
                  <tr key={row._id} className="hover:bg-white/80 transition-colors group">
                    <td className="p-5 text-xs font-bold text-slate-500 whitespace-nowrap">
                      {new Date(row.dateReceived).toLocaleDateString()}
                    </td>
                    <td className="p-5 text-xs font-mono font-black text-brand-gold tracking-wider bg-brand-gold/5 rounded-xl m-2 inline-flex border border-brand-gold/10">
                      {row.receivingId}
                    </td>
                    <td className="p-5 text-sm font-black text-slate-800">{row.vendor}</td>
                    <td className="p-5 text-sm font-semibold text-slate-600">{row.customer?.customerName || '—'}</td>
                    <td className="p-5 text-sm font-bold text-slate-900">
                      <div className="flex flex-col">
                        <span>{row.inventoryItem?.itemName || '—'}</span>
                        {row.lot !== 'N/A' && <span className="text-[10px] text-slate-400 font-mono mt-0.5">Lot: {row.lot}</span>}
                      </div>
                    </td>
                    <td className="p-5 text-xs font-bold text-slate-600">
                      {row.location?.designation ? (
                        <span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">{row.location.designation}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-5 text-sm font-black text-emerald-700 text-center">{Number(row.quantity).toLocaleString()}</td>
                    <td className="p-5 text-sm font-bold text-slate-600 text-center">{row.skids}</td>
                    <td className="p-5 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Link to={`/receiving/${row._id}`} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-brand-gold transition-colors border border-transparent hover:border-slate-100 shadow-sm"><Eye size={16} /></Link>
                        <button onClick={() => openEditModal(row)} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-brand-gold transition-colors border border-transparent hover:border-slate-100 shadow-sm"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(row._id)} className="p-2 hover:bg-red-50 hover:border-red-100 rounded-xl text-slate-400 hover:text-red-500 transition-colors border border-transparent shadow-sm"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="py-16 text-center text-slate-400 font-bold text-sm bg-white/30">
                    No receiving logs found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-Over Modal Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" 
              onClick={closeModal} 
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg h-full bg-white shadow-2xl border-l border-slate-200 p-6 md:p-8 overflow-y-auto flex flex-col"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Package className="text-brand-gold" size={20} />
                  {activeRecordId ? 'Edit Receiving Log' : 'New Inbound Receipt'}
                </h2>
                <button onClick={closeModal} disabled={isSubmitting} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
              </div>
              
              <form onSubmit={handleSaveShipment} className="flex-1 flex flex-col gap-y-5">
                
                {/* Section 1: Core Logistics */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Date Received <span className="text-red-400">*</span></label>
                      <input required type="date" value={formData.dateReceived} onChange={(e) => setFormData({...formData, dateReceived: e.target.value})} disabled={isSubmitting} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all cursor-pointer" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Vendor <span className="text-red-400">*</span></label>
                      <input required type="text" placeholder="e.g., Ace Displays" value={formData.vendor} onChange={(e) => setFormData({...formData, vendor: e.target.value})} disabled={isSubmitting} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Customer / Depositor <span className="text-red-400">*</span></label>
                    <select required value={formData.customer} onChange={handleCustomerChange} disabled={isSubmitting} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all cursor-pointer">
                      <option value="">1. Select Customer...</option>
                      {customers.map(c => <option key={c._id} value={c._id}>{c.customerName}</option>)}
                    </select>
                  </div>
                </div>

                {/* Section 2: Cascading Catalog Filter */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Filter className="text-brand-gold" size={14} />
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Inventory Filtering Pipeline</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Division Segment</label>
                      <select 
                        value={formData.division} 
                        onChange={handleDivisionChange} 
                        disabled={!formData.customer || isSubmitting || availableDivisions.length === 0} 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all cursor-pointer disabled:opacity-50"
                      >
                        <option value="">2. Select Division...</option>
                        {availableDivisions.map(d => <option key={d._id} value={d._id}>{d.divisionName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Product Category</label>
                      <select 
                        value={formData.category} 
                        onChange={handleCategoryChange} 
                        disabled={!formData.division || isSubmitting || availableCategories.length === 0} 
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all cursor-pointer disabled:opacity-50"
                      >
                        <option value="">3. Select Category...</option>
                        {availableCategories.map(c => <option key={c._id} value={c._id}>{c.categoryName}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Inventory Asset <span className="text-red-400">*</span></label>
                    <select 
                      required 
                      value={formData.inventoryItem} 
                      onChange={(e) => setFormData({...formData, inventoryItem: e.target.value})} 
                      disabled={!formData.category || isSubmitting || availableInventory.length === 0} 
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all cursor-pointer disabled:opacity-50 ${formData.category && availableInventory.length > 0 ? 'bg-brand-gold/5 border-brand-gold/30 text-slate-900' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    >
                      <option value="">4. Select Final Asset...</option>
                      {availableInventory.map(inv => <option key={inv._id} value={inv._id}>{inv.sku} — {inv.itemName}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Lot / Batch ID</label>
                      <input type="text" placeholder="e.g., LOT-8812" value={formData.lot} onChange={(e) => setFormData({...formData, lot: e.target.value})} disabled={isSubmitting} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Storage Location</label>
                      <select value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} disabled={isSubmitting} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all cursor-pointer">
                        <option value="">Unassigned</option>
                        {locations.map(loc => <option key={loc._id} value={loc._id}>{loc.designation} ({loc.storageCategory})</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Description 1</label>
                      <input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} disabled={isSubmitting} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Description 2</label>
                      <input type="text" value={formData.description2} onChange={(e) => setFormData({...formData, description2: e.target.value})} disabled={isSubmitting} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all" />
                    </div>
                  </div>
                </div>

                {/* Section 3: Quantitative Metrics */}
                <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4 mt-2">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Quantitative Metrics</h3>
                  
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block pl-1">Total Quantity Received <span className="text-red-400">*</span></label>
                    <input required type="number" min="0" placeholder="0" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} disabled={isSubmitting} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-base font-black text-brand-gold text-center outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all shadow-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Skids</label>
                      <input type="number" min="0" value={formData.skids} onChange={(e) => setFormData({...formData, skids: e.target.value})} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Cartons Per Skid</label>
                      <input type="number" min="0" value={formData.cartonsPerSkid} onChange={(e) => setFormData({...formData, cartonsPerSkid: e.target.value})} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Units Per Carton</label>
                      <input type="number" min="0" value={formData.unitsPerCarton} onChange={(e) => setFormData({...formData, unitsPerCarton: e.target.value})} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Total Cartons</label>
                      <input type="number" min="0" value={formData.numberOfCartons} onChange={(e) => setFormData({...formData, numberOfCartons: e.target.value})} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Unit Wt (lbs)</label>
                      <input type="number" step="0.01" min="0" value={formData.unitWeight} onChange={(e) => setFormData({...formData, unitWeight: e.target.value})} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1 flex items-center gap-1"><DollarSign size={10}/> Applied Charge</label>
                      <input type="number" step="0.01" min="0" value={formData.charge} onChange={(e) => setFormData({...formData, charge: e.target.value})} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all" />
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-auto pt-6 border-t border-slate-100 flex gap-3">
                  <button type="button" onClick={closeModal} disabled={isSubmitting} className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all disabled:opacity-50 text-[11px] uppercase tracking-widest">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 flex justify-center items-center py-3.5 bg-slate-900 hover:bg-slate-800 text-brand-gold font-black rounded-2xl shadow-xl shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-70 text-[11px] uppercase tracking-widest">
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (activeRecordId ? 'Save Updates' : 'Confirm Receipt')}
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