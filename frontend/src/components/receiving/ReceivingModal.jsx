import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Plus, Trash2, X, Loader2, DollarSign, 
  Filter, AlertCircle, Calendar, Truck, Building2, MapPin, Check, Store 
} from 'lucide-react';

// Redux Thunks
import { createReceivingLog, updateReceivingLog } from '../../store/slices/receivingSlice';
import { fetchInventory } from '../../store/slices/inventorySlice'; 
import { fetchVendors } from '../../store/slices/vendorSlice'; 

const INITIAL_FORM_STATE = {
  dateReceived: new Date().toISOString().split('T')[0],
  vendor: '',
  carrier: '',
  vendorAddress: '',
  vendorCity: '',
  vendorState: '',
  vendorZipCode: '',
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
  pallets: '',
  palletProcessingFee: '',
  charge: ''
};

// Comprehensive list of standard carriers and services
const CARRIER_SERVICES = [
  "Amazon Logistics",
  "DHL eCommerce",
  "DHL Express",
  "Estes Express Lines",
  "FedEx 2Day",
  "FedEx 2Day A.M.",
  "FedEx Express Saver",
  "FedEx First Overnight",
  "FedEx Freight",
  "FedEx Ground",
  "FedEx Home Delivery",
  "FedEx International",
  "FedEx Priority Overnight",
  "FedEx SmartPost",
  "FedEx Standard Overnight",
  "Old Dominion Freight Line",
  "UPS 2nd Day Air",
  "UPS 2nd Day Air A.M.",
  "UPS 3 Day Select",
  "UPS Freight",
  "UPS Ground",
  "UPS Mail Innovations",
  "UPS Next Day Air",
  "UPS Next Day Air Early",
  "UPS Next Day Air Saver",
  "UPS Standard",
  "UPS Worldwide Expedited",
  "UPS Worldwide Express",
  "USPS First-Class Mail",
  "USPS International",
  "USPS Media Mail",
  "USPS Parcel Select",
  "USPS Priority Mail",
  "USPS Priority Mail Express",
  "USPS Retail Ground",
  "XPO Logistics",
  "YRC Freight"
];

export default function ReceivingModal({ isOpen, onClose, record }) {
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  
  // Custom Dropdown States
  const [locSearchTerm, setLocSearchTerm] = useState('');
  const [isLocDropdownOpen, setIsLocDropdownOpen] = useState(false);
  const [isCarrierDropdownOpen, setIsCarrierDropdownOpen] = useState(false);
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false); 

  // Redux Data
  const { items: customers = [] } = useSelector(state => state.customers || {});
  const { items: inventory = [] } = useSelector(state => state.inventory || {});
  const { items: locations = [] } = useSelector(state => state.locations || {});
  const { items: divisions = [] } = useSelector(state => state.divisions || {});
  const { items: vendors = [], status: vendorStatus } = useSelector(state => state.vendors || {}); 

  // Fetch Vendors if not loaded
  useEffect(() => {
    if (isOpen && vendorStatus === 'idle') {
      dispatch(fetchVendors());
    }
  }, [isOpen, vendorStatus, dispatch]);

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

        // Legacy support for single string CityStateZip
        let city = record.vendorCity || '';
        let state = record.vendorState || '';
        let zip = record.vendorZipCode || '';
        if (!city && !state && !zip && record.vendorCityStateZip) {
          const parts = record.vendorCityStateZip.split(',');
          city = parts[0]?.trim() || '';
          if (parts[1]) {
            const sz = parts[1].trim().split(' ');
            state = sz[0] || '';
            zip = sz[1] || '';
          }
        }

        setFormData({
          dateReceived: new Date(record.dateReceived).toISOString().split('T')[0],
          vendor: record.vendor || '',
          carrier: record.carrier || '',
          vendorAddress: record.vendorAddress || '',
          vendorCity: city,
          vendorState: state,
          vendorZipCode: zip,
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
          pallets: record.pallets || '',
          palletProcessingFee: record.palletProcessingFee || '',
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
    const filtered = inventory.filter(inv => 
      (inv.customer?._id || inv.customer) === formData.customer && 
      (inv.division?._id || inv.division) === formData.division
    );
    return filtered.sort((a, b) => {
      const nameA = a.productCode || a.sku || a.itemName || a.description || '';
      const nameB = b.productCode || b.sku || b.itemName || b.description || '';
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
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

  const filteredCarriers = useMemo(() => {
    if (!formData.carrier) return CARRIER_SERVICES;
    return CARRIER_SERVICES.filter(c => c.toLowerCase().includes(formData.carrier.toLowerCase()));
  }, [formData.carrier]);

  const filteredVendors = useMemo(() => {
    if (!formData.vendor) return vendors;
    return vendors.filter(v => v.vendorName.toLowerCase().includes(formData.vendor.toLowerCase()));
  }, [vendors, formData.vendor]);

  // Handlers
  const handleCustomerChange = (e) => setFormData({ ...formData, customer: e.target.value, division: '', inventoryItem: '', description: '', description2: ''});
  const handleDivisionChange = (e) => setFormData({ ...formData, division: e.target.value, inventoryItem: '', description: '', description2: ''});
  const handleInventoryChange = (e) => {
    const invId = e.target.value;
    if (!invId) return setFormData({ ...formData, inventoryItem: '', description: '', description2: ''});
    const inv = availableInventory.find(i => i._id === invId);
    if (inv) setFormData({ ...formData, inventoryItem: inv._id, description: inv.description || inv.itemName || '', description2: inv.description2 || ''});
  };

  // Vendor Auto-Fill Handler
  const handleVendorSelect = (vendorObj) => {
    setFormData({
      ...formData,
      vendor: vendorObj.vendorName,
      vendorPhone: vendorObj.phone || '',
      vendorAddress: vendorObj.address?.street || '',
      vendorCity: vendorObj.address?.city || '',
      vendorState: vendorObj.address?.state || '',
      vendorZipCode: vendorObj.address?.zipCode || ''
    });
    setIsVendorDropdownOpen(false);
  };

  // ==========================================
  // ROBUST STORAGE LIMIT VALIDATION
  // ==========================================
  const handleAddLocation = (loc) => {
    const incomingPallets = Number(formData.pallets) || 0;
    
    // Support generic field names depending on your Location schema (e.g. capacity vs maxPallets)
    const maxLimit = loc.capacity || loc.maxSkids || loc.maxPallets; 
    const currentUsage = loc.utilized || loc.currentSkids || loc.currentPallets || 0;

    if (maxLimit !== undefined) {
      if (currentUsage >= maxLimit || loc.status === 'Full') {
        alert(`Storage Limit Reached: Location ${loc.designation} is completely full.`);
        return;
      }
      if (incomingPallets > 0 && (currentUsage + incomingPallets > maxLimit)) {
        alert(`Capacity Overload: Adding ${incomingPallets} pallets exceeds the limit for ${loc.designation}. Only ${maxLimit - currentUsage} spots remaining.`);
        return;
      }
    }

    if (!formData.locations.includes(loc._id)) {
      setFormData(prev => ({ ...prev, locations: [...prev.locations, loc._id] }));
    }
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
    
    // Safely combine city/state/zip for legacy compatibility if the backend schema requires it
    const csz = [formData.vendorCity, formData.vendorState, formData.vendorZipCode].filter(Boolean).join(', ');

    const payload = { 
      ...formData,
      vendorCityStateZip: csz 
    };
    
    payload.location = formData.locations.length > 0 ? formData.locations[0] : null; 
    payload.quantity = Number(formData.quantity) || 0;
    payload.numberOfCartons = Number(formData.numberOfCartons) || 0;
    payload.totalWeight = Number(formData.totalWeight) || 0;
    payload.pallets = Number(formData.pallets) || 0;
    payload.palletProcessingFee = Number(formData.palletProcessingFee) || 0;
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
      
      dispatch(fetchInventory());
      onClose();
    } catch (err) {
      alert(`Error saving receiving log: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // PREMIUM UI UTILITY CLASSES
  const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 transition-all shadow-sm disabled:opacity-60 disabled:bg-slate-100 placeholder:text-slate-400";
  const readOnlyClass = "w-full px-4 py-2.5 bg-slate-100/70 opacity-80 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 outline-none cursor-not-allowed shadow-inner";
  const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block";
  const cardClass = "bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5";
  const cardHeaderClass = "text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3";

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
        onClick={onClose} 
      />

      {/* Main Modal Panel */}
      <motion.div 
        initial={{ x: '100%' }} 
        animate={{ x: 0 }} 
        exit={{ x: '100%' }} 
        transition={{ type: 'spring', damping: 30, stiffness: 250 }} 
        className="relative w-full max-w-2xl h-full bg-slate-50/95 backdrop-blur-2xl shadow-2xl border-l border-slate-200 flex flex-col"
      >
        
        {/* Sticky Header */}
        <div className="flex justify-between items-center px-8 py-6 bg-white border-b border-slate-200 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-brand-gold rounded-xl shadow-inner">
              <Package size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {record ? 'Edit Receiving Log' : 'New Inbound Receipt'}
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Inventory Intake</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors border border-slate-200/60 shadow-sm">
            <X size={20} />
          </button>
        </div>
        
        {/* Scrollable Form Body */}
        <form id="receivingForm" onSubmit={handleSaveShipment} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          
          {/* Card 1: Intake Details */}
          <div className={cardClass}>
            <h3 className={cardHeaderClass}>
              <Calendar size={14} /> Intake Details
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Date Received <span className="text-red-400">*</span></label>
                <input required type="date" value={formData.dateReceived} onChange={(e) => setFormData({...formData, dateReceived: e.target.value})} disabled={isSubmitting} className={inputClass} />
              </div>

              {/* Enhanced Searchable Carrier Combobox */}
              <div className="relative">
                <label className={labelClass}>Carrier / Service <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Truck size={16} className="absolute left-4 top-3 text-slate-400 z-10" />
                  <input 
                    required 
                    type="text" 
                    placeholder="Search or type carrier..." 
                    value={formData.carrier} 
                    onChange={(e) => {
                      setFormData({...formData, carrier: e.target.value});
                      setIsCarrierDropdownOpen(true);
                    }} 
                    onFocus={() => setIsCarrierDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsCarrierDropdownOpen(false), 200)}
                    disabled={isSubmitting} 
                    className={`${inputClass} pl-11 relative z-0`} 
                  />
                  
                  <AnimatePresence>
                    {isCarrierDropdownOpen && (
                      <motion.ul 
                        initial={{ opacity: 0, y: -5 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -5 }} 
                        className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto custom-scrollbar overflow-hidden"
                      >
                        {filteredCarriers.length > 0 ? (
                          filteredCarriers.map(carrier => (
                            <li 
                              key={carrier} 
                              onClick={() => {
                                setFormData({...formData, carrier});
                                setIsCarrierDropdownOpen(false);
                              }}
                              className="px-4 py-3 border-b last:border-b-0 border-slate-100 flex items-center gap-2.5 hover:bg-slate-50 hover:text-brand-gold cursor-pointer transition-colors text-sm font-black text-slate-700"
                            >
                              <Truck size={14} className="text-slate-400 shrink-0"/>
                              {carrier}
                            </li>
                          ))
                        ) : (
                          <li className="px-4 py-4 flex flex-col items-center justify-center gap-1">
                            <span className="text-xs font-bold text-slate-500">Use custom carrier:</span>
                            <span className="text-sm font-black text-brand-gold">"{formData.carrier}"</span>
                          </li>
                        )}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/60 space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/80 pb-2">Vendor Details</h4>
              <div className="grid grid-cols-2 gap-4">
                
                {/* Searchable Vendor Combobox */}
                <div className="col-span-2 sm:col-span-1 relative">
                  <label className={labelClass}>Vendor Name <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <Store size={16} className="absolute left-4 top-3 text-slate-400 z-10" />
                    <input 
                      required 
                      type="text" 
                      placeholder="Search or type vendor..." 
                      value={formData.vendor} 
                      onChange={(e) => {
                        setFormData({...formData, vendor: e.target.value});
                        setIsVendorDropdownOpen(true);
                      }} 
                      onFocus={() => setIsVendorDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsVendorDropdownOpen(false), 200)}
                      disabled={isSubmitting} 
                      className={`${inputClass} pl-11 relative z-0`} 
                    />
                    
                    <AnimatePresence>
                      {isVendorDropdownOpen && (
                        <motion.ul 
                          initial={{ opacity: 0, y: -5 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          exit={{ opacity: 0, y: -5 }} 
                          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto custom-scrollbar overflow-hidden"
                        >
                          {filteredVendors.length > 0 ? (
                            filteredVendors.map(v => (
                              <li 
                                key={v._id} 
                                onClick={() => handleVendorSelect(v)}
                                className="px-4 py-3 border-b last:border-b-0 border-slate-100 flex items-center justify-between hover:bg-slate-50 hover:text-brand-gold cursor-pointer transition-colors text-sm font-black text-slate-700"
                              >
                                <div className="flex flex-col">
                                  <span>{v.vendorName}</span>
                                  {(v.contactName || v.email) && (
                                    <span className="text-[10px] font-bold text-slate-400 mt-0.5">{v.contactName || v.email}</span>
                                  )}
                                </div>
                              </li>
                            ))
                          ) : (
                            <li className="px-4 py-4 flex flex-col items-center justify-center gap-1">
                              <span className="text-xs font-bold text-slate-500">Use custom vendor:</span>
                              <span className="text-sm font-black text-brand-gold">"{formData.vendor}"</span>
                            </li>
                          )}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className={labelClass}>Phone Number</label>
                  <input readOnly tabIndex="-1" value={formData.vendorPhone} placeholder="Auto-filled" className={readOnlyClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Street Address</label>
                  <input readOnly tabIndex="-1" value={formData.vendorAddress} placeholder="Auto-filled" className={readOnlyClass} />
                </div>
                <div className="col-span-2 grid grid-cols-3 gap-4">
                  <div className="col-span-3 sm:col-span-1">
                    <label className={labelClass}>City</label>
                    <input readOnly tabIndex="-1" value={formData.vendorCity} placeholder="Auto-filled" className={readOnlyClass} />
                  </div>
                  <div className="col-span-3 sm:col-span-1">
                    <label className={labelClass}>State</label>
                    <input readOnly tabIndex="-1" value={formData.vendorState} placeholder="Auto-filled" className={readOnlyClass} />
                  </div>
                  <div className="col-span-3 sm:col-span-1">
                    <label className={labelClass}>ZIP Code</label>
                    <input readOnly tabIndex="-1" value={formData.vendorZipCode} placeholder="Auto-filled" className={readOnlyClass} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Asset Identification */}
          <div className={cardClass}>
            <h3 className={cardHeaderClass}>
              <Filter size={14} className="text-brand-gold" /> Asset Identification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Customer / Depositor <span className="text-red-400">*</span></label>
                <select required value={formData.customer} onChange={handleCustomerChange} disabled={isSubmitting} className={`${inputClass} cursor-pointer appearance-none`}>
                  <option value="">Select Customer...</option>
                  {customers.map(c => <option key={c._id} value={c._id}>{c.customerName}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Division Segment</label>
                <select value={formData.division} onChange={handleDivisionChange} disabled={!formData.customer || isSubmitting || availableDivisions.length === 0} className={`${inputClass} cursor-pointer appearance-none`}>
                  <option value="">Select Division...</option>
                  {availableDivisions.map(d => <option key={d._id} value={d._id}>{d.divisionName}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Select Inventory Asset <span className="text-red-400">*</span></label>
              <select required value={formData.inventoryItem} onChange={handleInventoryChange} disabled={!formData.division || isSubmitting || availableInventory.length === 0} className={`${inputClass} cursor-pointer appearance-none ${formData.inventoryItem ? 'border-brand-gold ring-1 ring-brand-gold/30 bg-brand-gold/5' : ''}`}>
                <option value="">{availableInventory.length > 0 ? "Search and select asset..." : "No assets found for this division"}</option>
                {availableInventory.map(inv => <option key={inv._id} value={inv._id}>{inv.productCode || inv.sku} — {inv.description || inv.itemName}</option>)}
              </select>
            </div>

            {/* Selected Asset Info Banner */}
            <AnimatePresence>
              {selectedInvDetails && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-slate-900 text-white rounded-2xl p-5 shadow-inner overflow-hidden border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Current Stock Level</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono drop-shadow-md tracking-tight">
                      {selectedInvDetails.available || selectedInvDetails.unitsOnHand || 0}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1.5">Asset Categories</span>
                    <div className="flex flex-wrap justify-end gap-2">
                      {selectedInvDetails.category1 && <span className="bg-white/10 border border-white/20 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-200">{selectedInvDetails.category1.categoryName || selectedInvDetails.category1}</span>}
                      {selectedInvDetails.category2 && <span className="bg-white/10 border border-white/20 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-200">{selectedInvDetails.category2.categoryName || selectedInvDetails.category2}</span>}
                      {selectedInvDetails.category3 && <span className="bg-white/10 border border-white/20 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-200">{selectedInvDetails.category3.categoryName || selectedInvDetails.category3}</span>}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
              <div>
                <label className={labelClass}>Lot / Batch ID</label>
                <input type="text" placeholder="e.g. LOT-8812" value={formData.lot} onChange={(e) => setFormData({...formData, lot: e.target.value})} disabled={isSubmitting} className={inputClass} />
              </div>
              
              <div className="relative">
                <label className={labelClass}>Storage Locations</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.locations.map(locId => {
                    const locObj = locations.find(l => l._id === locId);
                    return (
                      <span key={locId} className="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-2 text-xs font-bold shadow-sm">
                        <MapPin size={12} className="text-slate-400"/>
                        {locObj?.designation || locId}
                        <X size={14} className="cursor-pointer text-slate-400 hover:text-red-500 transition-colors" onClick={() => handleRemoveLocation(locId)} />
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
                  className={inputClass}
                />
                
                {/* Location Autocomplete Dropdown */}
                <AnimatePresence>
                  {isLocDropdownOpen && (
                    <motion.ul initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto custom-scrollbar overflow-hidden">
                      {availableLocations.length > 0 ? (
                        availableLocations.map(loc => {
                          const maxLimit = loc.capacity || loc.maxSkids || loc.maxPallets;
                          const currentUsage = loc.utilized || loc.currentSkids || loc.currentPallets || 0;
                          const isFull = maxLimit !== undefined && currentUsage >= maxLimit || loc.status === 'Full';

                          return (
                            <li 
                              key={loc._id} 
                              onClick={() => !isFull && handleAddLocation(loc)} 
                              className={`px-4 py-3 border-b last:border-b-0 border-slate-100 flex items-center justify-between transition-colors ${
                                isFull 
                                  ? 'bg-slate-50 cursor-not-allowed opacity-60' 
                                  : 'hover:bg-slate-50 hover:text-brand-gold cursor-pointer'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-black flex items-center gap-1.5">
                                  {loc.designation} 
                                  {isFull && <AlertCircle size={14} className="text-red-500"/>}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 mt-0.5">{loc.storageCategory || 'Standard Storage'}</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {isFull ? (
                                  <span className="text-[9px] font-black uppercase tracking-wider text-red-500 bg-red-50 px-2 py-1 rounded-md border border-red-100">Full</span>
                                ) : (
                                  maxLimit !== undefined && (
                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                      <span className="text-slate-800">{currentUsage}</span> / {maxLimit}
                                    </span>
                                  )
                                )}
                              </div>
                            </li>
                          );
                        })
                      ) : (
                        <li className="px-4 py-4 text-xs font-bold text-slate-400 text-center italic">No matching locations</li>
                      )}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Card 3: Quantitative Metrics & Breakdown */}
          <div className={cardClass}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 Quantitative Metrics
              </h3>
              <button type="button" onClick={addBreakdownRow} className="text-[10px] font-black uppercase tracking-wider text-brand-gold hover:text-white bg-brand-gold/10 hover:bg-brand-gold border border-brand-gold/20 hover:border-brand-gold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shadow-sm">
                <Plus size={14} /> Add Config
              </button>
            </div>
            
            {/* Dynamic Carton Breakdown Rows */}
            <div className="space-y-3">
              {formData.cartonBreakdown.map((row) => (
                <div key={row.id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200 shadow-sm relative transition-all hover:bg-white hover:border-slate-300">
                  
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 text-center">Cartons</label>
                    <input type="number" min="0" value={row.cartons} onChange={(e) => handleBreakdownChange(row.id, 'cartons', e.target.value)} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 text-center outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10 shadow-sm transition-all" />
                  </div>
                  
                  <span className="hidden sm:block text-slate-300 font-black text-sm pt-5">×</span>
                  
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 text-center">Units/Ctn</label>
                    <input type="number" min="0" value={row.unitsPerCarton} onChange={(e) => handleBreakdownChange(row.id, 'unitsPerCarton', e.target.value)} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 text-center outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10 shadow-sm transition-all" />
                  </div>
                  
                  <span className="hidden sm:block text-slate-300 font-black text-sm pt-5">&</span>
                  
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 text-center">Lbs/Ctn</label>
                    <input type="number" step="0.01" min="0" value={row.weightPerCarton} onChange={(e) => handleBreakdownChange(row.id, 'weightPerCarton', e.target.value)} disabled={isSubmitting} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 text-center outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10 shadow-sm transition-all" />
                  </div>

                  {/* Row Totals & Delete */}
                  <div className="w-full sm:w-24 flex items-center justify-between sm:justify-center sm:flex-col pt-3 sm:pt-4 border-t sm:border-t-0 sm:border-l border-slate-200 gap-2 sm:pl-3 mt-3 sm:mt-0">
                    <div className="text-center">
                      <span className="text-lg font-black text-brand-gold tracking-tight leading-none">
                        {((Number(row.cartons) || 0) * (Number(row.unitsPerCarton) || 0)).toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Units</span>
                    </div>
                    <button type="button" onClick={() => removeBreakdownRow(row.id)} disabled={formData.cartonBreakdown.length === 1} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Read-Only Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-slate-100">
              <div className="bg-brand-gold/5 border border-brand-gold/20 p-4 rounded-2xl flex flex-col items-center justify-center shadow-inner">
                <span className="text-[10px] font-black text-brand-gold/70 uppercase tracking-widest mb-1">Total Qty</span>
                <span className="text-2xl font-black text-brand-gold tracking-tight">{formData.quantity.toLocaleString()}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center shadow-inner">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Cartons</span>
                <span className="text-2xl font-black text-slate-800 tracking-tight">{formData.numberOfCartons.toLocaleString()}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200/60 p-4 rounded-2xl flex flex-col items-center justify-center shadow-inner">
                <span className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Total Wgt (lbs)</span>
                <span className="text-2xl font-black text-emerald-600 tracking-tight">{formData.totalWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Pallets & Fees */}
          <div className={cardClass}>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className={labelClass}>Pallets</label>
                <input type="number" min="0" value={formData.pallets} onChange={(e) => setFormData({...formData, pallets: e.target.value})} disabled={isSubmitting} className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} flex items-center gap-1`}><DollarSign size={12}/> Pallet Processing Fee</label>
                <input type="number" step="0.01" min="0" value={formData.palletProcessingFee} onChange={(e) => setFormData({...formData, palletProcessingFee: e.target.value})} disabled={isSubmitting} className={inputClass} />
              </div>
              <div>
                <label className={`${labelClass} flex items-center gap-1`}><DollarSign size={12}/> Applied Charge</label>
                <div className="relative">
                   <input type="number" step="0.01" min="0" value={formData.charge} onChange={(e) => setFormData({...formData, charge: e.target.value})} disabled={isSubmitting} className={`${inputClass} !text-emerald-700 !bg-emerald-50/30 !border-emerald-200 focus:!ring-emerald-500/20`} />
                </div>
              </div>
            </div>
          </div>

        </form>

        {/* Fixed Footer Actions */}
        <div className="p-6 bg-white border-t border-slate-200 flex flex-col-reverse sm:flex-row gap-3 shrink-0 z-10">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-xl transition-all disabled:opacity-50 text-[11px] uppercase tracking-widest text-center">
            Cancel
          </button>
          <button type="submit" form="receivingForm" disabled={isSubmitting} className="flex-1 flex justify-center items-center py-3.5 bg-slate-900 hover:bg-slate-800 text-brand-gold font-black rounded-xl shadow-xl shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-70 text-[11px] uppercase tracking-widest gap-2">
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {record ? 'Save Updates' : 'Confirm Receipt'}
          </button>
        </div>

      </motion.div>
    </div>
  );
}