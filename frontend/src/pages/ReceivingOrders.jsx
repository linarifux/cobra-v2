import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Plus, Download, Trash2, Edit2, 
  Search, X, Eye, Loader2, ArrowRightLeft, DollarSign, Filter,
  AlertTriangle, RefreshCw
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
  carrier: '',
  vendorAddress: '',
  vendorCityStateZip: '',
  vendorPhone: '',
  customer: '',
  division: '',
  inventoryItem: '',
  description: '',
  description2: '',
  lot: '',
  location: '',
  
  // Quantitative fields
  cartonBreakdown: [{ id: Date.now(), cartons: '', unitsPerCarton: '', weightPerCarton: '' }],
  quantity: 0,
  numberOfCartons: 0,
  totalWeight: 0, // NEW: Grand total weight tracker
  
  skids: '',
  unitWeight: '', // Legacy / fallback single unit item weight
  charge: ''
};

export default function ReceivingOrders() {
  const dispatch = useDispatch();
  const confirm = useConfirm();

  // --- Redux State ---
  const { items: receivingData = [], status, error: recError } = useSelector(state => state.receiving || {});
  const { items: customers = [], status: custStatus } = useSelector(state => state.customers || {});
  const { items: inventory = [], status: invStatus } = useSelector(state => state.inventory || {});
  const { items: locations = [], status: locStatus } = useSelector(state => state.locations || {});
  const { items: divisions = [], status: divStatus } = useSelector(state => state.divisions || {});
  const { items: categories = [], status: catStatus } = useSelector(state => state.categories || {});

  // --- 1. ROBUST FETCHING LOGIC ---
  const loadAllData = () => {
    if (status === 'idle' || status === 'failed') dispatch(fetchReceivingLogs());
    if (custStatus === 'idle' || custStatus === 'failed') dispatch(fetchCustomers());
    if (invStatus === 'idle' || invStatus === 'failed') dispatch(fetchInventory());
    if (locStatus === 'idle' || locStatus === 'failed') dispatch(fetchLocations());
    if (divStatus === 'idle' || divStatus === 'failed') dispatch(fetchDivisions());
    if (catStatus === 'idle' || catStatus === 'failed') dispatch(fetchCategories());
  };

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // --- 2. GLOBAL LOADING & ERROR GATES ---
  const isGlobalLoading = 
    status === 'idle' || status === 'loading' ||
    custStatus === 'idle' || custStatus === 'loading' ||
    invStatus === 'idle' || invStatus === 'loading' ||
    locStatus === 'idle' || locStatus === 'loading' ||
    divStatus === 'idle' || divStatus === 'loading' ||
    catStatus === 'idle' || catStatus === 'loading';

  const hasGlobalError = 
    status === 'failed' || custStatus === 'failed' || 
    invStatus === 'failed' || locStatus === 'failed' || 
    divStatus === 'failed' || catStatus === 'failed';

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
    if (!Array.isArray(receivingData)) return [];
    return receivingData.filter(row => {
      const searchTarget = searchTerm.toLowerCase();
      
      const vendor = row.vendor?.toLowerCase() || '';
      const carrier = row.carrier?.toLowerCase() || '';
      const customerName = row.customer?.customerName?.toLowerCase() || '';
      const itemName = row.inventoryItem?.itemName?.toLowerCase() || '';
      const sku = row.inventoryItem?.sku?.toLowerCase() || row.inventoryItem?.productCode?.toLowerCase() || '';
      const receivingId = row.receivingId?.toLowerCase() || '';

      const matchesSearch = vendor.includes(searchTarget) || 
                            carrier.includes(searchTarget) ||
                            customerName.includes(searchTarget) || 
                            itemName.includes(searchTarget) ||
                            sku.includes(searchTarget) ||
                            receivingId.includes(searchTarget);

      const rowDate = new Date(row.dateReceived).toISOString().split('T')[0];
      const matchesFrom = !fromDate || rowDate >= fromDate;
      const matchesTo = !toDate || rowDate <= toDate;

      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [receivingData, searchTerm, fromDate, toDate]);

  // --- DYNAMIC FORM LOGIC ---
  const availableDivisions = useMemo(() => {
    if (!formData.customer) return [];
    const validDivIds = new Set(
      inventory
        .filter(inv => (inv.customer?._id || inv.customer) === formData.customer && inv.division)
        .map(inv => inv.division?._id || inv.division)
    );
    return divisions.filter(d => validDivIds.has(d._id));
  }, [inventory, divisions, formData.customer]);

  const availableInventory = useMemo(() => {
    if (!formData.customer || !formData.division) return [];
    
    return inventory.filter(inv => {
      const matchCust = (inv.customer?._id || inv.customer) === formData.customer;
      const matchDiv = (inv.division?._id || inv.division) === formData.division;
      return matchCust && matchDiv;
    });
  }, [inventory, formData.customer, formData.division]);

  // Grab the currently selected inventory details for the auto-fill display
  const selectedInvDetails = useMemo(() => {
    if (!formData.inventoryItem) return null;
    return inventory.find(inv => inv._id === formData.inventoryItem) || null;
  }, [inventory, formData.inventoryItem]);

  // --- Input Handlers ---
  const handleCustomerChange = (e) => {
    setFormData({ ...formData, customer: e.target.value, division: '', inventoryItem: '', description: '', description2: '', unitWeight: '' });
  };
  
  const handleDivisionChange = (e) => {
    setFormData({ ...formData, division: e.target.value, inventoryItem: '', description: '', description2: '', unitWeight: '' });
  };

  const handleInventoryChange = (e) => {
    const invId = e.target.value;
    
    if (!invId) {
      setFormData({ 
        ...formData, 
        inventoryItem: '', 
        description: '', 
        description2: '',
        unitWeight: '' 
      });
      return;
    }

    const inv = availableInventory.find(i => i._id === invId);
    
    if (inv) {
      setFormData({ 
        ...formData, 
        inventoryItem: inv._id,
        description: inv.description || inv.itemName || '', 
        description2: inv.description2 || '',
        // Pull generic unit weight from DB
        unitWeight: inv.weight || inv.unitWeight || '' 
      });
    }
  };

  // --- Dynamic Carton Handlers ---
  const handleBreakdownChange = (id, field, value) => {
    const updatedBreakdown = formData.cartonBreakdown.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    );
    
    // Auto-calculate Totals
    const totalCartons = updatedBreakdown.reduce((sum, row) => sum + (Number(row.cartons) || 0), 0);
    const totalQty = updatedBreakdown.reduce((sum, row) => sum + ((Number(row.cartons) || 0) * (Number(row.unitsPerCarton) || 0)), 0);
    const totalWgt = updatedBreakdown.reduce((sum, row) => sum + ((Number(row.cartons) || 0) * (Number(row.weightPerCarton) || 0)), 0);

    setFormData({
      ...formData,
      cartonBreakdown: updatedBreakdown,
      numberOfCartons: totalCartons,
      quantity: totalQty,
      totalWeight: totalWgt
    });
  };

  const addBreakdownRow = () => {
    setFormData({
      ...formData,
      cartonBreakdown: [...formData.cartonBreakdown, { id: Date.now(), cartons: '', unitsPerCarton: '', weightPerCarton: '' }]
    });
  };

  const removeBreakdownRow = (id) => {
    if (formData.cartonBreakdown.length === 1) return; // Must have at least 1 row
    const updatedBreakdown = formData.cartonBreakdown.filter(row => row.id !== id);
    
    // Auto-calculate Totals
    const totalCartons = updatedBreakdown.reduce((sum, row) => sum + (Number(row.cartons) || 0), 0);
    const totalQty = updatedBreakdown.reduce((sum, row) => sum + ((Number(row.cartons) || 0) * (Number(row.unitsPerCarton) || 0)), 0);
    const totalWgt = updatedBreakdown.reduce((sum, row) => sum + ((Number(row.cartons) || 0) * (Number(row.weightPerCarton) || 0)), 0);

    setFormData({ 
      ...formData, 
      cartonBreakdown: updatedBreakdown, 
      numberOfCartons: totalCartons, 
      quantity: totalQty,
      totalWeight: totalWgt
    });
  };


  // --- Modal Controls ---
  const openNewModal = () => {
    setActiveRecordId(null);
    setFormData(INITIAL_FORM_STATE);
    setIsModalOpen(true);
  };

  const openEditModal = (row) => {
    setActiveRecordId(row._id);
    const invId = row.inventoryItem?._id || row.inventoryItem;
    const matchedInv = inventory.find(i => i._id === invId);
    const mappedDivision = matchedInv?.division?._id || matchedInv?.division || '';

    // Reconstruct cartonBreakdown for legacy data compatibility
    let breakdown = row.cartonBreakdown;
    if (!breakdown || breakdown.length === 0) {
      breakdown = [{ 
        id: Date.now(), 
        cartons: row.numberOfCartons || 1, 
        unitsPerCarton: row.unitsPerCarton || row.quantity || 0,
        weightPerCarton: 0
      }];
    } else {
      // Map UI IDs
      breakdown = breakdown.map(b => ({ ...b, id: b.id || Math.random() }));
    }

    setFormData({
      dateReceived: new Date(row.dateReceived).toISOString().split('T')[0],
      vendor: row.vendor || '',
      carrier: row.carrier || '',
      vendorAddress: row.vendorAddress || '',
      vendorCityStateZip: row.vendorCityStateZip || '',
      vendorPhone: row.vendorPhone || '',
      customer: row.customer?._id || row.customer || '',
      division: mappedDivision,
      inventoryItem: invId || '',
      description: row.description || '',
      description2: row.description2 || '',
      lot: row.lot || '',
      location: row.location?._id || row.location || '',
      
      // Breakdown & Metrics
      cartonBreakdown: breakdown,
      quantity: row.quantity || 0,
      numberOfCartons: row.numberOfCartons || breakdown.reduce((sum, r) => sum + (Number(r.cartons)||0), 0),
      totalWeight: row.totalWeight || breakdown.reduce((sum, r) => sum + ((Number(r.cartons)||0) * (Number(r.weightPerCarton)||0)), 0),
      skids: row.skids || '',
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
    if (!formData.inventoryItem) {
      alert("Please select a specific Inventory Asset from the dropdown.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      dateReceived: formData.dateReceived,
      vendor: formData.vendor,
      carrier: formData.carrier,
      vendorAddress: formData.vendorAddress,
      vendorCityStateZip: formData.vendorCityStateZip,
      vendorPhone: formData.vendorPhone,
      customer: formData.customer,
      inventoryItem: formData.inventoryItem,
      description: formData.description,
      description2: formData.description2,
      lot: formData.lot,
      location: formData.location || null, 
      
      // Quantitative Metrics
      quantity: Number(formData.quantity) || 0,
      numberOfCartons: Number(formData.numberOfCartons) || 0,
      totalWeight: Number(formData.totalWeight) || 0,
      skids: Number(formData.skids) || 0,
      unitWeight: Number(formData.unitWeight) || 0,
      charge: Number(formData.charge) || 0,
      
      // Send the complex breakdown array
      cartonBreakdown: formData.cartonBreakdown.map(r => ({
        cartons: Number(r.cartons) || 0,
        unitsPerCarton: Number(r.unitsPerCarton) || 0,
        weightPerCarton: Number(r.weightPerCarton) || 0
      })),
      
      // Send legacy fallback fields
      cartonsPerSkid: Number(formData.cartonBreakdown[0]?.cartons) || 0,
      unitsPerCarton: Number(formData.cartonBreakdown[0]?.unitsPerCarton) || 0,
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
    const headers = ['Date', 'Receiving ID', 'Vendor', 'Carrier', 'Customer', 'Inventory Item', 'Lot', 'Location', 'Qty', 'Skids'];
    const csvContent = [
      headers.join(','), 
      ...filteredData.map(row => [
        new Date(row.dateReceived).toLocaleDateString(),
        row.receivingId,
        `"${row.vendor || ''}"`,
        `"${row.carrier || ''}"`,
        `"${row.customer?.customerName || ''}"`,
        `"${row.inventoryItem?.itemName || ''}"`,
        `"${row.lot || ''}"`,
        `"${row.location?.designation || row.location || 'Unassigned'}"`,
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

  // ------------------------------------------------------------------
  // RENDER BLOCKS
  // ------------------------------------------------------------------

  if (hasGlobalError && !isGlobalLoading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50/80 backdrop-blur-md border border-red-200 p-8 rounded-3xl flex flex-col items-center max-w-md text-center shadow-lg">
          <AlertTriangle className="text-red-500 mb-4" size={40} />
          <h2 className="text-red-800 text-lg font-black tracking-tight mb-2">Synchronization Failed</h2>
          <p className="text-red-600/80 text-xs font-medium mb-6 leading-relaxed">
            The database failed to respond properly. {recError ? `Server reported: ${recError}` : 'Please check your connection and try again.'}
          </p>
          <button 
            onClick={loadAllData} 
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
          >
            <RefreshCw size={14} /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (isGlobalLoading) {
    return (
      <div className="h-full flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-brand-gold" size={36} />
        <div className="text-center space-y-1">
          <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Compiling Database</p>
          <p className="text-[10px] font-bold text-slate-400 tracking-wider">Synchronizing Receiving Logs & Core Directories...</p>
        </div>
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
          <button onClick={openNewModal} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-brand-gold rounded-xl text-sm font-black shadow-lg shadow-slate-900/20 transition-all active:scale-95 uppercase tracking-wider">
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
            <input type="text" placeholder="Search by ID, Vendor, Customer, or Item..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none transition-all" />
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
                    <td className="p-5 text-sm font-black text-slate-800">
                      <div>{row.vendor}</div>
                      {row.carrier && <div className="text-[10px] text-slate-400 uppercase mt-0.5">VIA: {row.carrier}</div>}
                    </td>
                    <td className="p-5 text-sm font-semibold text-slate-600">{row.customer?.customerName || '—'}</td>
                    <td className="p-5 text-sm font-bold text-slate-900">
                      <div className="flex flex-col">
                        <span>{row.inventoryItem?.itemName || '—'}</span>
                        {row.lot && row.lot !== 'N/A' && <span className="text-[10px] text-slate-400 font-mono mt-0.5">Lot: {row.lot}</span>}
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
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Date Received <span className="text-red-400">*</span></label>
                      <input required type="date" value={formData.dateReceived} onChange={(e) => setFormData({...formData, dateReceived: e.target.value})} disabled={isSubmitting} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all cursor-pointer" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Carrier <span className="text-red-400">*</span></label>
                      <input required type="text" placeholder="e.g., FedEx, UPS Freight" value={formData.carrier} onChange={(e) => setFormData({...formData, carrier: e.target.value})} disabled={isSubmitting} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all" />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Vendor Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Vendor Name <span className="text-red-400">*</span></label>
                        <input required type="text" placeholder="e.g., Terumo Medical" value={formData.vendor} onChange={(e) => setFormData({...formData, vendor: e.target.value})} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:border-brand-gold transition-all" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Phone Number</label>
                        <input type="text" placeholder="e.g., 800-283-7866" value={formData.vendorPhone} onChange={(e) => setFormData({...formData, vendorPhone: e.target.value})} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:border-brand-gold transition-all" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Address</label>
                        <input type="text" placeholder="e.g., 8655 Commerce Dr." value={formData.vendorAddress} onChange={(e) => setFormData({...formData, vendorAddress: e.target.value})} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:border-brand-gold transition-all" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">City, State, ZIP</label>
                        <input type="text" placeholder="e.g., Southaven, MS - 38671" value={formData.vendorCityStateZip} onChange={(e) => setFormData({...formData, vendorCityStateZip: e.target.value})} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:border-brand-gold transition-all" />
                      </div>
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

                {/* Section 2: Interactive Asset Finder */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Filter className="text-brand-gold" size={14} />
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Asset Selection & Info</h3>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Division Segment</label>
                      <select value={formData.division} onChange={handleDivisionChange} disabled={!formData.customer || isSubmitting || availableDivisions.length === 0} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all cursor-pointer disabled:opacity-50">
                        <option value="">Select Division...</option>
                        {availableDivisions.map(d => <option key={d._id} value={d._id}>{d.divisionName}</option>)}
                      </select>
                    </div>
                    
                    {/* Inventory Asset Dropdown */}
                    <div className="col-span-2 relative">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Select Inventory Asset <span className="text-red-400">*</span></label>
                      <select 
                        required 
                        value={formData.inventoryItem} 
                        onChange={handleInventoryChange} 
                        disabled={!formData.division || isSubmitting || availableInventory.length === 0} 
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all cursor-pointer disabled:opacity-50 ${formData.inventoryItem ? 'bg-brand-gold/5 border-brand-gold/30 text-slate-900' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                      >
                        <option value="">{availableInventory.length > 0 ? "Select Asset..." : "No assets found for this division"}</option>
                        {availableInventory.map(inv => (
                          <option key={inv._id} value={inv._id}>
                            {inv.productCode || inv.sku} — {inv.description || inv.itemName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Auto-filled Asset Information Panel */}
                  <AnimatePresence>
                    {selectedInvDetails && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                        animate={{ opacity: 1, height: 'auto', marginTop: 12 }} 
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="bg-slate-950 text-white rounded-xl p-4 shadow-inner overflow-hidden border border-slate-900"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block mb-1">Current Stock Level</span>
                            <span className="text-xl font-black text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 inline-block">
                              {selectedInvDetails.available || selectedInvDetails.unitsOnHand || 0}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block mb-1.5">Asset Categories</span>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedInvDetails.category1 && <span className="bg-white/10 border border-white/20 px-2 py-0.5 rounded text-[10px] font-bold text-slate-200">{selectedInvDetails.category1.categoryName || selectedInvDetails.category1}</span>}
                              {selectedInvDetails.category2 && <span className="bg-white/10 border border-white/20 px-2 py-0.5 rounded text-[10px] font-bold text-slate-200">{selectedInvDetails.category2.categoryName || selectedInvDetails.category2}</span>}
                              {selectedInvDetails.category3 && <span className="bg-white/10 border border-white/20 px-2 py-0.5 rounded text-[10px] font-bold text-slate-200">{selectedInvDetails.category3.categoryName || selectedInvDetails.category3}</span>}
                              {!selectedInvDetails.category1 && !selectedInvDetails.category2 && !selectedInvDetails.category3 && <span className="text-[10px] text-slate-500 italic bg-white/5 px-2 py-0.5 rounded">Uncategorized</span>}
                            </div>
                          </div>
                        </div>

                        {/* Descriptions */}
                        <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-3">
                          <div>
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block mb-1">Primary Description</span>
                            <p className="text-xs font-medium text-slate-200 leading-relaxed">
                              {selectedInvDetails.description || selectedInvDetails.itemName || '—'}
                            </p>
                          </div>
                          {(selectedInvDetails.description2) && (
                            <div>
                              <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block mb-1">Secondary Description</span>
                              <p className="text-xs font-medium text-slate-400 leading-relaxed">
                                {selectedInvDetails.description2}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

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
                </div>

                {/* Section 3: Quantitative Metrics - NEW DYNAMIC SYSTEM */}
                <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-5 mt-2">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Quantitative Metrics</h3>
                  
                  {/* Dynamic Carton Configurations */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider pl-1">Carton Configurations</label>
                      <button 
                        type="button" 
                        onClick={addBreakdownRow}
                        className="text-[10px] font-black uppercase tracking-wider text-brand-gold hover:text-brand-gold/80 flex items-center gap-1 transition-colors bg-brand-gold/10 px-2 py-1 rounded-md"
                      >
                        <Plus size={12} /> Add Config
                      </button>
                    </div>

                    {formData.cartonBreakdown.map((row, index) => (
                      <div key={row.id} className="flex items-center gap-2 sm:gap-3 bg-white p-2 sm:p-3 border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block text-center">Cartons</label>
                          <input 
                            type="number" min="0" placeholder="0" 
                            value={row.cartons} 
                            onChange={(e) => handleBreakdownChange(row.id, 'cartons', e.target.value)} 
                            disabled={isSubmitting} 
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black text-slate-900 text-center outline-none focus:border-brand-gold" 
                          />
                        </div>
                        <span className="text-slate-300 font-black text-xs pt-4">×</span>
                        <div className="flex-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block text-center">Units/Ctn</label>
                          <input 
                            type="number" min="0" placeholder="0" 
                            value={row.unitsPerCarton} 
                            onChange={(e) => handleBreakdownChange(row.id, 'unitsPerCarton', e.target.value)} 
                            disabled={isSubmitting} 
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black text-slate-900 text-center outline-none focus:border-brand-gold" 
                          />
                        </div>
                        <span className="text-slate-300 font-black text-xs pt-4">&</span>
                        <div className="flex-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block text-center">Lbs/Ctn</label>
                          <input 
                            type="number" step="0.01" min="0" placeholder="0.0" 
                            value={row.weightPerCarton} 
                            onChange={(e) => handleBreakdownChange(row.id, 'weightPerCarton', e.target.value)} 
                            disabled={isSubmitting} 
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black text-slate-900 text-center outline-none focus:border-brand-gold" 
                          />
                        </div>
                        <div className="w-12 flex flex-col items-center justify-center pt-2 gap-1 border-l border-slate-100 pl-2">
                          <span className="text-sm font-black text-brand-gold leading-none" title="Total Units">
                            {((Number(row.cartons) || 0) * (Number(row.unitsPerCarton) || 0)).toLocaleString()} <span className="text-[9px]">U</span>
                          </span>
                        </div>
                        <div className="pt-4 pl-1">
                          <button 
                            type="button" 
                            onClick={() => removeBreakdownRow(row.id)}
                            disabled={formData.cartonBreakdown.length === 1}
                            className="text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30 disabled:hover:text-slate-300"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Auto-Calculated Totals */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200/60">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block pl-1">Total Qty</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={formData.quantity.toLocaleString()} 
                        className="w-full px-4 py-3 bg-brand-gold/5 border border-brand-gold/30 rounded-xl text-lg font-black text-brand-gold cursor-not-allowed shadow-inner outline-none text-center" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block pl-1">Total Cartons</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={formData.numberOfCartons.toLocaleString()} 
                        className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-lg font-black text-slate-500 cursor-not-allowed shadow-inner outline-none text-center" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block pl-1">Total Wgt (lbs)</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={formData.totalWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                        className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-lg font-black text-emerald-700 cursor-not-allowed shadow-inner outline-none text-center" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Total Skids</label>
                      <input type="number" min="0" value={formData.skids} onChange={(e) => setFormData({...formData, skids: e.target.value})} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all" />
                    </div>
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