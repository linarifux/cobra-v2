import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Truck, MapPin, User, CreditCard, 
  Download, Trash2, Edit2, Check, Plus, Minus,
  MessageSquare, Mail, Phone, X, Calendar, Weight
} from 'lucide-react';

// Mock data source for available inventory stock items
const AVAILABLE_INVENTORIES = [
  { id: 'inv-1', name: 'Premium Leather Component', sku: 'PL-001', price: 47.50, weight: 2.50 },
  { id: 'inv-2', name: 'Chakku Carbon Steel Blade', sku: 'CH-202', price: 85.00, weight: 1.15 },
  { id: 'inv-3', name: 'Ergonomic Walnut Handle', sku: 'HD-044', price: 18.00, weight: 0.40 },
  { id: 'inv-4', name: 'Heavy Duty Brass Rivets (Pack)', sku: 'RV-009', price: 6.25, weight: 0.15 }
];

export default function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [orderStatus, setOrderStatus] = useState('Awaiting Shipment');

  // State
  const [shipping, setShipping] = useState({ carrier: 'UPS Ground', tracking: '1Z99928374', eta: '2026-05-24' });
  const [dates, setDates] = useState({ order: '2026-05-18', pick: '2026-05-19', ship: '2026-05-20' });
  const [address, setAddress] = useState({ name: 'Sarah Jenkins', street: '421 Maple Avenue', city: 'Brooklyn', state: 'NY', zip: '11201' });
  const [items, setItems] = useState([{ id: 1, name: 'Premium Leather Component', sku: 'PL-001', qty: 1, price: 47.50, weight: 2.50 }]);
  const [notes, setNotes] = useState([{ id: 1, text: 'Customer requested discreet packaging.' }]);
  
  // Drawer and New Item State
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [cartonCount, setCartonCount] = useState(1);
  const [newItem, setNewItem] = useState({ name: '', sku: '', qty: 1, price: 0, weight: 0 });
  const [editing, setEditing] = useState({ logistics: false, address: false, dates: false });
  const [newNote, setNewNote] = useState('');

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;
  
  // Weight Calculation
  const totalWeight = items.reduce((acc, item) => acc + (item.weight * item.qty), 0);

  const handleInventoryChange = (e) => {
    const selectedId = e.target.value;
    const matchedStock = AVAILABLE_INVENTORIES.find(inv => inv.id === selectedId);
    
    if (matchedStock) {
      setNewItem({
        ...newItem,
        name: matchedStock.name,
        sku: matchedStock.sku,
        price: matchedStock.price,
        weight: matchedStock.weight
      });
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
        id: Date.now(), 
        qty: Number(newItem.qty), 
        price: Number(newItem.price),
        weight: Number(newItem.weight || 0)
      }
    ]);
    setNewItem({ name: '', sku: '', qty: 1, price: 0, weight: 0 });
  };

  return (
    <div className="h-full flex flex-col gap-5 animate-fade-in max-w-[1400px] mx-auto pb-10 px-4 box-border text-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between bg-white/30 p-3 rounded-2xl border border-white/50 backdrop-blur-xl transition-all duration-300 gap-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors duration-200 shrink-0">
          <ArrowLeft size={16} /> <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Back to Orders</span>
        </button>
        <div className="flex gap-2 shrink-0">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 rounded-xl text-[11px] font-bold border border-white/50 hover:bg-white transition-all duration-200">
            <Download size={13} /> Packing Slip
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
        <div className={`relative w-full max-w-sm bg-white/90 backdrop-blur-2xl border-l border-white/50 p-5 shadow-2xl h-full overflow-y-auto transition-transform duration-300 ease-in-out ${fulfillOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h2 className="font-black uppercase tracking-wider text-xs text-slate-800">Fulfillment Details</h2>
              <div className="flex gap-1 bg-white/50 p-0.5 rounded-lg shrink-0">
                <button onClick={() => setCartonCount(prev => Math.max(1, prev - 1))} className="hover:bg-white p-1 rounded transition-colors duration-200"><Minus size={12}/></button>
                <button onClick={() => setCartonCount(prev => prev + 1)} className="hover:bg-white p-1 rounded transition-colors duration-200"><Plus size={12}/></button>
              </div>
            </div>
            <button onClick={() => setFulfillOpen(false)} className="text-slate-500 hover:text-slate-900 transition-colors duration-200"><X size={18}/></button>
          </div>
          
          <div className="space-y-4">
            {/* Dimensions */}
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {Array.from({ length: cartonCount }).map((_, index) => (
                <div key={index} className="grid grid-cols-4 gap-2 bg-white/40 p-2 rounded-xl border border-white/60">
                   <div className="col-span-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block truncate">Wgt</label>
                      <input className="w-full bg-white p-1 rounded-md text-[11px] font-bold outline-none border border-slate-100 focus:border-slate-300 text-center" placeholder="lbs" />
                   </div>
                   <div className="col-span-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block truncate">D1</label>
                      <input className="w-full bg-white p-1 rounded-md text-[11px] font-bold outline-none border border-slate-100 focus:border-slate-300 text-center" placeholder="in" />
                   </div>
                   <div className="col-span-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block truncate">D2</label>
                      <input className="w-full bg-white p-1 rounded-md text-[11px] font-bold outline-none border border-slate-100 focus:border-slate-300 text-center" placeholder="in" />
                   </div>
                   <div className="col-span-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 block truncate">D3</label>
                      <input className="w-full bg-white p-1 rounded-md text-[11px] font-bold outline-none border border-slate-100 focus:border-slate-300 text-center" placeholder="in" />
                   </div>
                </div>
              ))}
            </div>

            <input className="w-full bg-white/70 p-2.5 rounded-xl text-xs font-bold border border-transparent focus:border-slate-200 outline-none transition-all duration-200" placeholder="Total Cartons" />
            <input className="w-full bg-white/70 p-2.5 rounded-xl text-xs font-bold border border-transparent focus:border-slate-200 outline-none transition-all duration-200" placeholder="Shipping Cost" />
            
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input type="checkbox" className="accent-brand-gold w-3.5 h-3.5" /> Residential?
            </label>

            <select className="w-full bg-white/70 p-2.5 rounded-xl text-xs font-bold border border-transparent focus:border-slate-200 outline-none text-slate-700 transition-all duration-200">
              <option>FedEx Small Box</option>
              <option>UPS Envelope</option>
              <option>Custom Box</option>
            </select>

            <button className="w-full bg-brand-gold text-white py-3 rounded-xl text-xs font-black hover:scale-[1.01] transition-all duration-200 mt-2 shadow-md">
              Ship Now
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Main Content (2/3) */}
        <div className="lg:col-span-2 space-y-5 w-full min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Status Selector */}
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-2xl flex flex-col justify-between min-h-[120px] transition-all duration-300">
               <h3 className="text-[9px] font-black uppercase text-slate-400 mb-1.5">Order Status</h3>
               <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} className="w-full bg-white/60 text-[11px] font-bold px-2.5 py-2 rounded-lg border border-slate-200 cursor-pointer outline-none transition-all duration-200">
                    <option>Awaiting Shipment</option>
                    <option>Packed</option>
                    <option>Shipped</option>
                    <option>Delivered</option>
                </select>
            </div>

            {/* Editable Timeline Dates */}
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-2xl flex flex-col justify-between min-h-[120px] transition-all duration-300">
               <div className="flex justify-between items-center mb-1.5">
                <h3 className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1"><Calendar size={12}/> Timeline</h3>
                <button onClick={() => setEditing({...editing, dates: !editing.dates})} className="text-slate-400 hover:text-slate-900 transition-colors duration-200 shrink-0">
                    {editing.dates ? <Check size={14} className="text-emerald-600"/> : <Edit2 size={14}/>}
                </button>
               </div>
               {editing.dates ? (
                   <div className="space-y-1">
                       <div className="flex items-center gap-1">
                         <span className="text-[8px] uppercase font-bold text-slate-400 w-6 shrink-0">Ord</span>
                         <input type="date" className="w-full bg-white/60 p-0.5 rounded text-[10px] font-semibold border border-transparent focus:border-slate-200 outline-none" value={dates.order} onChange={(e) => setDates({...dates, order: e.target.value})} />
                       </div>
                       <div className="flex items-center gap-1">
                         <span className="text-[8px] uppercase font-bold text-slate-400 w-6 shrink-0">Pck</span>
                         <input type="date" className="w-full bg-white/60 p-0.5 rounded text-[10px] font-semibold border border-transparent focus:border-slate-200 outline-none" value={dates.pick} onChange={(e) => setDates({...dates, pick: e.target.value})} />
                       </div>
                       <div className="flex items-center gap-1">
                         <span className="text-[8px] uppercase font-bold text-slate-400 w-6 shrink-0">Shp</span>
                         <input type="date" className="w-full bg-white/60 p-0.5 rounded text-[10px] font-semibold border border-transparent focus:border-slate-200 outline-none" value={dates.ship} onChange={(e) => setDates({...dates, ship: e.target.value})} />
                       </div>
                   </div>
               ) : (
                   <div className="text-[11px] font-bold text-slate-900 space-y-1">
                       <div className="flex justify-between border-b border-slate-100/60 pb-0.5">
                         <span className="text-slate-400 font-medium">Ordered:</span> 
                         <span className="break-all pl-1">{dates.order || '—'}</span>
                       </div>
                       <div className="flex justify-between border-b border-slate-100/60 pb-0.5">
                         <span className="text-slate-400 font-medium">Picked:</span> 
                         <span className="break-all pl-1">{dates.pick || '—'}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-slate-400 font-medium">Shipped:</span> 
                         <span className={`break-all pl-1 ${dates.ship ? "text-brand-gold" : ""}`}>{dates.ship || '—'}</span>
                       </div>
                   </div>
               )}
            </div>

            {/* Logistics & Carriers */}
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-2xl flex flex-col justify-between min-h-[120px] transition-all duration-300">
               <div className="flex justify-between items-center mb-1.5">
                <h3 className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1"><Truck size={12}/> Shipping</h3>
                <button onClick={() => setEditing({...editing, logistics: !editing.logistics})} className="text-slate-400 hover:text-slate-900 transition-colors duration-200 shrink-0">
                    {editing.logistics ? <Check size={14} className="text-emerald-600"/> : <Edit2 size={14}/>}
                </button>
               </div>
               {editing.logistics ? (
                   <div className="space-y-1">
                       <input className="w-full bg-white/60 p-1 rounded text-xs border border-transparent focus:border-slate-200 outline-none" value={shipping.carrier} onChange={(e) => setShipping({...shipping, carrier: e.target.value})} />
                       <input className="w-full bg-white/60 p-1 rounded text-xs border border-transparent focus:border-slate-200 outline-none" value={shipping.tracking} onChange={(e) => setShipping({...shipping, tracking: e.target.value})} />
                   </div>
               ) : (
                   <div className="text-xs font-bold text-slate-900 min-w-0">
                       <p className="truncate">{shipping.carrier}</p>
                       <p className="text-slate-500 text-[11px] break-all select-all font-mono mt-0.5" title={shipping.tracking}>{shipping.tracking}</p>
                       <p className="text-emerald-600 mt-0.5 text-[11px] truncate">ETA: {shipping.eta}</p>
                   </div>
               )}
            </div>

            {/* Consolidated Total Weight Metrics Card */}
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-2xl flex flex-col justify-between min-h-[120px] transition-all duration-300">
               <h3 className="text-[9px] font-black uppercase text-slate-400 mb-1.5 flex items-center gap-1">
                 <Weight size={12}/> Total Weight
               </h3>
               <div className="text-xs font-bold text-slate-900">
                   <p className="text-lg font-black text-slate-800 tracking-tight truncate">{totalWeight.toFixed(2)} lbs</p>
                   <p className="text-slate-400 text-[9px] font-medium mt-0.5">Aggregated cargo</p>
                </div>
            </div>
          </div>

          {/* Editable Shipping Address */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-2xl transition-all duration-300">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1.5"><MapPin size={12}/> Shipping Address</h3>
                <button onClick={() => setEditing({...editing, address: !editing.address})} className="text-slate-400 hover:text-slate-900 transition-colors duration-200 shrink-0">
                    {editing.address ? <Check size={14} className="text-emerald-600"/> : <Edit2 size={14}/>}
                </button>
            </div>
            {editing.address ? (
                <div className="grid grid-cols-2 gap-2 transition-all duration-300">
                    <input className="col-span-2 bg-white/60 p-1.5 rounded-lg text-xs border border-transparent focus:border-slate-200 outline-none" value={address.name} onChange={(e) => setAddress({...address, name: e.target.value})} placeholder="Name" />
                    <input className="col-span-2 bg-white/60 p-1.5 rounded-lg text-xs border border-transparent focus:border-slate-200 outline-none" value={address.street} onChange={(e) => setAddress({...address, street: e.target.value})} placeholder="Street" />
                    <input className="bg-white/60 p-1.5 rounded-lg text-xs border border-transparent focus:border-slate-200 outline-none" value={address.city} onChange={(e) => setAddress({...address, city: e.target.value})} placeholder="City" />
                    <div className="flex gap-2">
                        <input className="w-full bg-white/60 p-1.5 rounded-lg text-xs border border-transparent focus:border-slate-200 outline-none min-w-0" value={address.state} onChange={(e) => setAddress({...address, state: e.target.value})} placeholder="ST" />
                        <input className="w-full bg-white/60 p-1.5 rounded-lg text-xs border border-transparent focus:border-slate-200 outline-none min-w-0" value={address.zip} onChange={(e) => setAddress({...address, zip: e.target.value})} placeholder="Zip" />
                    </div>
                </div>
            ) : (
                <div className="text-xs font-bold text-slate-900 space-y-0.5 break-words">
                    <p>{address.name}</p>
                    <p className="text-slate-500 font-medium">{address.street}</p>
                    <p className="text-slate-500 font-medium">{address.city}, {address.state} {address.zip}</p>
                </div>
            )}
          </div>

          {/* Manifest Section without scrollbars */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-2xl transition-all duration-300">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">Manifest Items</h3>
            
            {/* Mobile Adaptive Layout - Block Stack layout (Hidden on desktop) */}
            <div className="space-y-3 md:hidden">
              {items.map((item) => (
                <div key={item.id} className="bg-white/50 p-3 rounded-xl border border-white/40 space-y-2 relative">
                  <button 
                    onClick={() => setItems(items.filter(i => i.id !== item.id))} 
                    className="absolute top-3 right-3 text-red-400 hover:text-red-600 transition-colors duration-200 p-1"
                  >
                    <Trash2 size={14}/>
                  </button>
                  <div>
                    <p className="text-xs font-black text-slate-900 break-words pr-6">{item.name}</p>
                    <p className="text-[10px] font-mono text-slate-500 break-all mt-0.5">{item.sku}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1.5 text-xs border-t border-slate-100">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Quantity</span>
                      <span className="font-bold text-slate-800">{item.qty}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Price</span>
                      <span className="font-bold text-slate-800">${item.price.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Unit Wt</span>
                      <span className="font-medium text-slate-600">{item.weight.toFixed(2)} lbs</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Wt</span>
                      <span className="font-black text-slate-700">{(item.weight * item.qty).toFixed(2)} lbs</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Add Item Form Block on Mobile */}
              <div className="bg-white/30 p-3 rounded-xl border border-dashed border-slate-300 space-y-2">
                <select 
                  className="w-full bg-white/80 p-2 rounded-lg text-xs font-bold border border-slate-100 outline-none text-slate-700"
                  value={AVAILABLE_INVENTORIES.find(i => i.name === newItem.name)?.id || ''}
                  onChange={handleInventoryChange}
                >
                  <option value="">Select Inventory Item...</option>
                  {AVAILABLE_INVENTORIES.map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.name}</option>
                  ))}
                </select>
                <input className="w-full bg-slate-100/60 p-2 rounded-lg text-xs font-mono text-slate-500 border border-slate-100 outline-none select-all" placeholder="SKU" value={newItem.sku} readOnly disabled />
                <div className="grid grid-cols-3 gap-1.5 items-center">
                  <div>
                    <label className="text-[8px] uppercase font-bold text-slate-400 block mb-0.5 pl-0.5">Qty</label>
                    <input type="number" min="1" className="w-full bg-white/80 p-2 rounded-lg text-xs font-bold border border-slate-100 outline-none" placeholder="Qty" value={newItem.qty} onChange={(e) => setNewItem({...newItem, qty: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[8px] uppercase font-bold text-slate-400 block mb-0.5 pl-0.5 text-right">Unit Wt</label>
                    <div className="w-full bg-slate-100/80 p-2 rounded-lg text-xs font-bold border border-slate-100 text-slate-500 text-right select-none">
                      {newItem.weight ? `${newItem.weight.toFixed(2)} lbs` : '—'}
                    </div>
                  </div>
                  <div>
                    <label className="text-[8px] uppercase font-bold text-slate-400 block mb-0.5 pl-0.5 text-right">Price ($)</label>
                    <input type="number" step="0.01" min="0" className="w-full bg-white/80 p-2 rounded-lg text-xs font-bold border border-slate-100 outline-none text-right" placeholder="$" value={newItem.price || ''} onChange={(e) => setNewItem({...newItem, price: e.target.value})} />
                  </div>
                </div>
                <button onClick={handleAddItem} className="w-full bg-slate-900 text-white py-2 rounded-lg hover:bg-slate-800 transition-all duration-200 shadow-sm font-bold text-xs flex items-center justify-center gap-1 mt-1">
                  <Plus size={14}/> Add Manifest Item
                </button>
              </div>
            </div>

            {/* Desktop Structured View Grid (Hidden on mobile) */}
            <div className="hidden md:block">
              <table className="w-full table-fixed">
                <thead className="text-left text-[9px] uppercase font-black text-slate-400 border-b border-white/20">
                  <tr>
                    <th className="pb-2 w-[32%]">Item</th>
                    <th className="pb-2 w-[16%]">SKU</th>
                    <th className="pb-2 w-[8%] text-center">Qty</th>
                    <th className="pb-2 w-[13%] text-right">Unit Wt</th>
                    <th className="pb-2 w-[13%] text-right">Total Wt</th>
                    <th className="pb-2 w-[13%] text-right">Price</th>
                    <th className="pb-2 w-[5%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-xs">
                  {items.map((item) => (
                    <tr key={item.id} className="transition-colors duration-200 hover:bg-white/10">
                      <td className="py-2 font-bold text-slate-900 break-words pr-2" title={item.name}>{item.name}</td>
                      <td className="py-2 font-mono text-[11px] text-slate-500 break-all pr-2" title={item.sku}>{item.sku}</td>
                      <td className="py-2 font-bold text-center">{item.qty}</td>
                      <td className="py-2 font-medium text-slate-500 text-right">{item.weight.toFixed(2)} lbs</td>
                      <td className="py-2 font-black text-slate-700 text-right">{(item.weight * item.qty).toFixed(2)} lbs</td>
                      <td className="py-2 font-bold text-right">${item.price.toFixed(2)}</td>
                      <td className="py-2 text-right">
                         <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600 transition-colors duration-200 p-1"><Trash2 size={13}/></button>
                      </td>
                    </tr>
                  ))}
                  {/* Add Row - Desktop */}
                  <tr className="border-t border-white/40 bg-white/5">
                    <td className="pt-2 pb-1 pr-1.5">
                      <select 
                        className="w-full bg-white/80 p-1 rounded text-xs font-bold border border-slate-100 outline-none text-slate-700 transition-colors duration-150"
                        value={AVAILABLE_INVENTORIES.find(i => i.name === newItem.name)?.id || ''}
                        onChange={handleInventoryChange}
                      >
                        <option value="">Select Item...</option>
                        {AVAILABLE_INVENTORIES.map(inv => (
                          <option key={inv.id} value={inv.id}>{inv.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="pt-2 pb-1 pr-1.5">
                      <input className="w-full bg-slate-100/60 p-1 rounded text-xs font-mono text-slate-500 border border-slate-100 outline-none select-all" placeholder="SKU" value={newItem.sku} readOnly disabled />
                    </td>
                    <td className="pt-2 pb-1 pr-1.5">
                      <input type="number" min="1" className="w-full bg-white/80 p-1 rounded text-xs font-bold border border-slate-100 text-center outline-none" placeholder="1" value={newItem.qty} onChange={(e) => setNewItem({...newItem, qty: e.target.value})} />
                    </td>
                    <td className="pt-2 pb-1 pr-1.5">
                      <input type="text" className="w-full bg-slate-100/80 p-1 rounded text-xs font-bold border border-slate-100 text-right text-slate-500 outline-none select-none" placeholder="0.00 lbs" value={newItem.weight ? `${newItem.weight.toFixed(2)} lbs` : ''} readOnly disabled />
                    </td>
                    <td className="pt-2 pb-1 text-center text-xs font-bold text-slate-400 px-2 self-center">—</td>
                    <td className="pt-2 pb-1 pr-1.5">
                      <input type="number" step="0.01" min="0" className="w-full bg-white/80 p-1 rounded text-xs font-bold border border-slate-100 text-right outline-none" placeholder="0.00" value={newItem.price || ''} onChange={(e) => setNewItem({...newItem, price: e.target.value})} />
                    </td>
                    <td className="pt-2 pb-1 text-right">
                      <button onClick={handleAddItem} className="bg-slate-900 text-white p-1 rounded hover:bg-slate-800 transition-all duration-200 shadow-sm"><Plus size={13}/></button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 w-full min-w-0">
          {/* Enhanced High-Contrast Customer Card */}
          <div className="bg-slate-950 text-white p-5 rounded-2xl shadow-xl border border-slate-900 transition-all duration-300">
             <div className="flex justify-between items-start gap-4 mb-4 pb-3 border-b border-white/10">
                <div className="min-w-0">
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Customer</h3>
                    <p className="font-black text-lg tracking-tight text-white truncate">Sarah Jenkins</p>
                    <span className="inline-flex items-center text-[10px] font-bold bg-brand-gold/15 text-brand-gold px-2.5 py-0.5 rounded-full mt-1.5 border border-brand-gold/20">
                      VIP Member
                    </span>
                </div>
                <div className="w-10 h-10 bg-brand-gold text-slate-950 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-gold/20">
                  <User size={20} strokeWidth={2.5}/>
                </div>
             </div>
             <div className="space-y-2 text-xs font-medium">
                <div className="flex items-center gap-2.5 min-w-0 bg-white/5 p-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors duration-150">
                  <Mail size={14} className="text-slate-400 shrink-0"/> 
                  <span className="break-all select-all font-semibold tracking-wide text-slate-200">sarah.j@email.com</span>
                </div>
                <div className="flex items-center gap-2.5 min-w-0 bg-white/5 p-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors duration-150">
                  <Phone size={14} className="text-slate-400 shrink-0"/> 
                  <span className="truncate font-semibold tracking-wide text-slate-200">(555) 123-4567</span>
                </div>
             </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl transition-all duration-300">
             <h3 className="text-[9px] font-black uppercase text-amber-800 mb-3 flex items-center gap-1.5"><MessageSquare size={12}/> Internal Notes</h3>
             <div className="space-y-1.5 mb-3 max-h-36 overflow-y-auto pr-1">
               {notes.map(note => (
                 <div key={note.id} className="flex justify-between items-start bg-amber-100/60 p-2 rounded-lg text-xs font-medium text-amber-900 gap-2 break-words">
                   <span className="flex-1 min-w-0 break-words">{note.text}</span>
                   <button onClick={() => setNotes(notes.filter(n => n.id !== note.id))} className="text-amber-500 hover:text-amber-700 transition-colors duration-200 p-0.5 shrink-0"><X size={12}/></button>
                 </div>
               ))}
             </div>
             <div className="flex gap-2 items-center">
               <input className="flex-1 bg-white p-2 rounded-lg text-xs border border-amber-200 outline-none transition-all duration-200 min-w-0" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add internal note..." onKeyDown={(e) => { if(e.key === 'Enter') { setNotes([...notes, {id: Date.now(), text: newNote}]); setNewNote(''); } }} />
               <button onClick={() => { if(!newNote.trim()) return; setNotes([...notes, {id: Date.now(), text: newNote}]); setNewNote(''); }} className="bg-amber-900 text-white p-2 rounded-lg hover:bg-amber-800 transition-all duration-200 shrink-0 shadow-sm"><Plus size={14}/></button>
             </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-white/60 backdrop-blur-md p-5 rounded-2xl border border-white/60 transition-all duration-300">
             <h3 className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1.5 mb-3"><CreditCard size={12}/> Payment Summary</h3>
             <div className="text-xs sm:text-sm font-bold space-y-2">
               <div className="flex justify-between text-slate-500"><span>Subtotal</span> <span className="font-mono">${subtotal.toFixed(2)}</span></div>
               <div className="flex justify-between text-slate-500"><span>Tax (8%)</span> <span className="font-mono">${tax.toFixed(2)}</span></div>
               <div className="flex justify-between border-t pt-2 mt-1.5 border-slate-900/10 text-slate-900"><span>Total</span> <span className="font-mono text-sm sm:text-base font-black">${total.toFixed(2)}</span></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}