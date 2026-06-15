import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Building2, Loader2, Package, Save, Calculator, AlertCircle, Hash, Box, Search,
  MapPin, Truck, AlignLeft
} from 'lucide-react';

// Actions
import { createOrder } from '../store/slices/orderSlice';
import { fetchDivisions } from '../store/slices/divisionSlice';
import { fetchCarriers } from '../store/slices/carrierSlice';
import { 
  fetchCustomers, 
  fetchCustomerInventory,
  fetchCustomerCarriers 
} from '../store/slices/customerSlice';

import PageHeader from '../components/PageHeader';

const INITIAL_STATE = {
  customer: '',
  division: '',
  orderReference: '',
  poNumber: '',
  shippingAddress: {
    name: '',
    company: '',
    street1: '',
    street2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    phone: '',
    email: ''
  },
  shippingDetails: {
    carrierType: '',
    requestedService: '',
  },
  notes: ''
};

export default function CreateOrderPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // --- Global State ---
  const { 
    items: customers = [], 
    status: customerStatus,
    customerInventory = [],
    customerCarriers = []
  } = useSelector((state) => state.customers || {});

  const { items: divisions = [] } = useSelector((state) => state.divisions || {});
  const { items: globalCarriers = [] } = useSelector((state) => state.carriers || {});

  // --- Local Form State ---
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [orderQuantities, setOrderQuantities] = useState({}); // Tracks { inventoryId: quantity }
  const [inventorySearch, setInventorySearch] = useState(''); // Tracks search filter
  
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Load baseline data on mount
  useEffect(() => {
    dispatch(fetchCustomers());
    dispatch(fetchDivisions());
    dispatch(fetchCarriers());
  }, [dispatch]);

  // 2. Fetch inventory and carriers specifically for the selected customer
  useEffect(() => {
    if (formData.customer) {
      setIsLoadingInventory(true);
      setInventorySearch(''); // Reset search when customer changes
      
      Promise.all([
        dispatch(fetchCustomerInventory(formData.customer)),
        dispatch(fetchCustomerCarriers(formData.customer))
      ]).finally(() => setIsLoadingInventory(false));
    }
  }, [dispatch, formData.customer]);

  // --- Derived Calculations & Filtering ---
  const availableDivisions = divisions.filter(d => {
    const cId = typeof d.customer === 'object' ? d.customer?._id : d.customer;
    return cId === formData.customer;
  });

  const activeCarriers = customerCarriers.length > 0 ? customerCarriers : globalCarriers;

  const orderTotal = customerInventory.reduce((sum, inv) => {
    const qty = orderQuantities[inv._id] || 0;
    const price = Number(inv.unitCost || 0);
    return sum + (qty * price);
  }, 0);

  const filteredInventory = customerInventory.filter(inv => {
    const term = inventorySearch.toLowerCase();
    const skuMatch = inv.sku?.toLowerCase().includes(term);
    const nameMatch = inv.itemName?.toLowerCase().includes(term);
    return skuMatch || nameMatch;
  });

  // --- Form Handlers ---
  const handleGeneralChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'customer') {
        newData.division = '';
        newData.shippingDetails.carrierType = '';
        setOrderQuantities({}); // Clear order lines
      }
      return newData;
    });
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      shippingAddress: { ...prev.shippingAddress, [name]: value }
    }));
  };

  const handleShippingChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      shippingDetails: { ...prev.shippingDetails, [name]: value }
    }));
  };

  const handleQuantityChange = (invId, value) => {
    const qty = Math.max(0, parseInt(value) || 0); 
    setOrderQuantities(prev => ({
      ...prev,
      [invId]: qty === 0 ? '' : qty 
    }));
  };

  // --- Submit Execution ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Validation
    if (!formData.customer) return alert('Please select a Customer Account.');
    
    // 2. Build the `items` array from the selected quantities
    const orderItems = Object.entries(orderQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([invId, qty]) => {
        const product = customerInventory.find(i => i._id === invId);
        return {
          sku: product.sku,
          name: product.itemName || product.productName || 'Unknown Product',
          quantity: Number(qty),
          unitPrice: Number(product.unitCost || 0)
        };
      });

    if (orderItems.length === 0) {
      return alert('You must specify a quantity greater than 0 for at least one item in the inventory catalog.');
    }

    // 3. Dispatch
    setIsSubmitting(true);
    try {
      const finalPayload = { ...formData, items: orderItems };
      await dispatch(createOrder(finalPayload)).unwrap();
      navigate('/orders', { replace: true }); 
    } catch (err) {
      alert(`Failed to create order: ${err}`);
      setIsSubmitting(false);
    }
  };

  if (customerStatus === 'loading' && customers.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 className="animate-spin text-brand-gold w-10 h-10" />
        <p className="font-bold text-sm">Initializing Command Module...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 space-y-6 relative animate-fade-in pb-40">
      <PageHeader 
        title="Create Manual Order" 
        subtitle="Provision a new fulfillment order directly into the COBRA network." 
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-7xl relative">
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* =========================================
              LEFT COLUMN (Configurations)
              ========================================= */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* 1. Client Details Card */}
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-5">
                <Building2 className="text-brand-gold" size={18} /> Client Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Customer Account *</label>
                  <select required name="customer" value={formData.customer} onChange={handleGeneralChange} className="w-full mt-1 bg-white/60 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-bold text-slate-900 focus:ring-1 focus:ring-brand-gold outline-none cursor-pointer">
                    <option value="" disabled>Select Client Account...</option>
                    {customers.map(c => <option key={c._id} value={c._id}>{c.customerName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Division Segment</label>
                  <select name="division" value={formData.division} onChange={handleGeneralChange} className="w-full mt-1 bg-white/60 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-bold text-slate-900 focus:ring-1 focus:ring-brand-gold outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer" disabled={!formData.customer}>
                    <option value="">Standard / Master Account</option>
                    {availableDivisions.map(d => <option key={d._id} value={d._id}>{d.divisionName}</option>)}
                  </select>
                </div>
                <div className="pt-3 border-t border-slate-200/50">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Order Reference #</label>
                  <div className="relative mt-1">
                    <Hash size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input type="text" name="orderReference" value={formData.orderReference} onChange={handleGeneralChange} placeholder="e.g. ORD-10293" className="w-full pl-9 pr-3 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-1 focus:ring-brand-gold outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">PO Number (Optional)</label>
                  <input type="text" name="poNumber" value={formData.poNumber} onChange={handleGeneralChange} placeholder="Purchase Order Number" className="w-full mt-1 px-3 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-1 focus:ring-brand-gold outline-none transition-all" />
                </div>
              </div>
            </div>

            {/* 2. Shipping Config Card */}
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] relative overflow-hidden">
              {!formData.customer && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-4">
                  <Truck className="text-slate-300 mb-2" size={24} />
                  <p className="text-xs font-bold text-slate-500">Select a customer to load routing config.</p>
                </div>
              )}
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-5">
                <Truck className="text-brand-gold" size={18} /> Shipping Config
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1 flex justify-between">
                    Carrier Preference 
                    {isLoadingInventory && <Loader2 size={10} className="animate-spin text-brand-gold" />}
                  </label>
                  <select name="carrierType" value={formData.shippingDetails.carrierType} onChange={handleShippingChange} className="w-full mt-1 bg-white/60 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-bold text-slate-900 focus:ring-1 focus:ring-brand-gold outline-none cursor-pointer disabled:opacity-50">
                    <option value="">Auto-Select (Best Rate)</option>
                    {activeCarriers.map(carrier => {
                      const carrierId = carrier._id || Math.random().toString();
                      const carrierName = carrier.accountName || carrier.carrierType || carrier.name || 'Unknown Carrier';
                      const carrierCode = carrier.carrierType || carrier.code || carrierId;
                      return <option key={carrierId} value={carrierCode}>{carrierName} {carrierCode !== carrierName ? `(${carrierCode})` : ''}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Requested Service</label>
                  <input type="text" name="requestedService" value={formData.shippingDetails.requestedService} onChange={handleShippingChange} placeholder="e.g. Next Day Air, Ground" className="w-full mt-1 px-3 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-1 focus:ring-brand-gold outline-none transition-all" disabled={!formData.customer} />
                </div>
              </div>
            </div>

            {/* 3. Internal Notes */}
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
                <AlignLeft className="text-brand-gold" size={18} /> Internal Notes
              </h3>
              <textarea 
                name="notes" 
                value={formData.notes} 
                onChange={handleGeneralChange} 
                rows="3" 
                placeholder="Add picking instructions, special packaging requests..."
                className="w-full px-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-brand-gold focus:bg-white resize-none transition-all"
              ></textarea>
            </div>

          </div>

          {/* =========================================
              RIGHT COLUMN (Address & Inventory)
              ========================================= */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Destination Address Form */}
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-5">
                <MapPin className="text-brand-gold" size={18} /> Destination Address
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Recipient Name *</label>
                  <input required type="text" name="name" value={formData.shippingAddress.name} onChange={handleAddressChange} className="w-full mt-1 px-3 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-1 focus:ring-brand-gold focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Company</label>
                  <input type="text" name="company" value={formData.shippingAddress.company} onChange={handleAddressChange} className="w-full mt-1 px-3 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-1 focus:ring-brand-gold focus:bg-white transition-all" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Street Address 1 *</label>
                  <input required type="text" name="street1" value={formData.shippingAddress.street1} onChange={handleAddressChange} className="w-full mt-1 px-3 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-1 focus:ring-brand-gold focus:bg-white transition-all" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Street Address 2</label>
                  <input type="text" name="street2" value={formData.shippingAddress.street2} onChange={handleAddressChange} placeholder="Apt, Suite, Unit, etc." className="w-full mt-1 px-3 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-1 focus:ring-brand-gold focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">City *</label>
                  <input required type="text" name="city" value={formData.shippingAddress.city} onChange={handleAddressChange} className="w-full mt-1 px-3 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-1 focus:ring-brand-gold focus:bg-white transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">State *</label>
                    <input required type="text" name="state" value={formData.shippingAddress.state} onChange={handleAddressChange} placeholder="NY" className="w-full mt-1 px-3 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-1 focus:ring-brand-gold focus:bg-white transition-all uppercase" maxLength={2} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Zip *</label>
                    <input required type="text" name="zipCode" value={formData.shippingAddress.zipCode} onChange={handleAddressChange} className="w-full mt-1 px-3 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-1 focus:ring-brand-gold focus:bg-white transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Phone</label>
                  <input type="text" name="phone" value={formData.shippingAddress.phone} onChange={handleAddressChange} className="w-full mt-1 px-3 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-1 focus:ring-brand-gold focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Email</label>
                  <input type="email" name="email" value={formData.shippingAddress.email} onChange={handleAddressChange} className="w-full mt-1 px-3 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-1 focus:ring-brand-gold focus:bg-white transition-all" />
                </div>
              </div>
            </div>

            {/* CUSTOMER INVENTORY CATALOG SECTION */}
            <div className="bg-white/60 backdrop-blur-2xl border border-white/80 p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative overflow-hidden flex flex-col h-full min-h-[600px]">
              
              {!formData.customer && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-4 rounded-[2rem]">
                  <AlertCircle className="text-brand-gold mb-2" size={28} />
                  <p className="text-sm font-bold text-slate-600">Please select a customer account to unlock their inventory.</p>
                </div>
              )}

              {/* Header with Search Bar */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6 shrink-0">
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Package className="text-brand-gold" size={20} /> AVAILABLE INVENTORY
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <p className="text-xs font-bold text-slate-500">Search and specify quantities</p>
                    {isLoadingInventory && <Loader2 size={12} className="animate-spin text-brand-gold" />}
                  </div>
                </div>
                
                {/* Search Field */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search SKU or Name..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    disabled={!formData.customer}
                    className="w-full pl-9 pr-4 py-2 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-1 focus:ring-brand-gold focus:bg-white transition-all disabled:opacity-50"
                  />
                </div>
              </div>
              
              {/* Inventory List Header (Desktop Only) */}
              <div className="hidden md:flex items-center gap-4 px-5 py-2 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200/50 shrink-0">
                <div className="flex-[2]">Product Details</div>
                <div className="w-24 text-center">Available</div>
                <div className="w-24 text-right">Unit Price</div>
                <div className="w-28 text-center">Order QTY</div>
              </div>

              {/* Inventory Scrollable List */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {customerInventory.length === 0 && !isLoadingInventory && formData.customer ? (
                  <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <p className="text-sm font-bold text-slate-500">No inventory found for this customer.</p>
                  </div>
                ) : filteredInventory.length === 0 && inventorySearch ? (
                  <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <p className="text-sm font-bold text-slate-500">No products matching "{inventorySearch}".</p>
                  </div>
                ) : (
                  filteredInventory.map((inv) => (
                    <div key={inv._id} className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-4 sm:px-5 sm:py-4 rounded-2xl border border-slate-200 transition-colors hover:border-brand-gold/50 shadow-sm">
                      
                      {/* Product Details */}
                      <div className="flex-[2] min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 tracking-wide">{inv.sku}</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-500 truncate mt-0.5" title={inv.itemName}>
                          {inv.itemName || 'Unnamed Product'}
                        </div>
                      </div>
                      
                      {/* Available Quantity */}
                      <div className="w-full md:w-24 flex items-center justify-between md:justify-center shrink-0 bg-slate-50 md:bg-transparent p-2 md:p-0 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden">Available:</span>
                        <div className="flex items-center gap-1.5 text-sm font-black text-slate-700">
                          <Box size={14} className="text-brand-gold" />
                          {inv.unitsOnHand || 0}
                        </div>
                      </div>

                      {/* Unit Price */}
                      <div className="w-full md:w-24 flex items-center justify-between md:justify-end shrink-0 p-2 md:p-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden">Price:</span>
                        <span className="text-sm font-black text-slate-900">
                          ${Number(inv.unitCost || 0).toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Order Quantity Input */}
                      <div className="w-full md:w-28 shrink-0 mt-2 md:mt-0">
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block ml-1 md:hidden">Order QTY</label>
                        <input 
                          type="number" 
                          min="0" 
                          value={orderQuantities[inv._id] || ''} 
                          onChange={(e) => handleQuantityChange(inv._id, e.target.value)} 
                          className={`w-full px-4 py-2.5 rounded-xl text-base font-black border outline-none text-center transition-all disabled:opacity-50 ${
                            orderQuantities[inv._id] > 0 
                              ? 'border-brand-gold text-brand-gold bg-brand-gold/5 focus:ring-1 focus:ring-brand-gold' 
                              : 'border-slate-200 text-slate-900 bg-white focus:border-brand-gold'
                          }`} 
                          placeholder="0"
                          disabled={!formData.customer}
                        />
                      </div>

                    </div>
                  ))
                )}
              </div>

              {/* Order Total Footer Pill */}
              <div className="mt-5 p-5 sm:px-8 bg-[#0B1120] rounded-3xl flex justify-between items-center text-white shadow-xl shrink-0">
                <div className="flex items-center gap-3">
                  <Calculator size={22} className="text-brand-gold" />
                  <span className="text-sm font-black uppercase tracking-widest text-white">Estimated Value</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight text-brand-gold">
                  ${orderTotal.toFixed(2)}
                </div>
              </div>
            </div>

          </div>
          
        </div>

        {/* Sticky Action Bar */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-50">
          <div className="p-3 bg-white/90 backdrop-blur-2xl border border-white shadow-[0_16px_40px_rgba(0,0,0,0.15)] rounded-2xl flex justify-between gap-3">
            <button type="button" onClick={() => navigate('/orders')} className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
              Discard
            </button>
            <button type="submit" disabled={isSubmitting || !formData.customer} className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-xl shadow-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]">
              {isSubmitting ? <Loader2 size={18} className="animate-spin text-brand-gold" /> : <Save size={18} className="text-brand-gold" />}
              {isSubmitting ? 'Writing...' : 'Finalize & Submit'}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}