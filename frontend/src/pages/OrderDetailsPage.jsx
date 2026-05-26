import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Truck, MapPin, User, CreditCard, 
  Download, Trash2, Edit2, Check, Plus, Minus,
  MessageSquare, Mail, Phone, X
} from 'lucide-react';

export default function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [orderStatus, setOrderStatus] = useState('Awaiting Shipment');

  // State
  const [shipping, setShipping] = useState({ carrier: 'UPS Ground', tracking: '1Z99928374', eta: '2026-05-24' });
  const [address, setAddress] = useState({ name: 'Sarah Jenkins', street: '421 Maple Avenue', city: 'Brooklyn', state: 'NY', zip: '11201' });
  const [items, setItems] = useState([{ id: 1, name: 'Premium Leather Component', sku: 'PL-001', qty: 1, price: 47.50 }]);
  const [notes, setNotes] = useState([{ id: 1, text: 'Customer requested discreet packaging.' }]);
  
  // Drawer and New Item State
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [cartonCount, setCartonCount] = useState(1);
  const [newItem, setNewItem] = useState({ name: '', sku: '', qty: 1, price: 0 });
  const [editing, setEditing] = useState({ logistics: false, address: false });
  const [newNote, setNewNote] = useState('');

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handleAddItem = () => {
    if (!newItem.name || !newItem.price) return;
    setItems([...items, { ...newItem, id: Date.now(), qty: Number(newItem.qty), price: Number(newItem.price) }]);
    setNewItem({ name: '', sku: '', qty: 1, price: 0 });
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in max-w-[1400px] mx-auto pb-10 px-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white/30 p-4 rounded-2xl border border-white/50 backdrop-blur-xl transition-all duration-300">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors duration-200">
          <ArrowLeft size={18} /> <span className="text-xs font-black uppercase tracking-widest">Back to Orders</span>
        </button>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/50 rounded-xl text-xs font-bold border border-white/50 hover:bg-white transition-all duration-200">
            <Download size={14} /> Packing Slip
          </button>
          <button 
            onClick={() => setFulfillOpen(true)}
            className="bg-brand-gold text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg shadow-brand-gold/20 hover:scale-105 transition-all duration-200"
          >
            Fulfill Order
          </button>
        </div>
      </div>

      {/* Slide-over Drawer with smooth transition classes */}
      <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${fulfillOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setFulfillOpen(false)} />
        <div className={`relative w-full max-w-sm bg-white/80 backdrop-blur-2xl border-l border-white/50 p-6 shadow-2xl h-full overflow-y-auto transition-transform duration-300 ease-in-out ${fulfillOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <h2 className="font-black uppercase tracking-wider text-sm text-slate-800">Fulfillment Details</h2>
              <div className="flex gap-1 bg-white/50 p-1 rounded-lg">
                <button onClick={() => setCartonCount(prev => Math.max(1, prev - 1))} className="hover:bg-white p-1 rounded transition-colors duration-200"><Minus size={14}/></button>
                <button onClick={() => setCartonCount(prev => prev + 1)} className="hover:bg-white p-1 rounded transition-colors duration-200"><Plus size={14}/></button>
              </div>
            </div>
            <button onClick={() => setFulfillOpen(false)} className="text-slate-500 hover:text-slate-900 transition-colors duration-200"><X size={20}/></button>
          </div>
          
          <div className="space-y-6">
            {/* Dimensions */}
            {Array.from({ length: cartonCount }).map((_, index) => (
              <div key={index} className="grid grid-cols-4 gap-2">
                 <div className="col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Weight</label>
                    <input className="w-full bg-white/60 p-2 rounded-lg text-xs font-bold transition-all duration-200 focus:ring-2 focus:ring-brand-gold/50 outline-none" placeholder="Lbs" />
                 </div>
                 <div className="col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Dim 1</label>
                    <input className="w-full bg-white/60 p-2 rounded-lg text-xs font-bold transition-all duration-200 focus:ring-2 focus:ring-brand-gold/50 outline-none" placeholder="inch" />
                 </div>
                 <div className="col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Dim 2</label>
                    <input className="w-full bg-white/60 p-2 rounded-lg text-xs font-bold transition-all duration-200 focus:ring-2 focus:ring-brand-gold/50 outline-none" placeholder="inch" />
                 </div>
                 <div className="col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Dim 3</label>
                    <input className="w-full bg-white/60 p-2 rounded-lg text-xs font-bold transition-all duration-200 focus:ring-2 focus:ring-brand-gold/50 outline-none" placeholder="inch" />
                 </div>
              </div>
            ))}

            <input className="w-full bg-white/60 p-3 rounded-xl text-xs font-bold transition-all duration-200" placeholder="Total Cartons" />
            <input className="w-full bg-white/60 p-3 rounded-xl text-xs font-bold transition-all duration-200" placeholder="Shipping Cost" />
            
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input type="checkbox" className="accent-brand-gold w-4 h-4" /> Residential?
            </label>

            <select className="w-full bg-white/60 p-3 rounded-xl text-xs font-bold border-none text-slate-700 transition-all duration-200">
              <option>FedEx Small Box</option>
              <option>UPS Envelope</option>
              <option>Custom Box</option>
            </select>

            <button className="w-full bg-brand-gold text-white py-4 rounded-xl text-xs font-black hover:scale-[1.02] transition-all duration-200 mt-4">
              Ship Now
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl transition-all duration-300">
               <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4">Order Status</h3>
               <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} className="w-full bg-white/50 text-sm font-bold px-4 py-3 rounded-xl border border-slate-200 cursor-pointer transition-all duration-200">
                    <option>Awaiting Shipment</option>
                    <option>Packed</option>
                    <option>Shipped</option>
                    <option>Delivered</option>
                </select>
            </div>
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl transition-all duration-300">
               <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><Truck size={14}/> Shipping & Tracking</h3>
                <button onClick={() => setEditing({...editing, logistics: !editing.logistics})} className="text-slate-400 hover:text-slate-900 transition-colors duration-200">
                    {editing.logistics ? <Check size={16} className="text-emerald-600"/> : <Edit2 size={16}/>}
                </button>
               </div>
               {editing.logistics ? (
                   <div className="space-y-2">
                       <input className="w-full bg-white/50 p-2 rounded-lg text-xs transition-all duration-200" value={shipping.carrier} onChange={(e) => setShipping({...shipping, carrier: e.target.value})} />
                       <input className="w-full bg-white/50 p-2 rounded-lg text-xs transition-all duration-200" value={shipping.tracking} onChange={(e) => setShipping({...shipping, tracking: e.target.value})} />
                   </div>
               ) : (
                   <div className="text-sm font-bold text-slate-900">
                       <p>{shipping.carrier}</p>
                       <p className="text-slate-500 text-xs">{shipping.tracking}</p>
                       <p className="text-emerald-600 mt-2">ETA: {shipping.eta}</p>
                   </div>
               )}
            </div>
          </div>

          {/* Editable Shipping Address */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl transition-all duration-300">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><MapPin size={14}/> Shipping Address</h3>
                <button onClick={() => setEditing({...editing, address: !editing.address})} className="text-slate-400 hover:text-slate-900 transition-colors duration-200">
                    {editing.address ? <Check size={16} className="text-emerald-600"/> : <Edit2 size={16}/>}
                </button>
            </div>
            {editing.address ? (
                <div className="grid grid-cols-2 gap-4 transition-all duration-300">
                    <input className="col-span-2 bg-white/50 p-2 rounded-lg text-xs transition-all duration-200" value={address.name} onChange={(e) => setAddress({...address, name: e.target.value})} placeholder="Name" />
                    <input className="col-span-2 bg-white/50 p-2 rounded-lg text-xs transition-all duration-200" value={address.street} onChange={(e) => setAddress({...address, street: e.target.value})} placeholder="Street" />
                    <input className="bg-white/50 p-2 rounded-lg text-xs transition-all duration-200" value={address.city} onChange={(e) => setAddress({...address, city: e.target.value})} placeholder="City" />
                    <div className="flex gap-2">
                        <input className="w-full bg-white/50 p-2 rounded-lg text-xs transition-all duration-200" value={address.state} onChange={(e) => setAddress({...address, state: e.target.value})} placeholder="State" />
                        <input className="w-full bg-white/50 p-2 rounded-lg text-xs transition-all duration-200" value={address.zip} onChange={(e) => setAddress({...address, zip: e.target.value})} placeholder="Zip" />
                    </div>
                </div>
            ) : (
                <div className="text-sm font-bold text-slate-900">
                    <p>{address.name}</p>
                    <p className="text-slate-500">{address.street}</p>
                    <p className="text-slate-500">{address.city}, {address.state} {address.zip}</p>
                </div>
            )}
          </div>

          {/* Manifest Table */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl transition-all duration-300">
            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 flex items-center gap-2">Manifest Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-left text-[10px] uppercase font-black text-slate-400">
                  <tr>
                    <th className="pb-4">Item</th>
                    <th className="pb-4">SKU</th>
                    <th className="pb-4">Qty</th>
                    <th className="pb-4 text-right">Price</th>
                    <th className="pb-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/20">
                  {items.map((item) => (
                    <tr key={item.id} className="transition-colors duration-200">
                      <td className="py-4 text-sm font-bold text-slate-900">{item.name}</td>
                      <td className="py-4 text-xs font-bold text-slate-500">{item.sku}</td>
                      <td className="py-4 text-sm font-bold">{item.qty}</td>
                      <td className="py-4 text-sm font-bold text-right">${item.price.toFixed(2)}</td>
                      <td className="py-4 text-right">
                         <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600 transition-colors duration-200"><Trash2 size={14}/></button>
                      </td>
                    </tr>
                  ))}
                  {/* Add Row */}
                  <tr className="border-t border-white/50">
                    <td className="pt-4"><input className="w-full bg-white/50 p-2 rounded-lg text-xs font-bold transition-all duration-200" placeholder="New Item Name" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} /></td>
                    <td className="pt-4"><input className="w-full bg-white/50 p-2 rounded-lg text-xs font-bold transition-all duration-200" placeholder="SKU" value={newItem.sku} onChange={(e) => setNewItem({...newItem, sku: e.target.value})} /></td>
                    <td className="pt-4"><input type="number" className="w-full bg-white/50 p-2 rounded-lg text-xs font-bold transition-all duration-200" placeholder="1" value={newItem.qty} onChange={(e) => setNewItem({...newItem, qty: e.target.value})} /></td>
                    <td className="pt-4"><input type="number" className="w-full bg-white/50 p-2 rounded-lg text-xs font-bold transition-all duration-200" placeholder="0.00" value={newItem.price} onChange={(e) => setNewItem({...newItem, price: e.target.value})} /></td>
                    <td className="pt-4 text-right"><button onClick={handleAddItem} className="bg-slate-900 text-white p-2 rounded-lg hover:bg-slate-800 transition-all duration-200"><Plus size={16}/></button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl transition-all duration-300">
             <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-[10px] font-black uppercase text-white/50 mb-1">Customer</h3>
                    <p className="font-bold text-lg">Sarah Jenkins</p>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">VIP Member</span>
                </div>
                <div className="w-10 h-10 bg-brand-gold/20 rounded-full flex items-center justify-center"><User size={20} className="text-brand-gold"/></div>
             </div>
             <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-center gap-2"><Mail size={14}/> sarah.j@email.com</div>
                <div className="flex items-center gap-2"><Phone size={14}/> (555) 123-4567</div>
             </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl transition-all duration-300">
             <h3 className="text-[10px] font-black uppercase text-amber-800 mb-4 flex items-center gap-2"><MessageSquare size={14}/> Internal Notes</h3>
             <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
               {notes.map(note => (
                 <div key={note.id} className="flex justify-between bg-amber-100/50 p-2 rounded-lg text-xs font-medium text-amber-900 transition-all duration-200">
                   {note.text}
                   <button onClick={() => setNotes(notes.filter(n => n.id !== note.id))} className="text-amber-500 hover:text-amber-700 transition-colors duration-200"><X size={12}/></button>
                 </div>
               ))}
             </div>
             <div className="flex gap-2">
               <input className="flex-1 bg-white/50 p-2 rounded-lg text-xs transition-all duration-200" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add note..." />
               <button onClick={() => { setNotes([...notes, {id: Date.now(), text: newNote}]); setNewNote(''); }} className="bg-amber-900 text-white p-2 rounded-lg hover:bg-amber-800 transition-all duration-200"><Plus size={16}/></button>
             </div>
          </div>

          <div className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white/60 transition-all duration-300">
             <h3 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 mb-4"><CreditCard size={14}/> Payment Summary</h3>
             <div className="text-sm font-bold space-y-2">
               <div className="flex justify-between text-slate-500"><span>Subtotal</span> <span>${subtotal.toFixed(2)}</span></div>
               <div className="flex justify-between text-slate-500"><span>Tax (8%)</span> <span>${tax.toFixed(2)}</span></div>
               <div className="flex justify-between border-t pt-2 mt-2 border-slate-900/10 text-slate-900"><span>Total</span> <span>${total.toFixed(2)}</span></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}