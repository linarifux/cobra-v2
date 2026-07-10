import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ArrowLeft, Truck, MapPin, User, CreditCard, 
  Trash2, Edit2, Check, Plus, Minus,
  MessageSquare, Mail, Phone, X, Weight, Loader2, Save, ExternalLink
} from 'lucide-react';

// Redux Actions
import { fetchOrderById, updateOrder, clearCurrentOrder } from '../store/slices/orderSlice';
import { fetchInventory } from '../store/slices/inventorySlice';

// 404 Fallback Component
import NotFoundPage from './NotFoundPage';

// Helper to generate safe local IDs for new items mapped in UI
const generateLocalId = () => `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // --- Security Check: Validate MongoDB ObjectID Format ---
  // A valid Mongo ID is exactly 24 hex characters. If it's not, we immediately know it's a bad URL.
  const isValidMongoId = /^[0-9a-fA-F]{24}$/.test(id || '');

  // Redux States
  const { currentOrder, status: orderLoadStatus, error: orderError } = useSelector((state) => state.orders || {});
  const { items: inventoryData = [], status: inventoryStatus } = useSelector((state) => state.inventory || {});

  // Local editable states mapped directly to the API JSON structure
  const [orderStatus, setOrderStatus] = useState('Pending');
  const [shipping, setShipping] = useState({ carrierType: '', serviceCode: '', trackingNumber: '', shippingCost: 0 });
  const [address, setAddress] = useState({ name: '', email: '', phone: '', street: '', line2: '', city: '', state: '', zip: '', country: '' });
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  
  // UI states
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [cartonCount, setCartonCount] = useState(1);
  const [newItem, setNewItem] = useState({ name: '', sku: '', qty: 1, price: 0, weight: 0 });
  const [editing, setEditing] = useState({ logistics: false, address: false });
  const [isSaving, setIsSaving] = useState(false);

  // 1. Fetch Order and Global Inventory on Mount (Only if ID is valid)
  useEffect(() => {
    if (isValidMongoId) {
      dispatch(fetchOrderById(id));
    }
    if (inventoryStatus === 'idle') {
      dispatch(fetchInventory());
    }
    
    return () => dispatch(clearCurrentOrder());
  }, [id, isValidMongoId, inventoryStatus, dispatch]);

  // 2. Format Inventory Data for the UI Dropdowns
  const availableInventories = useMemo(() => {
    return inventoryData.map(inv => ({
      id: inv._id,
      name: inv.itemName || 'Unnamed Item',
      sku: inv.sku,
      price: inv.unitCost || 0,
      weight: inv.weight || 0
    }));
  }, [inventoryData]);

  // 3. Sync Redux Order Data to Local State for editing
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
        country: currentOrder.shippingAddress?.country || 'USA'
      });
      
      setNotes(currentOrder.notes || '');
      
      // Initialize items mapping (attempting to match stock immediately if loaded)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrder]); 

  // 4. Backfill Weights if inventory data finishes loading AFTER the order maps
  useEffect(() => {
    if (availableInventories.length > 0 && items.length > 0) {
      setItems(prevItems => prevItems.map(item => {
        if (!item.weight || item.weight === 0) {
          const matchedStock = availableInventories.find(inv => inv.sku === item.sku);
          if (matchedStock) {
            return { ...item, weight: matchedStock.weight };
          }
        }
        return item;
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableInventories]);

  // Financial Calculations
  const subtotal = items.reduce((acc, item) => acc + (Number(item.price) * Number(item.qty)), 0);
  const shippingCost = Number(shipping.shippingCost) || 0;
  const tax = subtotal * 0.08; 
  const grandTotal = subtotal + shippingCost + tax;
  const totalWeight = items.reduce((acc, item) => acc + (Number(item.weight) * Number(item.qty)), 0);

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
    if (!newItem.name || !newItem.price) return;
    setItems([
      ...items, 
      { 
        ...newItem, 
        id: generateLocalId(), 
        qty: Number(newItem.qty), 
        price: Number(newItem.price), 
        weight: Number(newItem.weight || 0) 
      }
    ]);
    setNewItem({ name: '', sku: '', qty: 1, price: 0, weight: 0 });
  };

  // Push changes to MongoDB via Redux
  const handleSaveOrder = async () => {
    setIsSaving(true);
    
    const payload = {
      status: orderStatus,
      notes: notes,
      shippingAddress: {
        recipientName: address.name,
        email: address.email,
        phone: address.phone,
        line1: address.street,
        line2: address.line2,
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country
      },
      shippingDetails: {
        ...currentOrder.shippingDetails,
        carrierType: shipping.carrierType,
        serviceCode: shipping.serviceCode,
        trackingNumber: shipping.trackingNumber,
        shippingCost: Number(shipping.shippingCost)
      },
      items: items.map(item => ({
        sku: item.sku,
        name: item.name,
        quantity: Number(item.qty),
        unitPrice: Number(item.price),
        totalPrice: Number(item.qty) * Number(item.price)
      }))
    };

    try {
      await dispatch(updateOrder({ id: currentOrder._id, updateData: payload })).unwrap();
      setEditing({ logistics: false, address: false }); 
    } catch (error) {
      alert(`Failed to save order: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- RENDERING GUARDS ---
  
  // Guard 1: Garbage URL (e.g., /orders/bldgslgs or /orders/new when disabled)
  if (!isValidMongoId) {
    return <NotFoundPage />;
  }

  // Guard 2: Order explicitly not found or backend error
  if (orderLoadStatus === 'failed' || orderError) {
    return <NotFoundPage />;
  }

  // Guard 3: Legitimate Loading State
  if (orderLoadStatus === 'loading' || !currentOrder) {
    return (
      <div className="h-full flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin text-brand-gold" size={32} />
          <p className="text-xs font-black uppercase tracking-widest">Loading Order Details...</p>
        </div>
      </div>
    );
  }

  const creationDate = currentOrder.createdAt 
    ? new Date(currentOrder.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown Date';

  return (
    <div className="h-full flex flex-col gap-5 animate-fade-in max-w-[1400px] mx-auto pb-10 px-4 box-border text-slate-900">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-white/30 p-3 rounded-2xl border border-white/50 backdrop-blur-xl transition-all duration-300 gap-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors duration-200 shrink-0">
          <ArrowLeft size={16} /> <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Back to Orders</span>
        </button>
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={handleSaveOrder}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[11px] font-black shadow-lg hover:bg-slate-800 transition-all duration-200 disabled:opacity-70"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Changes
          </button>
          <button 
            onClick={() => setFulfillOpen(true)}
            className="bg-brand-gold text-white px-4 py-1.5 rounded-xl text-[11px] font-black shadow-lg shadow-brand-gold/20 hover:scale-105 transition-all duration-200"
          >
            Fulfill Order
          </button>
        </div>
      </div>

      {/* Slide-over Drawer */}
      <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${fulfillOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setFulfillOpen(false)} />
        <div className={`relative w-full max-w-sm bg-white/95 backdrop-blur-2xl border-l border-white/50 p-5 shadow-2xl h-full overflow-y-auto transition-transform duration-300 ease-in-out ${fulfillOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h2 className="font-black uppercase tracking-wider text-xs text-slate-800">Fulfillment Details</h2>
              <div className="flex gap-1 bg-white/50 p-0.5 rounded-lg shrink-0 border border-slate-200">
                <button onClick={() => setCartonCount(prev => Math.max(1, prev - 1))} className="hover:bg-white p-1 rounded transition-colors"><Minus size={12}/></button>
                <button onClick={() => setCartonCount(prev => prev + 1)} className="hover:bg-white p-1 rounded transition-colors"><Plus size={12}/></button>
              </div>
            </div>
            <button onClick={() => setFulfillOpen(false)} className="text-slate-500 hover:text-slate-900"><X size={18}/></button>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {Array.from({ length: cartonCount }).map((_, index) => (
                <div key={index} className="grid grid-cols-4 gap-2 bg-white/40 p-2 rounded-xl border border-slate-200">
                   <div className="col-span-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block truncate">Wgt</label>
                      <input className="w-full bg-white p-1 rounded-md text-[11px] font-bold outline-none border border-slate-100 focus:border-brand-gold text-center" placeholder="lbs" />
                   </div>
                   <div className="col-span-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block truncate">D1</label>
                      <input className="w-full bg-white p-1 rounded-md text-[11px] font-bold outline-none border border-slate-100 focus:border-brand-gold text-center" placeholder="in" />
                   </div>
                   <div className="col-span-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block truncate">D2</label>
                      <input className="w-full bg-white p-1 rounded-md text-[11px] font-bold outline-none border border-slate-100 focus:border-brand-gold text-center" placeholder="in" />
                   </div>
                   <div className="col-span-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block truncate">D3</label>
                      <input className="w-full bg-white p-1 rounded-md text-[11px] font-bold outline-none border border-slate-100 focus:border-brand-gold text-center" placeholder="in" />
                   </div>
                </div>
              ))}
            </div>

            <input className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold outline-none focus:border-brand-gold" placeholder="Total Cartons" />
            
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input type="checkbox" className="accent-brand-gold w-3.5 h-3.5" /> Residential?
            </label>

            <button 
              onClick={() => {
                setOrderStatus('Shipped');
                setFulfillOpen(false);
              }}
              className="w-full bg-brand-gold text-white py-3 rounded-xl text-xs font-black shadow-md transition-all hover:bg-amber-500"
            >
              Simulate Fulfillment
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Main Content (2/3) */}
        <div className="lg:col-span-2 space-y-5 w-full min-w-0">
          
          <div className="flex flex-wrap items-center gap-3 bg-white/40 border border-white/60 p-4 rounded-2xl shadow-sm">
            <span className="text-sm font-black text-slate-800">Order: {currentOrder.orderReference || currentOrder._id}</span>
            <span className="px-2.5 py-1 text-[10px] uppercase font-black tracking-widest bg-slate-200 text-slate-600 rounded-md">
              {creationDate}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Status Selector */}
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-2xl flex flex-col justify-between min-h-[120px] transition-all duration-300 shadow-sm">
               <h3 className="text-[9px] font-black uppercase text-slate-400 mb-1.5">Order Status</h3>
               <select 
                 value={orderStatus} 
                 onChange={(e) => setOrderStatus(e.target.value)} 
                 className="w-full bg-white text-[11px] font-bold px-2.5 py-2 rounded-lg border border-slate-200 cursor-pointer outline-none focus:border-brand-gold transition-all"
                >
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Ready to Ship">Ready to Ship</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="On Hold">On Hold</option>
                </select>
            </div>

            {/* Logistics & Carriers */}
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-2xl flex flex-col justify-between min-h-[120px] transition-all duration-300 shadow-sm">
               <div className="flex justify-between items-center mb-1.5">
                <h3 className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1"><Truck size={12}/> Shipping Method</h3>
                <button onClick={() => setEditing({...editing, logistics: !editing.logistics})} className="text-slate-400 hover:text-brand-gold transition-colors duration-200 shrink-0">
                    {editing.logistics ? <Check size={14} className="text-emerald-600"/> : <Edit2 size={14}/>}
                </button>
               </div>
               
               {editing.logistics ? (
                   <div className="space-y-1.5 mt-2">
                       <input className="w-full bg-white p-1.5 rounded-lg text-xs border border-slate-200 focus:border-brand-gold outline-none" value={shipping.carrierType} onChange={(e) => setShipping({...shipping, carrierType: e.target.value})} placeholder="Carrier (e.g. FedEx)" />
                       <input className="w-full bg-white p-1.5 rounded-lg text-xs border border-slate-200 focus:border-brand-gold outline-none" value={shipping.serviceCode} onChange={(e) => setShipping({...shipping, serviceCode: e.target.value})} placeholder="Service Code" />
                       <input className="w-full bg-white p-1.5 rounded-lg text-xs border border-slate-200 focus:border-brand-gold outline-none" value={shipping.trackingNumber} onChange={(e) => setShipping({...shipping, trackingNumber: e.target.value})} placeholder="Tracking Number" />
                       <input type="number" className="w-full bg-white p-1.5 rounded-lg text-xs border border-slate-200 focus:border-brand-gold outline-none" value={shipping.shippingCost} onChange={(e) => setShipping({...shipping, shippingCost: e.target.value})} placeholder="Shipping Cost ($)" />
                   </div>
               ) : (
                   <div className="text-xs font-bold text-slate-900 min-w-0 flex flex-col justify-between h-full">
                       <div>
                         <p className="truncate text-slate-800">{shipping.carrierType || 'No Carrier'} {shipping.serviceCode && `- ${shipping.serviceCode}`}</p>
                         <p className="text-slate-500 font-medium mt-1">Cost: ${Number(shipping.shippingCost).toFixed(2)}</p>
                       </div>
                       
                       {/* Tracking Number Logic */}
                       {orderStatus === 'Shipped' && shipping.trackingNumber ? (
                          <div className="mt-2 pt-2 border-t border-slate-200">
                             <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Tracking Link</span>
                             <a 
                               href={`https://www.google.com/search?q=${shipping.trackingNumber}`}
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-[11px] font-mono bg-blue-50/50 hover:bg-blue-50 px-2 py-1 rounded transition-colors w-fit border border-blue-100"
                             >
                               {shipping.trackingNumber}
                               <ExternalLink size={10} />
                             </a>
                          </div>
                       ) : (
                          shipping.trackingNumber && orderStatus !== 'Shipped' && (
                             <p className="text-slate-400 text-[10px] break-all font-mono mt-2 pt-2 border-t border-slate-200">
                               Tracking: {shipping.trackingNumber}
                             </p>
                          )
                       )}
                   </div>
               )}
            </div>

            {/* Consolidated Total Weight Metrics Card */}
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-2xl flex flex-col justify-between min-h-[120px] transition-all duration-300 shadow-sm">
               <h3 className="text-[9px] font-black uppercase text-slate-400 mb-1.5 flex items-center gap-1">
                 <Weight size={12}/> Est. Weight
               </h3>
               <div className="text-xs font-bold text-slate-900 mt-auto">
                   <p className="text-xl font-black text-slate-800 tracking-tight truncate">{totalWeight.toFixed(2)} lbs</p>
                   <p className="text-slate-400 text-[9px] font-medium mt-0.5">Calculated from items</p>
                </div>
            </div>
          </div>

          {/* Editable Shipping Address */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-2xl transition-all duration-300 shadow-sm">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1.5"><MapPin size={12}/> Shipping Address</h3>
                <button onClick={() => setEditing({...editing, address: !editing.address})} className="text-slate-400 hover:text-brand-gold transition-colors duration-200 shrink-0">
                    {editing.address ? <Check size={14} className="text-emerald-600"/> : <Edit2 size={14}/>}
                </button>
            </div>
            {editing.address ? (
                <div className="grid grid-cols-2 gap-2 transition-all duration-300">
                    <input className="col-span-2 bg-white p-2 rounded-lg text-xs border border-slate-200 focus:border-brand-gold outline-none" value={address.name} onChange={(e) => setAddress({...address, name: e.target.value})} placeholder="Recipient Name" />
                    <input className="col-span-1 bg-white p-2 rounded-lg text-xs border border-slate-200 focus:border-brand-gold outline-none" value={address.email} onChange={(e) => setAddress({...address, email: e.target.value})} placeholder="Email Address" type="email" />
                    <input className="col-span-1 bg-white p-2 rounded-lg text-xs border border-slate-200 focus:border-brand-gold outline-none" value={address.phone} onChange={(e) => setAddress({...address, phone: e.target.value})} placeholder="Phone Number" />
                    <input className="col-span-2 bg-white p-2 rounded-lg text-xs border border-slate-200 focus:border-brand-gold outline-none" value={address.street} onChange={(e) => setAddress({...address, street: e.target.value})} placeholder="Address Line 1" />
                    <input className="col-span-2 bg-white p-2 rounded-lg text-xs border border-slate-200 focus:border-brand-gold outline-none" value={address.line2} onChange={(e) => setAddress({...address, line2: e.target.value})} placeholder="Address Line 2 (Optional)" />
                    <input className="bg-white p-2 rounded-lg text-xs border border-slate-200 focus:border-brand-gold outline-none" value={address.city} onChange={(e) => setAddress({...address, city: e.target.value})} placeholder="City" />
                    <div className="flex gap-2">
                        <input className="w-full bg-white p-2 rounded-lg text-xs border border-slate-200 focus:border-brand-gold outline-none min-w-0" value={address.state} onChange={(e) => setAddress({...address, state: e.target.value})} placeholder="ST" />
                        <input className="w-full bg-white p-2 rounded-lg text-xs border border-slate-200 focus:border-brand-gold outline-none min-w-0" value={address.zip} onChange={(e) => setAddress({...address, zip: e.target.value})} placeholder="Zip" />
                    </div>
                </div>
            ) : (
                <div className="text-sm font-bold text-slate-900 space-y-0.5 break-words">
                    <p>{address.name || 'No recipient set'}</p>
                    
                    {(address.email || address.phone) && (
                      <div className="py-1">
                        {address.email && <p className="text-slate-500 font-medium text-[11px] flex items-center gap-1.5"><Mail size={11}/> {address.email}</p>}
                        {address.phone && <p className="text-slate-500 font-medium text-[11px] flex items-center gap-1.5 mt-0.5"><Phone size={11}/> {address.phone}</p>}
                      </div>
                    )}

                    <p className="text-slate-500 font-medium text-xs mt-1">{address.street || 'No street address'}</p>
                    {address.line2 && <p className="text-slate-500 font-medium text-xs">{address.line2}</p>}
                    <p className="text-slate-500 font-medium text-xs">
                      {address.city ? `${address.city}, ` : ''}{address.state} {address.zip}
                    </p>
                </div>
            )}
          </div>

          {/* Manifest Section */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-2xl transition-all duration-300 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">Manifest Items</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full table-fixed min-w-[600px]">
                <thead className="text-left text-[9px] uppercase font-black text-slate-400 border-b border-white/40">
                  <tr>
                    <th className="pb-3 w-[32%]">Item</th>
                    <th className="pb-3 w-[16%]">SKU</th>
                    <th className="pb-3 w-[8%] text-center">Qty</th>
                    <th className="pb-3 w-[13%] text-right">Unit Wt</th>
                    <th className="pb-3 w-[13%] text-right">Price</th>
                    <th className="pb-3 w-[5%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40 text-xs">
                  {items.map((item) => (
                    <tr key={item.id} className="transition-colors duration-200 hover:bg-white/50">
                      <td className="py-3 font-bold text-slate-900 break-words pr-2">{item.name}</td>
                      <td className="py-3 font-mono text-[10px] text-slate-500 break-all pr-2">{item.sku}</td>
                      <td className="py-3 font-bold text-center bg-slate-50/50 rounded-lg">{item.qty}</td>
                      <td className="py-3 font-medium text-slate-500 text-right">{Number(item.weight).toFixed(2)} lbs</td>
                      <td className="py-3 font-black text-slate-700 text-right">${Number(item.price).toFixed(2)}</td>
                      <td className="py-3 text-right">
                         <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600 transition-colors duration-200 p-1">
                           <Trash2 size={14}/>
                         </button>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Add Row Component */}
                  <tr className="border-t border-white/60 bg-white/20">
                    <td className="pt-3 pb-2 pr-2">
                      <select 
                        className="w-full bg-white p-2 rounded-lg text-xs font-bold border border-slate-200 outline-none focus:border-brand-gold text-slate-700 cursor-pointer transition-all"
                        value={availableInventories.find(i => i.name === newItem.name)?.id || ''}
                        onChange={handleInventoryChange}
                        disabled={inventoryStatus === 'loading'}
                      >
                        <option
                        className="text-slate-400"
                        value="">{inventoryStatus === 'loading' ? 'Loading Catalog...' : 'Select Item to Add...'}</option>
                        {availableInventories.map(inv => (
                          <option key={inv.id} value={inv.id}>{inv.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="pt-3 pb-2 pr-2">
                      <input className="w-full bg-slate-100 p-2 rounded-lg text-xs font-mono text-slate-500 border border-slate-200 outline-none" placeholder="SKU" value={newItem.sku} readOnly disabled />
                    </td>
                    <td className="pt-3 pb-2 pr-2">
                      <input type="number" min="1" className="w-full bg-white p-2 rounded-lg text-xs font-bold border border-slate-200 text-center outline-none focus:border-brand-gold" value={newItem.qty} onChange={(e) => setNewItem({...newItem, qty: e.target.value})} />
                    </td>
                    <td className="pt-3 pb-2 pr-2 text-right">
                      <span className="text-slate-400 font-medium">{newItem.weight ? `${Number(newItem.weight).toFixed(2)} lbs` : '-'}</span>
                    </td>
                    <td className="pt-3 pb-2 pr-2">
                      <input type="number" step="0.01" min="0" className="w-full bg-white p-2 rounded-lg text-xs font-bold border border-slate-200 text-right outline-none focus:border-brand-gold" placeholder="0.00" value={newItem.price || ''} onChange={(e) => setNewItem({...newItem, price: e.target.value})} />
                    </td>
                    <td className="pt-3 pb-2 text-right">
                      <button onClick={handleAddItem} className="bg-slate-900 text-white p-2 rounded-lg hover:bg-slate-800 transition-all shadow-sm"><Plus size={14}/></button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 w-full min-w-0">
          
          {/* Enhanced Customer Card */}
          <div className="bg-slate-950 text-white p-5 rounded-2xl shadow-xl border border-slate-900">
             <div className="flex justify-between items-start gap-4 mb-4 pb-3 border-b border-white/10">
                <div className="min-w-0">
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Billed To</h3>
                    <p className="font-black text-lg tracking-tight text-white truncate" title={currentOrder.customer?.customerName}>
                      {currentOrder.customer?.customerName || 'Unknown Customer'}
                    </p>
                </div>
                <div className="w-10 h-10 bg-brand-gold text-slate-950 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-gold/20">
                  <User size={20} strokeWidth={2.5}/>
                </div>
             </div>
             <div className="space-y-2 text-xs font-medium">
                {currentOrder.customer?.contactEmail && (
                  <div className="flex items-center gap-2.5 min-w-0 bg-white/5 p-2.5 rounded-xl border border-white/5">
                    <Mail size={14} className="text-slate-400 shrink-0"/> 
                    <span className="break-all select-all text-slate-200">{currentOrder.customer.contactEmail}</span>
                  </div>
                )}
                {currentOrder.customer?.contactNumber && (
                  <div className="flex items-center gap-2.5 min-w-0 bg-white/5 p-2.5 rounded-xl border border-white/5">
                    <Phone size={14} className="text-slate-400 shrink-0"/> 
                    <span className="truncate text-slate-200">{currentOrder.customer.contactNumber}</span>
                  </div>
                )}
             </div>
          </div>

          {/* Notes Section */}
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl transition-all duration-300">
             <h3 className="text-[9px] font-black uppercase text-amber-800 mb-3 flex items-center gap-1.5"><MessageSquare size={12}/> Order Notes</h3>
             <textarea 
               value={notes} 
               onChange={(e) => setNotes(e.target.value)}
               className="w-full bg-white border border-amber-200 rounded-xl p-3 text-xs font-medium text-slate-700 focus:border-amber-400 outline-none resize-none min-h-[120px]"
               placeholder="Add internal notes or customer requests here..."
             />
          </div>

          {/* Payment Summary */}
          <div className="bg-white/60 backdrop-blur-md p-5 rounded-2xl border border-white/60 shadow-sm">
             <h3 className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1.5 mb-3"><CreditCard size={12}/> Order Summary</h3>
             <div className="text-sm font-bold space-y-2">
               <div className="flex justify-between text-slate-500"><span>Subtotal</span> <span className="font-mono">${subtotal.toFixed(2)}</span></div>
               <div className="flex justify-between text-slate-500"><span>Shipping</span> <span className="font-mono">${shippingCost.toFixed(2)}</span></div>
               <div className="flex justify-between text-slate-500"><span>Estimated Tax</span> <span className="font-mono">${tax.toFixed(2)}</span></div>
               <div className="flex justify-between border-t pt-3 mt-2 border-slate-200 text-slate-900">
                 <span>Total</span> 
                 <span className="font-mono text-lg font-black text-blue-600">${grandTotal.toFixed(2)}</span>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}