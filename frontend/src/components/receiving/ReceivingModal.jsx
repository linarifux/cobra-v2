import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Trash2, X, Loader2, DollarSign, Filter } from 'lucide-react';
import { createReceivingLog, updateReceivingLog } from '../../store/slices/receivingSlice';

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
  locations: [], 
  cartonBreakdown: [{ id: Date.now(), cartons: '', unitsPerCarton: '', weightPerCarton: '' }],
  quantity: 0,
  numberOfCartons: 0,
  totalWeight: 0, 
  skids: '',
  charge: ''
};

export default function ReceivingModal({ isOpen, onClose, record }) {
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  
  const [locSearchTerm, setLocSearchTerm] = useState('');
  const [isLocDropdownOpen, setIsLocDropdownOpen] = useState(false);

  // Redux Data
  const { items: customers = [] } = useSelector(state => state.customers || {});
  const { items: inventory = [] } = useSelector(state => state.inventory || {});
  const { items: locations = [] } = useSelector(state => state.locations || {});
  const { items: divisions = [] } = useSelector(state => state.divisions || {});

  // On Mount / Record Change
  useEffect(() => {
    if (isOpen) {
      if (record) {
        const invId = record.inventoryItem?._id || record.inventoryItem;
        const matchedInv = inventory.find(i => i._id === invId);
        const mappedDivision = matchedInv?.division?._id || matchedInv?.division || '';

        let breakdown = record.cartonBreakdown;
        if (!breakdown || breakdown.length === 0) {
          breakdown = [{ 
            id: Date.now(), 
            cartons: record.numberOfCartons || 1, 
            unitsPerCarton: record.unitsPerCarton || record.quantity || 0,
            weightPerCarton: 0
          }];
        } else {
          breakdown = breakdown.map(b => ({ ...b, id: b.id || Math.random() }));
        }

        const mappedLocations = record.locations?.map(l => l._id || l) || (record.location ? [record.location._id || record.location] : []);

        setFormData({
          dateReceived: new Date(record.dateReceived).toISOString().split('T')[0],
          vendor: record.vendor || '',
          carrier: record.carrier || '',
          vendorAddress: record.vendorAddress || '',
          vendorCityStateZip: record.vendorCityStateZip || '',
          vendorPhone: record.vendorPhone || '',
          customer: record.customer?._id || record.customer || '',
          division: mappedDivision,
          inventoryItem: invId || '',
          description: record.description || '',
          description2: record.description2 || '',
          lot: record.lot || '',
          locations: mappedLocations,
          cartonBreakdown: breakdown,
          quantity: record.quantity || 0,
          numberOfCartons: record.numberOfCartons || breakdown.reduce((sum, r) => sum + (Number(r.cartons)||0), 0),
          totalWeight: record.totalWeight || breakdown.reduce((sum, r) => sum + ((Number(r.cartons)||0) * (Number(r.weightPerCarton)||0)), 0),
          skids: record.skids || '',
          charge: record.charge || ''
        });
      } else {
        setFormData(INITIAL_FORM_STATE);
      }
      setLocSearchTerm('');
    }
  }, [isOpen, record, inventory]);

  // Derived Data
  const availableDivisions = useMemo(() => {
    if (!formData.customer) return [];
    const validDivIds = new Set(
      inventory.filter(inv => (inv.customer?._id || inv.customer) === formData.customer && inv.division).map(inv => inv.division?._id || inv.division)
    );
    return divisions.filter(d => validDivIds.has(d._id));
  }, [inventory, divisions, formData.customer]);

  const availableInventory = useMemo(() => {
    if (!formData.customer || !formData.division) return [];
    return inventory.filter(inv => (inv.customer?._id || inv.customer) === formData.customer && (inv.division?._id || inv.division) === formData.division);
  }, [inventory, formData.customer, formData.division]);

  const selectedInvDetails = useMemo(() => {
    if (!formData.inventoryItem) return null;
    return inventory.find(inv => inv._id === formData.inventoryItem) || null;
  }, [inventory, formData.inventoryItem]);

  const availableLocations = useMemo(() => {
    if (!locSearchTerm) return locations;
    return locations.filter(loc => 
      loc.designation.toLowerCase().includes(locSearchTerm.toLowerCase()) || 
      loc.storageCategory?.toLowerCase().includes(locSearchTerm.toLowerCase())
    );
  }, [locations, locSearchTerm]);

  // Handlers
  const handleCustomerChange = (e) => setFormData({ ...formData, customer: e.target.value, division: '', inventoryItem: '', description: '', description2: ''});
  const handleDivisionChange = (e) => setFormData({ ...formData, division: e.target.value, inventoryItem: '', description: '', description2: ''});
  
  const handleInventoryChange = (e) => {
    const invId = e.target.value;
    if (!invId) return setFormData({ ...formData, inventoryItem: '', description: '', description2: ''});
    const inv = availableInventory.find(i => i._id === invId);
    if (inv) {
      setFormData({ ...formData, inventoryItem: inv._id, description: inv.description || inv.itemName || '', description2: inv.description2 || ''});
    }
  };

  const handleAddLocation = (loc) => {
    if (!formData.locations.includes(loc._id)) setFormData(prev => ({ ...prev, locations: [...prev.locations, loc._id] }));
    setLocSearchTerm('');
    setIsLocDropdownOpen(false);
  };
  const handleRemoveLocation = (locId) => setFormData(prev => ({ ...prev, locations: prev.locations.filter(id => id !== locId) }));

  const handleBreakdownChange = (id, field, value) => {
    const updatedBreakdown = formData.cartonBreakdown.map(row => row.id === id ? { ...row, [field]: value } : row);
    const totalCartons = updatedBreakdown.reduce((sum, row) => sum + (Number(row.cartons) || 0), 0);
    const totalQty = updatedBreakdown.reduce((sum, row) => sum + ((Number(row.cartons) || 0) * (Number(row.unitsPerCarton) || 0)), 0);
    const totalWgt = updatedBreakdown.reduce((sum, row) => sum + ((Number(row.cartons) || 0) * (Number(row.weightPerCarton) || 0)), 0);
    setFormData({ ...formData, cartonBreakdown: updatedBreakdown, numberOfCartons: totalCartons, quantity: totalQty, totalWeight: totalWgt });
  };

  const addBreakdownRow = () => setFormData({ ...formData, cartonBreakdown: [...formData.cartonBreakdown, { id: Date.now(), cartons: '', unitsPerCarton: '', weightPerCarton: '' }] });
  const removeBreakdownRow = (id) => {
    if (formData.cartonBreakdown.length === 1) return;
    const updatedBreakdown = formData.cartonBreakdown.filter(row => row.id !== id);
    const totalCartons = updatedBreakdown.reduce((sum, row) => sum + (Number(row.cartons) || 0), 0);
    const totalQty = updatedBreakdown.reduce((sum, row) => sum + ((Number(row.cartons) || 0) * (Number(row.unitsPerCarton) || 0)), 0);
    const totalWgt = updatedBreakdown.reduce((sum, row) => sum + ((Number(row.cartons) || 0) * (Number(row.weightPerCarton) || 0)), 0);
    setFormData({ ...formData, cartonBreakdown: updatedBreakdown, numberOfCartons: totalCartons, quantity: totalQty, totalWeight: totalWgt });
  };

  const handleSaveShipment = async (e) => {
    e.preventDefault();
    if (!formData.inventoryItem) return alert("Please select an Inventory Asset.");
    setIsSubmitting(true);
    
    const payload = { ...formData };
    payload.location = formData.locations.length > 0 ? formData.locations[0] : null; 
    payload.quantity = Number(formData.quantity) || 0;
    payload.numberOfCartons = Number(formData.numberOfCartons) || 0;
    payload.totalWeight = Number(formData.totalWeight) || 0;
    payload.skids = Number(formData.skids) || 0;
    payload.charge = Number(formData.charge) || 0;
    payload.cartonBreakdown = formData.cartonBreakdown.map(r => ({
      cartons: Number(r.cartons) || 0, unitsPerCarton: Number(r.unitsPerCarton) || 0, weightPerCarton: Number(r.weightPerCarton) || 0
    }));
    payload.cartonsPerSkid = Number(formData.cartonBreakdown[0]?.cartons) || 0;
    payload.unitsPerCarton = Number(formData.cartonBreakdown[0]?.unitsPerCarton) || 0;

    try {
      if (record?._id) {
        await dispatch(updateReceivingLog({ id: record._id, updateData: payload })).unwrap();
      } else {
        await dispatch(createReceivingLog(payload)).unwrap();
      }
      onClose();
    } catch (err) {
      alert(`Error saving receiving log: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-lg h-full bg-white shadow-2xl border-l border-slate-200 p-6 md:p-8 overflow-y-auto flex flex-col">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="text-brand-gold" size={20} />
            {record ? 'Edit Receiving Log' : 'New Inbound Receipt'}
          </h2>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
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
                <input required type="text" placeholder="e.g., FedEx" value={formData.carrier} onChange={(e) => setFormData({...formData, carrier: e.target.value})} disabled={isSubmitting} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all" />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Vendor Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Vendor Name <span className="text-red-400">*</span></label>
                  <input required type="text" value={formData.vendor} onChange={(e) => setFormData({...formData, vendor: e.target.value})} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:border-brand-gold transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Phone Number</label>
                  <input type="text" value={formData.vendorPhone} onChange={(e) => setFormData({...formData, vendorPhone: e.target.value})} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:border-brand-gold transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Address</label>
                  <input type="text" value={formData.vendorAddress} onChange={(e) => setFormData({...formData, vendorAddress: e.target.value})} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:border-brand-gold transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">City, State, ZIP</label>
                  <input type="text" value={formData.vendorCityStateZip} onChange={(e) => setFormData({...formData, vendorCityStateZip: e.target.value})} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:border-brand-gold transition-all" />
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
              <div className="col-span-2 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Select Inventory Asset <span className="text-red-400">*</span></label>
                <select required value={formData.inventoryItem} onChange={handleInventoryChange} disabled={!formData.division || isSubmitting || availableInventory.length === 0} className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all cursor-pointer disabled:opacity-50 ${formData.inventoryItem ? 'bg-brand-gold/5 border-brand-gold/30 text-slate-900' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                  <option value="">{availableInventory.length > 0 ? "Select Asset..." : "No assets found for this division"}</option>
                  {availableInventory.map(inv => <option key={inv._id} value={inv._id}>{inv.productCode || inv.sku} — {inv.description || inv.itemName}</option>)}
                </select>
              </div>
            </div>

            <AnimatePresence>
              {selectedInvDetails && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-slate-950 text-white rounded-xl p-4 shadow-inner overflow-hidden border border-slate-900">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block mb-1">Current Stock Level</span>
                      <span className="text-xl font-black text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 inline-block">{selectedInvDetails.available || selectedInvDetails.unitsOnHand || 0}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block mb-1.5">Asset Categories</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedInvDetails.category1 && <span className="bg-white/10 border border-white/20 px-2 py-0.5 rounded text-[10px] font-bold text-slate-200">{selectedInvDetails.category1.categoryName || selectedInvDetails.category1}</span>}
                        {selectedInvDetails.category2 && <span className="bg-white/10 border border-white/20 px-2 py-0.5 rounded text-[10px] font-bold text-slate-200">{selectedInvDetails.category2.categoryName || selectedInvDetails.category2}</span>}
                        {selectedInvDetails.category3 && <span className="bg-white/10 border border-white/20 px-2 py-0.5 rounded text-[10px] font-bold text-slate-200">{selectedInvDetails.category3.categoryName || selectedInvDetails.category3}</span>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 items-start">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Lot / Batch ID</label>
                <input type="text" placeholder="e.g., LOT-8812" value={formData.lot} onChange={(e) => setFormData({...formData, lot: e.target.value})} disabled={isSubmitting} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all" />
              </div>
              
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Storage Locations</label>
                <div className="relative">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {formData.locations.map(locId => {
                      const locObj = locations.find(l => l._id === locId);
                      return (
                        <span key={locId} className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded-md flex items-center gap-1.5 text-[10px] font-bold shadow-sm">
                          {locObj?.designation || locId}
                          <X size={12} className="cursor-pointer hover:text-red-500 transition-colors" onClick={() => handleRemoveLocation(locId)} />
                        </span>
                      );
                    })}
                  </div>
                  <input 
                    type="text" 
                    placeholder={formData.locations.length === 0 ? "Type to search (e.g. F-12)..." : "Add another location..."}
                    value={locSearchTerm}
                    onChange={(e) => { setLocSearchTerm(e.target.value); setIsLocDropdownOpen(true); }}
                    onFocus={() => setIsLocDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsLocDropdownOpen(false), 200)}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all"
                  />
                  <AnimatePresence>
                    {isLocDropdownOpen && (
                      <motion.ul initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                        {availableLocations.length > 0 ? (
                          availableLocations.map(loc => (
                            <li key={loc._id} onClick={() => handleAddLocation(loc)} className="px-4 py-2.5 hover:bg-brand-gold/10 hover:text-brand-gold cursor-pointer border-b last:border-b-0 border-slate-100 transition-colors flex items-center justify-between">
                              <span className="text-xs font-black">{loc.designation}</span>
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{loc.storageCategory}</span>
                            </li>
                          ))
                        ) : (
                          <li className="px-4 py-3 text-xs font-bold text-slate-400 text-center italic">No matching locations</li>
                        )}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-5 mt-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Quantitative Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider pl-1">Carton Configurations</label>
                <button type="button" onClick={addBreakdownRow} className="text-[10px] font-black uppercase tracking-wider text-brand-gold hover:text-brand-gold/80 flex items-center gap-1 transition-colors bg-brand-gold/10 px-2 py-1 rounded-md">
                  <Plus size={12} /> Add Config
                </button>
              </div>

              {formData.cartonBreakdown.map((row) => (
                <div key={row.id} className="flex items-center gap-2 sm:gap-3 bg-white p-2 sm:p-3 border border-slate-200 rounded-xl shadow-sm">
                  <div className="flex-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block text-center">Cartons</label>
                    <input type="number" min="0" value={row.cartons} onChange={(e) => handleBreakdownChange(row.id, 'cartons', e.target.value)} disabled={isSubmitting} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black text-slate-900 text-center outline-none focus:border-brand-gold" />
                  </div>
                  <span className="text-slate-300 font-black text-xs pt-4">×</span>
                  <div className="flex-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block text-center">Units/Ctn</label>
                    <input type="number" min="0" value={row.unitsPerCarton} onChange={(e) => handleBreakdownChange(row.id, 'unitsPerCarton', e.target.value)} disabled={isSubmitting} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black text-slate-900 text-center outline-none focus:border-brand-gold" />
                  </div>
                  <span className="text-slate-300 font-black text-xs pt-4">&</span>
                  <div className="flex-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block text-center">Lbs/Ctn</label>
                    <input type="number" step="0.01" min="0" value={row.weightPerCarton} onChange={(e) => handleBreakdownChange(row.id, 'weightPerCarton', e.target.value)} disabled={isSubmitting} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black text-slate-900 text-center outline-none focus:border-brand-gold" />
                  </div>
                  <div className="w-12 flex flex-col items-center justify-center pt-2 gap-1 border-l border-slate-100 pl-2">
                    <span className="text-sm font-black text-brand-gold leading-none">{((Number(row.cartons) || 0) * (Number(row.unitsPerCarton) || 0)).toLocaleString()} <span className="text-[9px]">U</span></span>
                  </div>
                  <div className="pt-4 pl-1">
                    <button type="button" onClick={() => removeBreakdownRow(row.id)} disabled={formData.cartonBreakdown.length === 1} className="text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200/60">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block pl-1">Total Qty</label>
                <input type="text" readOnly value={formData.quantity.toLocaleString()} className="w-full px-4 py-3 bg-brand-gold/5 border border-brand-gold/30 rounded-xl text-lg font-black text-brand-gold cursor-not-allowed shadow-inner outline-none text-center" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block pl-1">Total Cartons</label>
                <input type="text" readOnly value={formData.numberOfCartons.toLocaleString()} className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-lg font-black text-slate-500 cursor-not-allowed shadow-inner outline-none text-center" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block pl-1">Total Wgt (lbs)</label>
                <input type="text" readOnly value={formData.totalWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-lg font-black text-emerald-700 cursor-not-allowed shadow-inner outline-none text-center" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1">Total Skids</label>
                <input type="number" min="0" value={formData.skids} onChange={(e) => setFormData({...formData, skids: e.target.value})} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 block pl-1 flex items-center gap-1"><DollarSign size={10}/> Applied Charge</label>
                <input type="number" step="0.01" min="0" value={formData.charge} onChange={(e) => setFormData({...formData, charge: e.target.value})} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all" />
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-slate-100 flex gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all disabled:opacity-50 text-[11px] uppercase tracking-widest">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 flex justify-center items-center py-3.5 bg-slate-900 hover:bg-slate-800 text-brand-gold font-black rounded-2xl shadow-xl shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-70 text-[11px] uppercase tracking-widest">
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (record ? 'Save Updates' : 'Confirm Receipt')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}