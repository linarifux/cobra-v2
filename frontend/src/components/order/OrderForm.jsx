import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ArrowLeft, MapPin, CreditCard, 
  Trash2, Plus, MessageSquare, 
  PackageCheck, Save, Loader2, Box, Building2, User, Briefcase, Truck
} from 'lucide-react';
import { toast } from 'sonner';

import NotFoundPage from '../../pages/NotFoundPage';

// Redux Actions
import { fetchOrderById, updateOrder, createOrder, clearCurrentOrder } from '../../store/slices/orderSlice';
import { fetchCustomers } from '../../store/slices/customerSlice';
import { fetchDivisions } from '../../store/slices/divisionSlice';
import { fetchInventory } from '../../store/slices/inventorySlice';
import { fetchUsers } from '../../store/slices/userSlice';
import { fetchCarriers } from '../../store/slices/carrierSlice';

// --- Utilities ---
const generateLocalId = () => `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateAutoOrderNumber = () => `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

export default function OrderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Mode Detection
  const isEditMode = Boolean(id);
  const isValidMongoId = isEditMode ? /^[0-9a-fA-F]{24}$/.test(id) : true;

  // --- REDUX STATE ---
  const { currentOrder, status: orderLoadStatus, error: orderError } = useSelector((state) => state.orders || {});
  const { items: inventoryData = [], status: inventoryStatus } = useSelector((state) => state.inventory || {});
  const { items: usersData = [], status: usersStatus } = useSelector((state) => state.users || {}); 
  const { items: customersData = [], status: customersStatus } = useSelector((state) => state.customers || {}); 
  const { items: divisionsData = [], status: divisionsStatus } = useSelector((state) => state.divisions || {}); 
  const { items: carriersData = [], status: carrierStatus } = useSelector((state) => state.carriers || {}); 
  
  // --- Form State ---
  // Core Identifiers
  const [orderNumber, setOrderNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [userId, setUserId] = useState(''); 

  const [orderStatus, setOrderStatus] = useState('New');
  const [shipping, setShipping] = useState({ carrierId: '', carrierType: '', serviceCode: '', trackingNumber: '', shippingCost: 0 });
  const [address, setAddress] = useState({ name: '', email: '', phone: '', street: '', line2: '', city: '', state: '', zip: '', country: 'US' });
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  
  const [newItem, setNewItem] = useState({ name: '', sku: '', qty: 1, price: 0, weight: 0 });
  const [isSaving, setIsSaving] = useState(false);

  // --- Calculations ---
  const subtotal = items.reduce((acc, item) => acc + (Number(item.price) * Number(item.qty)), 0);
  const shippingCost = Number(shipping.shippingCost) || 0;
  const tax = subtotal * 0.08; 
  const grandTotal = subtotal + shippingCost + tax;

  // --- Initialize Global Data ---
  useEffect(() => {
    if (isEditMode && isValidMongoId) {
        dispatch(fetchOrderById(id));
    }
    if (inventoryStatus === 'idle') dispatch(fetchInventory());
    if (usersStatus === 'idle') dispatch(fetchUsers()); 
    if (customersStatus === 'idle') dispatch(fetchCustomers()); 
    if (divisionsStatus === 'idle') dispatch(fetchDivisions()); 
    
    return () => {
        if (isEditMode) dispatch(clearCurrentOrder());
    };
  }, [id, isEditMode, isValidMongoId, inventoryStatus, usersStatus, customersStatus, divisionsStatus, dispatch]);

  // --- Fetch Division Carriers ---
  useEffect(() => {
    if (divisionId) {
      dispatch(fetchCarriers(divisionId));
    }
  }, [divisionId, dispatch]);

  const availableInventories = useMemo(() => {
    return inventoryData.map(inv => ({
      id: inv._id,
      name: inv.itemName || 'Unnamed Item',
      sku: inv.sku,
      price: inv.unitCost || inv.price || 0,
      weight: inv.weight || 0
    }));
  }, [inventoryData]);

  // Dynamically flatten carriers into selectable options
  const shippingOptions = useMemo(() => {
    if (!Array.isArray(carriersData)) return [];
    
    const options = [];
    carriersData.forEach(carrier => {
      if (carrier.isActive !== false && carrier.enabledServices) {
        carrier.enabledServices.forEach(service => {
          if (service.isActive !== false) {
            options.push({
              carrierId: carrier._id,
              carrierType: carrier.carrierType,
              serviceCode: service.serviceCode,
              label: `${carrier.carrierType} - ${service.serviceName || service.serviceCode}`
            });
          }
        });
      }
    });
    return options;
  }, [carriersData]);

  const contextualDivisions = useMemo(() => {
    if (!customerId) return divisionsData;
    return divisionsData.filter(d => {
      const dCustId = String(d.customer?._id || d.customer || '');
      return dCustId === String(customerId);
    });
  }, [divisionsData, customerId]);

  const contextualUsers = useMemo(() => {
    if (!usersData?.length) return [];
    if (!divisionId && !customerId) return [];
    
    const filtered = usersData.filter(u => {
      let isMatch = true;
      if (customerId) {
        const uCustId = String(u.customer?._id || u.customer || '');
        isMatch = isMatch && (uCustId === String(customerId));
      }
      if (divisionId) {
        if (Array.isArray(u.divisions) && u.divisions.length > 0) {
          const userHasDivision = u.divisions.some(d => String(d._id || d) === String(divisionId));
          isMatch = isMatch && userHasDivision;
        } else {
          isMatch = false;
        }
      }
      return isMatch;
    });

    if (filtered.length === 0) {
      return usersData.filter(u => u.portal !== 'admin' && u.role !== 'admin');
    }
    return filtered;
  }, [usersData, divisionId, customerId]);

  // --- Populate Form for Editing ---
  useEffect(() => {
    if (isEditMode && currentOrder) {
      setOrderNumber(currentOrder.orderNumber || '');
      setCustomerId(currentOrder.customer?._id || currentOrder.customer || '');
      setDivisionId(currentOrder.division?._id || currentOrder.division || '');
      setUserId(currentOrder.user?._id || currentOrder.user || ''); 
      
      setOrderStatus(currentOrder.status || 'New');
      setShipping({ 
        carrierId: currentOrder.shippingDetails?.carrierId?._id || currentOrder.shippingDetails?.carrierId || '',
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
  }, [currentOrder, availableInventories, isEditMode]);

  // --- Handlers ---
  const handleCustomerChange = (e) => {
    setCustomerId(e.target.value);
    setDivisionId(''); 
    setUserId('');     
    setShipping({...shipping, carrierId: '', carrierType: '', serviceCode: ''}); 
  };

  const handleDivisionChange = (e) => {
    setDivisionId(e.target.value);
    setUserId('');     
    setShipping({...shipping, carrierId: '', carrierType: '', serviceCode: ''}); 
  };

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
    if (!customerId || !divisionId) {
        return toast.warning("Customer and Division are required.");
    }
    if (!address.name || !address.street || !address.city || !address.state || !address.zip) {
      return toast.warning("Please fill out all required shipping address fields.");
    }
    if (items.length === 0) {
      return toast.warning("Order must contain at least one item.");
    }

    setIsSaving(true);

    const payload = {
      orderNumber: orderNumber.trim() || generateAutoOrderNumber(),
      customer: customerId,
      division: divisionId,
      user: userId || null, // Will send null if empty string, ensuring it is unassigned
      status: orderStatus,
      notes: notes,
      shippingAddress: {
        recipientName: address.name, email: address.email, phone: address.phone,
        line1: address.street, line2: address.line2, city: address.city,
        state: address.state, zip: address.zip, country: address.country
      },
      shippingDetails: {
        ...(isEditMode ? currentOrder.shippingDetails : {}),
        carrierId: shipping.carrierId || null,
        carrierType: shipping.carrierType, 
        serviceCode: shipping.serviceCode,
        trackingNumber: shipping.trackingNumber, 
        shippingCost: Number(shipping.shippingCost)
      },
      items: items.map(item => ({
        sku: item.sku, name: item.name, quantity: Number(item.qty),
        unitPrice: Number(item.price), totalPrice: Number(item.qty) * Number(item.price)
      }))
    };

    try {
      if (isEditMode) {
        await dispatch(updateOrder({ id: currentOrder._id, updateData: payload })).unwrap();
        toast.success('Order updated successfully.');
        navigate(`/orders/${currentOrder._id}`);
      } else {
        const newOrder = await dispatch(createOrder(payload)).unwrap();
        toast.success('Order created successfully.');
        navigate(`/orders/${newOrder._id}`);
      }
    } catch (error) {
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} order: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const isLegacyShippingService = shipping.serviceCode && !shippingOptions.some(opt => opt.serviceCode === shipping.serviceCode);

  if (isEditMode && !isValidMongoId) return <NotFoundPage />;
  if (isEditMode && (orderLoadStatus === 'failed' || orderError)) return <NotFoundPage />;
  if (isEditMode && (orderLoadStatus === 'loading' || !currentOrder)) {
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
                <h1 className="text-lg font-black tracking-tight text-slate-900">
                    {isEditMode ? 'Edit Order' : 'Create New Order'}
                </h1>
                {isEditMode && <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{currentOrder?.orderNumber}</p>}
            </div>
        </div>
        
        <button 
          onClick={handleSaveOrder}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-gold text-white rounded-xl text-xs font-black shadow-lg shadow-brand-gold/20 hover:scale-105 transition-all duration-200 disabled:opacity-70 disabled:hover:scale-100"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
          {isEditMode ? 'Save Changes' : 'Create Order'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Details & Addresses */}
        <div className="space-y-6">
          
          {/* Core Configuration Form */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2 border-b border-white/60 pb-3">
                <Box size={14}/> Core Configuration
            </h3>
            
            <div className="space-y-4">
                {/* Routing & Identity Fields */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1.5">
                          Order Number <span className="normal-case tracking-normal font-medium text-slate-400 ml-1">(Auto-generates if left blank)</span>
                        </label>
                        <input 
                            className="w-full bg-white p-3 rounded-xl text-xs font-bold border border-slate-200 focus:border-brand-gold outline-none shadow-sm transition-all" 
                            value={orderNumber} 
                            onChange={(e) => setOrderNumber(e.target.value)} 
                            placeholder="e.g. ORD-998822"
                            disabled={isEditMode}
                        />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1.5"><Briefcase size={12}/> 3PL Customer (Brand) *</label>
                        <select 
                            className={`w-full p-3 rounded-xl text-xs font-bold border border-slate-200 focus:border-brand-gold outline-none shadow-sm transition-all cursor-pointer ${isEditMode ? 'bg-slate-50 text-slate-500' : 'bg-white'}`}
                            value={customerId} 
                            onChange={handleCustomerChange}
                            disabled={isEditMode}
                        >
                            <option value="" disabled>Select Brand...</option>
                            {customersData.map(c => (
                                <option key={c._id} value={c._id}>{c.customerName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1.5"><Building2 size={12}/> Division *</label>
                        <select 
                            className={`w-full p-3 rounded-xl text-xs font-bold border border-slate-200 focus:border-brand-gold outline-none shadow-sm transition-all cursor-pointer ${!customerId ? 'bg-slate-50 text-slate-400' : 'bg-white'}`}
                            value={divisionId} 
                            onChange={handleDivisionChange}
                            disabled={!customerId}
                        >
                            <option value="" disabled>Select Division...</option>
                            {contextualDivisions.map(d => (
                                <option key={d._id} value={d._id}>{d.divisionName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1.5">
                            <User size={12} /> Shopper (End-User)
                        </label>
                        <select 
                            className={`w-full p-3 rounded-xl text-xs font-bold border border-slate-200 focus:border-brand-gold outline-none shadow-sm transition-all cursor-pointer ${!customerId && !divisionId ? 'bg-slate-50 text-slate-400' : 'bg-white'}`}
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            disabled={!customerId && !divisionId}
                        >
                            <option value="">Guest Checkout / Unassigned</option>
                            {contextualUsers.map(u => (
                                <option key={u._id} value={u._id}>
                                    {u.name || u.firstName || u.email || 'Unnamed Shopper'} ({u.email || 'No Email'})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <hr className="border-slate-100 my-2" />

                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Order Status</label>
                    <select 
                        value={orderStatus} 
                        onChange={(e) => setOrderStatus(e.target.value)} 
                        className="w-full bg-white text-xs font-bold px-4 py-3 rounded-xl border border-slate-200 cursor-pointer outline-none focus:border-brand-gold transition-all shadow-sm"
                    >
                        <option value="New">New</option>
                        <option value="Pending">Pending</option>
                        <option value="Picked">Picked</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Hold">Hold</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Billed">Billed</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 flex justify-between">
                            <span className="flex items-center gap-1.5"><Truck size={12}/> Shipping Service</span>
                            {carrierStatus === 'loading' && <Loader2 size={12} className="animate-spin text-brand-gold" />}
                        </label>
                        <select 
                            className="w-full bg-white p-3 rounded-xl text-xs font-bold border border-slate-200 focus:border-brand-gold outline-none shadow-sm transition-all cursor-pointer" 
                            value={shipping.serviceCode ? `${shipping.carrierId}|${shipping.carrierType}|${shipping.serviceCode}` : ''} 
                            onChange={(e) => {
                                const [cId, cType, sCode] = e.target.value.split('|');
                                setShipping({...shipping, carrierId: cId || '', carrierType: cType || '', serviceCode: sCode || ''});
                            }}
                            disabled={!divisionId || carrierStatus === 'loading'}
                        >
                            <option value="" disabled>
                                {!divisionId ? 'Select a division first...' : 'Select carrier service...'}
                            </option>
                            
                            {isLegacyShippingService && (
                                <option value={`${shipping.carrierId}|${shipping.carrierType}|${shipping.serviceCode}`}>
                                    {shipping.carrierType} - {shipping.serviceCode} (Legacy)
                                </option>
                            )}

                            {shippingOptions.map(opt => (
                                <option key={`${opt.carrierId}|${opt.serviceCode}`} value={`${opt.carrierId}|${opt.carrierType}|${opt.serviceCode}`}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="col-span-2">
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
                {items.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-xl">
                        No items added to this order yet.
                    </div>
                )}
                
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