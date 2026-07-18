import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner'; 
import { 
  ArrowLeft, MapPin, CreditCard, 
  Trash2, Plus, MessageSquare, 
  PackageCheck, Save, Loader2, Truck, Box
} from 'lucide-react';

import { fetchOrderById, updateOrder, clearCurrentOrder } from '../store/slices/orderSlice'; 
import { fetchInventory } from '../store/slices/inventorySlice'; 
import NotFoundPage from './NotFoundPage';

// --- Utilities ---
const generateLocalId = () => `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function EditOrderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isValidMongoId = /^[0-9a-fA-F]{24}$/.test(id || '');

  const { currentOrder, status: orderLoadStatus, error: orderError } = useSelector((state) => state.orders || {});
  const { items: inventoryData = [], status: inventoryStatus } = useSelector((state) => state.inventory || {});
  
  // --- Form State ---
  const [orderStatus, setOrderStatus] = useState('Pending');
  const [shipping, setShipping] = useState({ carrierType: '', serviceCode: '', trackingNumber: '', shippingCost: 0 });
  const [address, setAddress] = useState({ name: '', email: '', phone: '', street: '', line2: '', city: '', state: '', zip: '', country: 'US' });
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  
  const [newItem, setNewItem] = useState({ name: '', sku: '', qty: 1, price: 0, weight: 0 });
  const [isSaving, setIsSaving] = useState(false);

  // --- Calculations ---
  const subtotal = items.reduce((acc, item) => acc + (Number(item.price) * Number(item.qty)), 0);
  const shippingCost = Number(shipping.shippingCost) || 0;
  const tax = subtotal * 0.08; // Assuming 8% tax rate
  const grandTotal = subtotal + shippingCost + tax;

  // Initialize Data
  useEffect(() => {
    if (isValidMongoId) dispatch(fetchOrderById(id));
    if (inventoryStatus === 'idle') dispatch(fetchInventory());
    return () => dispatch(clearCurrentOrder());
  }, [id, isValidMongoId, inventoryStatus, dispatch]);

  const availableInventories = useMemo(() => {
    return inventoryData.map(inv => ({
      id: inv._id,
      name: inv.itemName || 'Unnamed Item',
      sku: inv.sku,
      price: inv.unitCost || inv.price || 0,
      weight: inv.weight || 0
    }));
  }, [inventoryData]);

  // Populate Form
  useEffect(() => {
    if (currentOrder) {
      setOrderStatus(currentOrder.status || 'Pending');
      setShipping({ 
        carrierType: currentOrder.shippingDetails?.carrierType || '', 
        serviceCode: currentOrder.shippingDetails?.serviceCode || '', 
        trackingNumber: currentOrder.shippingDetails?.trackingNumber || '',
        shippingCost: currentOrder.shippingDetails?.shippingCost || 0
      });
      setAddress({ 
        name: currentOrder.shippingAddress?.recipientName || '', 
        email: currentOrder.shippingAddress?.email || '',
        phone: currentOrder.shippingAddress?.phone || '',
        street: currentOrder.shippingAddress?.line1 || '', 
        line2: currentOrder.shippingAddress?.line2 || '', 
        city: currentOrder.shippingAddress?.city || '', 
        state: currentOrder.shippingAddress?.state || '', 
        zip: currentOrder.shippingAddress?.zip || '',
        country: currentOrder.shippingAddress?.country || 'US'
      });
      setNotes(currentOrder.notes || '');
      
      const mappedItems = currentOrder.items?.map((i) => {
        const matchedStock = availableInventories.find(inv => inv.sku === i.sku);
        return {
          id: generateLocalId(), 
          name: i.name,
          sku: i.sku,
          qty: i.quantity,
          price: i.unitPrice,
          weight: matchedStock?.weight || 0 
        };
      }) || [];
      
      setItems(mappedItems);
    }
  }, [currentOrder, availableInventories]);

  // --- Handlers ---
  const handleInventoryChange = (e) => {
    const selectedId = e.target.value;
    const matchedStock = availableInventories.find(inv => inv.id === selectedId);
    if (matchedStock) {
      setNewItem({ ...newItem, name: matchedStock.name, sku: matchedStock.sku, price: matchedStock.price, weight: matchedStock.weight });
    } else {
      setNewItem({ name: '', sku: '', qty: 1, price: 0, weight: 0 });
    }
  };

  const handleAddItem = () => {
    if (!newItem.name || newItem.price === undefined) return toast.error("Please select an item to add.");
    setItems([
      ...items, 
      { ...newItem, id: generateLocalId(), qty: Number(newItem.qty), price: Number(newItem.price), weight: Number(newItem.weight || 0) }
    ]);
    setNewItem({ name: '', sku: '', qty: 1, price: 0, weight: 0 });
  };

  const handleSaveOrder = async () => {
    if (!address.name || !address.street || !address.city || !address.state || !address.zip) {
      return toast.warning("Please fill out all required shipping address fields.");
    }
    if (items.length === 0) {
      return toast.warning("Order must contain at least one item.");
    }

    setIsSaving(true);

    const payload = {
      status: orderStatus,
      notes: notes,
      shippingAddress: {
        recipientName: address.name, email: address.email, phone: address.phone,
        line1: address.street, line2: address.line2, city: address.city,
        state: address.state, zip: address.zip, country: address.country
      },
      shippingDetails: {
        ...currentOrder.shippingDetails,
        carrierType: shipping.carrierType, serviceCode: shipping.serviceCode,
        trackingNumber: shipping.trackingNumber, shippingCost: Number(shipping.shippingCost)
      },
      items: items.map(item => ({
        sku: item.sku, name: item.name, quantity: Number(item.qty),
        unitPrice: Number(item.price), totalPrice: Number(item.qty) * Number(item.price)
      }))
    };

    try {
      await dispatch(updateOrder({ id: currentOrder._id, updateData: payload })).unwrap();
      toast.success('Order updated successfully.');
      navigate(`/orders/${currentOrder._id}`);
    } catch (error) {
      toast.error(`Failed to update order: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isValidMongoId) return <NotFoundPage />;
  if (orderLoadStatus === 'failed' || orderError) return <NotFoundPage />;
  if (orderLoadStatus === 'loading' || !currentOrder) {
    return (
      <div className="h-full flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin text-brand-gold" size={32} />
          <p className="text-xs font-black uppercase tracking-widest">Loading Editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in max-w-[1000px] mx-auto pb-10 px-4 box-border text-slate-900">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-white/30 p-4 rounded-2xl border border-white/50 backdrop-blur-xl shadow-sm">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors duration-200">
            <ArrowLeft size={18} />
            </button>
            <div>
                <h1 className="text-lg font-black tracking-tight text-slate-900">Edit Order</h1>
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{currentOrder.orderNumber}</p>
            </div>
        </div>
        
        <button 
          onClick={handleSaveOrder}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-gold text-white rounded-xl text-xs font-black shadow-lg shadow-brand-gold/20 hover:scale-105 transition-all duration-200 disabled:opacity-70 disabled:hover:scale-100"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Details & Addresses */}
        <div className="space-y-6">
          
          {/* General Details Form */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2 border-b border-white/60 pb-3">
                <Box size={14}/> Core Details
            </h3>
            
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Order Status</label>
                    <select 
                        value={orderStatus} 
                        onChange={(e) => setOrderStatus(e.target.value)} 
                        className="w-full bg-white text-xs font-bold px-4 py-3 rounded-xl border border-slate-200 cursor-pointer outline-none focus:border-brand-gold transition-all shadow-sm"
                    >
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Ready to Ship">Ready to Ship</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Carrier</label>
                        <input 
                            className="w-full bg-white p-3 rounded-xl text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm transition-all" 
                            value={shipping.carrierType} 
                            onChange={(e) => setShipping({...shipping, carrierType: e.target.value})} 
                            placeholder="e.g. UPS" 
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Service Code</label>
                        <input 
                            className="w-full bg-white p-3 rounded-xl text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm transition-all" 
                            value={shipping.serviceCode} 
                            onChange={(e) => setShipping({...shipping, serviceCode: e.target.value})} 
                            placeholder="e.g. ups_ground" 
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Tracking Number</label>
                    <input 
                        className="w-full bg-white p-3 rounded-xl text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm transition-all" 
                        value={shipping.trackingNumber} 
                        onChange={(e) => setShipping({...shipping, trackingNumber: e.target.value})} 
                        placeholder="Tracking ID" 
                    />
                </div>
            </div>
          </div>

          {/* Shipping Address Form */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2 border-b border-white/60 pb-3">
                <MapPin size={14}/> Shipping Address
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Recipient Name *</label>
                    <input className="w-full bg-white p-3 rounded-xl text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm transition-all" value={address.name} onChange={(e) => setAddress({...address, name: e.target.value})} placeholder="Full Name" />
                </div>
                
                <div className="col-span-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Email</label>
                    <input className="w-full bg-white p-3 rounded-xl text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm transition-all" value={address.email} onChange={(e) => setAddress({...address, email: e.target.value})} placeholder="Email Address" type="email" />
                </div>
                
                <div className="col-span-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Phone</label>
                    <input className="w-full bg-white p-3 rounded-xl text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm transition-all" value={address.phone} onChange={(e) => setAddress({...address, phone: e.target.value})} placeholder="Phone Number" />
                </div>
                
                <div className="col-span-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Address Line 1 *</label>
                    <input className="w-full bg-white p-3 rounded-xl text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm transition-all" value={address.street} onChange={(e) => setAddress({...address, street: e.target.value})} placeholder="Street Address" />
                </div>
                
                <div className="col-span-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Address Line 2</label>
                    <input className="w-full bg-white p-3 rounded-xl text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm transition-all" value={address.line2} onChange={(e) => setAddress({...address, line2: e.target.value})} placeholder="Apt, Suite, Unit, etc." />
                </div>
                
                <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">City *</label>
                    <input className="w-full bg-white p-3 rounded-xl text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm transition-all" value={address.city} onChange={(e) => setAddress({...address, city: e.target.value})} placeholder="City" />
                </div>
                
                <div className="col-span-1 flex gap-3">
                    <div className="w-1/2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">State *</label>
                        <input className="w-full bg-white p-3 rounded-xl text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm transition-all" value={address.state} onChange={(e) => setAddress({...address, state: e.target.value})} placeholder="ST" />
                    </div>
                    <div className="w-1/2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Zip *</label>
                        <input className="w-full bg-white p-3 rounded-xl text-xs font-medium border border-slate-200 focus:border-brand-gold outline-none shadow-sm transition-all" value={address.zip} onChange={(e) => setAddress({...address, zip: e.target.value})} placeholder="Zip Code" />
                    </div>
                </div>
            </div>
          </div>

          <div className="bg-amber-50/80 border border-amber-200/60 p-6 rounded-3xl shadow-sm backdrop-blur-xl">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-800 mb-3 flex items-center gap-2"><MessageSquare size={14}/> Order Notes</h3>
             <textarea 
               value={notes} 
               onChange={(e) => setNotes(e.target.value)}
               className="w-full bg-white border border-amber-200/60 rounded-xl p-4 text-xs font-medium text-slate-700 focus:border-amber-400 outline-none resize-none min-h-[100px] shadow-inner"
               placeholder="Add internal notes or customer requests here..."
             />
          </div>

        </div>

        {/* Right Column: Manifest & Totals */}
        <div className="space-y-6">
            
          {/* Manifest Form */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2 border-b border-white/60 pb-3">
              <PackageCheck size={14} /> Edit Manifest Items
            </h3>
            
            <div className="space-y-4">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-slate-100 group">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                            <p className="text-[10px] font-mono text-slate-500 truncate">{item.sku}</p>
                        </div>
                        <div className="w-16 shrink-0">
                            <input 
                                type="number" 
                                min="1" 
                                className="w-full bg-white border border-slate-200 rounded-lg text-center text-xs font-bold py-1.5 outline-none focus:border-brand-gold shadow-sm"
                                value={item.qty}
                                onChange={(e) => {
                                    const newQty = parseInt(e.target.value) || 1;
                                    setItems(items.map(i => i.id === item.id ? { ...i, qty: newQty } : i));
                                }}
                            />
                        </div>
                        <div className="w-20 shrink-0 text-right">
                            <p className="text-xs font-black text-slate-800">${(item.price * item.qty).toFixed(2)}</p>
                        </div>
                        <button 
                            onClick={() => setItems(items.filter(i => i.id !== item.id))} 
                            className="text-slate-300 hover:text-red-500 transition-colors duration-200 p-1 shrink-0"
                        >
                            <Trash2 size={16}/>
                        </button>
                    </div>
                ))}

                {/* Add Item Row */}
                <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 shadow-inner space-y-3 mt-4">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500">Add Product</h4>
                    <select 
                        className="w-full bg-white p-2.5 rounded-lg text-xs font-bold border border-slate-200 outline-none focus:border-brand-gold text-slate-700 cursor-pointer shadow-sm transition-all"
                        value={availableInventories.find(i => i.name === newItem.name)?.id || ''}
                        onChange={handleInventoryChange}
                        disabled={inventoryStatus === 'loading'}
                    >
                        <option className="text-slate-400" value="">{inventoryStatus === 'loading' ? 'Loading Catalog...' : 'Select Item from Catalog...'}</option>
                        {availableInventories.map(inv => (
                            <option key={inv.id} value={inv.id}>{inv.name} (SKU: {inv.sku})</option>
                        ))}
                    </select>

                    <div className="flex gap-2">
                        <input 
                            type="number" 
                            min="1" 
                            className="w-20 bg-white p-2.5 rounded-lg text-xs font-bold border border-slate-200 text-center outline-none focus:border-brand-gold shadow-sm" 
                            value={newItem.qty} 
                            onChange={(e) => setNewItem({...newItem, qty: e.target.value})} 
                        />
                        <div className="flex-1 bg-slate-100 p-2.5 rounded-lg text-xs font-black border border-slate-200 flex items-center justify-end text-slate-400 shadow-inner cursor-not-allowed">
                            {newItem.price ? `$${Number(newItem.price).toFixed(2)}` : '$0.00'}
                        </div>
                        <button 
                            onClick={handleAddItem} 
                            className="bg-slate-900 text-white px-4 rounded-lg hover:bg-slate-800 transition-all shadow-md active:scale-95 flex items-center justify-center"
                        >
                            <Plus size={16}/>
                        </button>
                    </div>
                </div>
            </div>
          </div>

          {/* Invoice Summary Preview */}
          <div className="bg-slate-950 text-white p-6 rounded-3xl shadow-xl border border-slate-900 relative overflow-hidden">
             <div className="absolute -right-8 -top-8 w-32 h-32 bg-brand-gold/10 rounded-full blur-2xl pointer-events-none"></div>
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4 border-b border-white/10 pb-3 relative z-10">
                 <CreditCard size={14}/> Invoice Preview
             </h3>
             <div className="text-sm font-medium space-y-3 relative z-10 text-slate-300">
               <div className="flex justify-between"><span>Subtotal</span> <span className="font-mono text-white">${subtotal.toFixed(2)}</span></div>
               <div className="flex justify-between items-center">
                   <span>Shipping Cost</span> 
                   <div className="flex items-center border border-white/20 rounded-lg overflow-hidden bg-white/5 w-24">
                       <span className="px-2 text-xs text-slate-400">$</span>
                       <input 
                           type="number" 
                           className="w-full bg-transparent text-white font-mono outline-none py-1 text-right pr-2 text-sm" 
                           value={shipping.shippingCost} 
                           onChange={(e) => setShipping({...shipping, shippingCost: e.target.value})} 
                       />
                   </div>
               </div>
               <div className="flex justify-between"><span>Estimated Tax</span> <span className="font-mono text-white">${tax.toFixed(2)}</span></div>
               <div className="flex justify-between border-t pt-4 mt-2 border-white/10 text-white items-end">
                 <span className="text-xs uppercase tracking-widest font-black text-slate-400">Total</span> 
                 <span className="font-mono text-3xl font-black text-brand-gold tracking-tight">${grandTotal.toFixed(2)}</span>
               </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}