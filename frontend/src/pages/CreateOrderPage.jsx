import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { 
  ArrowLeft, User, Building2, MapPin, Truck, 
  Package, Plus, Trash2, Save, Loader2, DollarSign,
  MessageSquare
} from 'lucide-react';

import { createOrder } from '../store/slices/orderSlice';
import { fetchCustomers } from '../store/slices/customerSlice';
import { fetchDivisions } from '../store/slices/divisionSlice';
import { fetchInventory, updateInventory } from '../store/slices/inventorySlice';
import { fetchCarriers } from '../store/slices/carrierSlice'; 

const generateLocalId = () => `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function CreateOrderPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // --- Redux State ---
  const { items: customers = [], status: custStatus } = useSelector(state => state.customers || {});
  const { items: divisions = [], status: divStatus } = useSelector(state => state.divisions || {});
  const { items: inventory = [], status: invStatus } = useSelector(state => state.inventory || {});
  const { items: carriers = [], status: carrierStatus } = useSelector(state => state.carriers || {}); 

  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Form State ---
  const [formData, setFormData] = useState({
    customer: '',
    division: '',
    status: 'Pending',
    notes: '',
    shippingAddress: { recipientName: '', email: '', phone: '', line1: '', line2: '', city: '', state: '', zip: '', country: 'US' },
    shippingDetails: { carrierType: '', serviceCode: '', trackingNumber: '', shippingCost: 0 }
  });

  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ inventoryId: '', sku: '', name: '', quantity: 1, unitPrice: 0, weight: 0 });

  // --- Fetch Global Dependencies Once on Mount ---
  useEffect(() => {
    if (custStatus === 'idle') dispatch(fetchCustomers());
    if (divStatus === 'idle') dispatch(fetchDivisions());
    if (invStatus === 'idle') dispatch(fetchInventory());
    if (carrierStatus === 'idle' || carrierStatus === 'failed') dispatch(fetchCarriers());
  }, [dispatch, custStatus, divStatus, invStatus, carrierStatus]);

  // --- Filter Divisions based on Customer ---
  const availableDivisions = useMemo(() => {
    if (!formData.customer) return [];
    return divisions.filter(d => (d.customer?._id || d.customer) === formData.customer);
  }, [divisions, formData.customer]);

  // --- Local Filter: Carriers Scoped to the Selected Division ---
  const divisionCarriers = useMemo(() => {
    if (!formData.division) return [];
    return carriers.filter(c => 
      String(c.division?._id || c.division) === String(formData.division) && c.isActive
    );
  }, [carriers, formData.division]);

  // --- Filter Services based on Carrier Selection ---
  const availableServices = useMemo(() => {
    if (!formData.shippingDetails.carrierType) return [];
    const selectedCarrier = divisionCarriers.find(c => c.carrierType === formData.shippingDetails.carrierType);
    return selectedCarrier?.enabledServices?.filter(s => s.isActive) || [];
  }, [divisionCarriers, formData.shippingDetails.carrierType]);

  // --- Calculations ---
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const shippingCost = Number(formData.shippingDetails.shippingCost) || 0;
  const grandTotal = subtotal + shippingCost;
  const totalWeightOunces = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.weight)), 0);

  // --- Handlers ---
  const handleAddressChange = (e) => {
    setFormData(prev => ({
      ...prev,
      shippingAddress: { ...prev.shippingAddress, [e.target.name]: e.target.value }
    }));
  };

  const handleShippingChange = (e) => {
    setFormData(prev => ({
      ...prev,
      shippingDetails: { ...prev.shippingDetails, [e.target.name]: e.target.value }
    }));
  };

  const handleInventorySelect = (e) => {
    const selectedInv = inventory.find(inv => inv._id === e.target.value);
    if (selectedInv) {
      setNewItem({
        inventoryId: selectedInv._id,
        sku: selectedInv.sku || selectedInv.productCode || 'N/A',
        name: selectedInv.itemName || selectedInv.description || 'Unnamed Item',
        quantity: 1,
        unitPrice: selectedInv.price || selectedInv.unitCost || 0,
        weight: selectedInv.weight || 0
      });
    } else {
      setNewItem({ inventoryId: '', sku: '', name: '', quantity: 1, unitPrice: 0, weight: 0 });
    }
  };

  const handleAddItem = () => {
    if (!newItem.name || Number(newItem.quantity) < 1) {
      return toast.error("Please select a valid item and quantity.");
    }
    setItems([...items, { ...newItem, id: generateLocalId() }]);
    setNewItem({ inventoryId: '', sku: '', name: '', quantity: 1, unitPrice: 0, weight: 0 });
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  // --- Core Submit & Route Alignment ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer || !formData.division) {
      return toast.error("Customer and Division assignments are required.");
    }
    if (items.length === 0) {
      return toast.error("You must add at least one item to the order.");
    }
    if (!formData.shippingAddress.recipientName || !formData.shippingAddress.line1 || !formData.shippingAddress.city) {
      return toast.error("Please complete the required shipping address fields.");
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Creating Order and Deducting Inventory...");

    try {
      const orderPayload = {
        customer: formData.customer,
        division: formData.division, 
        status: formData.status,
        notes: formData.notes,
        orderNumber: `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
        totalAmount: grandTotal,
        totalWeightOunces: totalWeightOunces,
        shippingAddress: formData.shippingAddress,
        shippingDetails: {
          ...formData.shippingDetails,
          shippingCost: Number(formData.shippingDetails.shippingCost) 
        },
        items: items.map(i => ({
          sku: i.sku,
          name: i.name,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          totalPrice: Number(i.quantity) * Number(i.unitPrice)
        }))
      };

      const newOrder = await dispatch(createOrder(orderPayload)).unwrap();

      // Robust Inventory Deduction
      await Promise.all(items.map(async (item) => {
        if (!item.inventoryId) return; 
        
        const stockItem = inventory.find(inv => inv._id === item.inventoryId);
        if (stockItem) {
          const currentStock = Number(stockItem.unitsOnHand) || Number(stockItem.available) || 0;
          const newStock = Math.max(0, currentStock - Number(item.quantity)); 
          
          const updatedData = { 
            ...stockItem, 
            unitsOnHand: newStock, 
            available: newStock 
          };
          
          await dispatch(updateInventory({ id: stockItem._id, inventoryData: updatedData })).unwrap();
        }
      }));

      toast.success(`Order ${newOrder.orderNumber} successfully deployed!`, { id: toastId });
      navigate('/orders');

    } catch (err) {
      console.error(err);
      toast.error(`Failed to create order: ${err}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- UI Components ---
  const inputClass = "w-full bg-white/70 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all placeholder:text-slate-400";
  const labelClass = "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1 block";

  return (
    <form onSubmit={handleSubmit} className="relative h-full p-6 space-y-6 animate-fade-in max-w-[1400px] mx-auto pb-32">
      
      {/* Background Orbs */}
      <div className="absolute top-20 right-0 w-80 h-80 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute top-40 left-0 w-80 h-80 bg-brand-gold/10 rounded-full mix-blend-multiply filter blur-3xl -z-10 pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => navigate('/orders')} className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm">
            <ArrowLeft className="text-slate-600" size={18} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Deploy New Order</h1>
            <p className="text-xs font-bold text-slate-500 mt-0.5">Manually construct a fulfillment record.</p>
          </div>
        </div>
        
        <button 
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 bg-slate-900 text-brand-gold px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isSubmitting ? 'Deploying...' : 'Deploy Order'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Customer, Division, Shipping */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Organization Context */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-[2rem] shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-5 flex items-center gap-2">
              <Building2 className="text-brand-gold" size={16} /> Operational Context
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Select Customer <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-slate-400" size={16} />
                  <select 
                    required
                    className={`${inputClass} pl-10 appearance-none`}
                    value={formData.customer} 
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        customer: e.target.value, 
                        division: '',
                        shippingDetails: { ...formData.shippingDetails, carrierType: '', serviceCode: '' } 
                      });
                    }}
                  >
                    <option value="" disabled>Choose a customer...</option>
                    {customers.map(c => <option key={c._id} value={c._id}>{c.customerName}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Select Division <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 text-slate-400" size={16} />
                  <select 
                    required
                    disabled={!formData.customer}
                    className={`${inputClass} pl-10 appearance-none disabled:opacity-50`}
                    value={formData.division} 
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        division: e.target.value,
                        shippingDetails: { ...formData.shippingDetails, carrierType: '', serviceCode: '' }
                      });
                    }}
                  >
                    <option value="" disabled>{formData.customer ? 'Choose a division...' : 'Select customer first...'}</option>
                    {availableDivisions.map(d => <option key={d._id} value={d._id}>{d.divisionName}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-[2rem] shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-5 flex items-center gap-2">
              <MapPin className="text-brand-gold" size={16} /> Shipping Destination
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Recipient Name <span className="text-red-500">*</span></label>
                <input required type="text" name="recipientName" value={formData.shippingAddress.recipientName} onChange={handleAddressChange} className={inputClass} placeholder="John Doe" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" name="email" value={formData.shippingAddress.email} onChange={handleAddressChange} className={inputClass} placeholder="john@example.com" />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input type="text" name="phone" value={formData.shippingAddress.phone} onChange={handleAddressChange} className={inputClass} placeholder="(555) 123-4567" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Address Line 1 <span className="text-red-500">*</span></label>
                <input required type="text" name="line1" value={formData.shippingAddress.line1} onChange={handleAddressChange} className={inputClass} placeholder="123 Logistics Way" />
              </div>
              <div>
                <label className={labelClass}>Address Line 2</label>
                <input type="text" name="line2" value={formData.shippingAddress.line2} onChange={handleAddressChange} className={inputClass} placeholder="Suite, Apt, etc." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className={labelClass}>City <span className="text-red-500">*</span></label>
                  <input required type="text" name="city" value={formData.shippingAddress.city} onChange={handleAddressChange} className={inputClass} placeholder="City" />
                </div>
                <div className="flex gap-2 col-span-2 sm:col-span-1">
                  <div className="flex-1">
                    <label className={labelClass}>State</label>
                    <input type="text" name="state" value={formData.shippingAddress.state} onChange={handleAddressChange} className={inputClass} placeholder="ST" />
                  </div>
                  <div className="flex-1">
                    <label className={labelClass}>Zip <span className="text-red-500">*</span></label>
                    <input required type="text" name="zip" value={formData.shippingAddress.zip} onChange={handleAddressChange} className={inputClass} placeholder="12345" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Logistics Configuration */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-[2rem] shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-5 flex items-center gap-2">
              <Truck className="text-brand-gold" size={16} /> Logistics & Carrier
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                
                {/* Dynamic Carrier Dropdown Scoped to Division */}
                <div>
                  <label className={labelClass}>Carrier Network</label>
                  <select 
                    name="carrierType" 
                    value={formData.shippingDetails.carrierType} 
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      shippingDetails: { ...prev.shippingDetails, carrierType: e.target.value, serviceCode: '' }
                    }))} 
                    className={`${inputClass} appearance-none cursor-pointer disabled:opacity-50`}
                    disabled={!formData.division || carrierStatus === 'loading'}
                  >
                    <option value="" disabled>{carrierStatus === 'loading' ? 'Syncing carriers...' : 'Select a carrier...'}</option>
                    {divisionCarriers.map(c => (
                      <option key={c._id} value={c.carrierType}>
                        {c.carrierType} {c.accountName ? `(${c.accountName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dynamic Service Dropdown */}
                <div>
                  <label className={labelClass}>Service Level</label>
                  <select 
                    name="serviceCode" 
                    value={formData.shippingDetails.serviceCode} 
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      shippingDetails: { ...prev.shippingDetails, serviceCode: e.target.value }
                    }))} 
                    className={`${inputClass} appearance-none cursor-pointer disabled:opacity-50`}
                    disabled={!formData.shippingDetails.carrierType}
                  >
                    <option value="" disabled>Select service...</option>
                    {availableServices.map(s => (
                      <option key={s.serviceCode} value={s.serviceCode}>
                        {s.serviceName || s.serviceCode}
                      </option>
                    ))}
                  </select>
                </div>

              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tracking Number</label>
                  <input type="text" name="trackingNumber" value={formData.shippingDetails.trackingNumber} onChange={handleShippingChange} className={inputClass} placeholder="1Z999..." />
                </div>
                <div>
                  <label className={labelClass}>Shipping Cost ($)</label>
                  <input type="number" min="0" step="0.01" name="shippingCost" value={formData.shippingDetails.shippingCost} onChange={handleShippingChange} className={inputClass} placeholder="0.00" />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Items & Summary */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-[2rem] shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-5 flex items-center gap-2">
              <Package className="text-brand-gold" size={16} /> Order Manifest
            </h2>

            {/* Asset Adder Bar */}
            <div className="bg-slate-50/80 border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row items-end gap-3 mb-6 shadow-inner">
              <div className="w-full md:flex-1">
                <label className={labelClass}>Select from Catalog</label>
                <select className={`${inputClass} appearance-none`} value={newItem.inventoryId} onChange={handleInventorySelect}>
                  <option value="">Choose item to add...</option>
                  {inventory
                    .filter(inv => {
                       // Only show items belonging to the selected division, or all if division not selected yet
                       const invDivId = inv.division?._id || inv.division;
                       return formData.division ? invDivId === formData.division : true;
                    })
                    .map(inv => (
                      <option key={inv._id} value={inv._id}>
                        [{inv.sku || inv.productCode}] {inv.itemName || inv.description} ({inv.available} available)
                      </option>
                  ))}
                </select>
              </div>
              <div className="w-full md:w-24">
                <label className={labelClass}>Qty</label>
                <input type="number" min="1" className={`${inputClass} text-center`} value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: e.target.value})} />
              </div>
              <div className="w-full md:w-32">
                <label className={labelClass}>Unit Price</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 text-slate-400" size={14} />
                  <input type="number" min="0" step="0.01" className={`${inputClass} pl-8`} value={newItem.unitPrice} onChange={(e) => setNewItem({...newItem, unitPrice: e.target.value})} />
                </div>
              </div>
              <button 
                type="button"
                onClick={handleAddItem}
                className="w-full md:w-auto h-[42px] px-6 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-slate-800 transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add
              </button>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white/50">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100/50">
                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">
                    <th className="p-4">SKU</th>
                    <th className="p-4">Item Name</th>
                    <th className="p-4 text-center">Qty</th>
                    <th className="p-4 text-right">Unit Price</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4 text-center">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-bold text-sm">
                        No items added to manifest yet.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-white/80 transition-colors">
                        <td className="p-4 font-mono text-xs text-slate-500">{item.sku || 'N/A'}</td>
                        <td className="p-4 font-bold text-slate-900 text-sm">{item.name}</td>
                        <td className="p-4 text-center">
                          <span className="bg-slate-100 px-3 py-1 rounded-lg font-black text-xs border border-slate-200">{item.quantity}</span>
                        </td>
                        <td className="p-4 text-right font-bold text-slate-600">${Number(item.unitPrice).toFixed(2)}</td>
                        <td className="p-4 text-right font-black text-slate-900">${(Number(item.quantity) * Number(item.unitPrice)).toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <button type="button" onClick={() => handleRemoveItem(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-widest text-amber-800 mb-3 flex items-center gap-2">
                <MessageSquare size={16} /> Fulfillment Notes
              </h2>
              <textarea 
                className="w-full bg-white border border-amber-200 rounded-xl p-4 text-sm font-medium text-slate-700 focus:border-amber-400 outline-none resize-none min-h-[140px] shadow-inner"
                placeholder="Add special instructions, client requests, or internal logistics notes here..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="bg-white/60 backdrop-blur-md border border-white/80 p-6 rounded-[2rem] shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-5 flex items-center gap-2">
                <DollarSign className="text-brand-gold" size={16} /> Financial Summary
              </h2>
              <div className="space-y-3 text-sm font-bold bg-white/50 p-5 rounded-2xl border border-slate-200/60 shadow-inner">
                <div className="flex justify-between text-slate-500">
                  <span>Manifest Subtotal</span> 
                  <span className="font-mono">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Logistics & Shipping</span> 
                  <span className="font-mono">${shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-4 mt-2">
                  <span className="text-base text-slate-900 font-black uppercase tracking-widest">Grand Total</span> 
                  <span className="font-mono text-xl font-black text-brand-gold drop-shadow-sm">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </form>
  );
}