import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Package, Clock, CheckCircle, MapPin, 
  CreditCard, AlertCircle, History, Truck, FileText, 
  ChevronRight, Mail, ShieldCheck, DollarSign, 
  User, Printer, Copy, Info, AlertTriangle, Box, Download
} from 'lucide-react';

export default function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  const [orderStatus, setOrderStatus] = useState('Awaiting Shipment');

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in max-w-[1400px] mx-auto pb-10 px-4">
      {/* 1. Header */}
      <div className="flex items-center justify-between bg-white/30 p-4 rounded-2xl border border-white/50 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft size={18} /> <span className="text-xs font-black uppercase tracking-widest">Back</span>
        </button>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/50 rounded-xl text-xs font-bold border border-white/50 hover:bg-white transition-all">
            <Download size={14} /> Label
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/50 rounded-xl text-xs font-bold border border-white/50 hover:bg-white transition-all">
            <FileText size={14} /> Packing Slip
          </button>
          <button className="bg-brand-gold text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg shadow-brand-gold/20 hover:scale-105 transition-transform">
            Fulfill Order
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Brand & Status Section */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl flex justify-between items-center">
            <div>
               <p className="text-[10px] uppercase font-black text-slate-400">Brand Name</p>
               <p className="text-sm font-bold text-slate-900">LuxeLife</p>
            </div>
            <div>
                <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Update Status</p>
                <select 
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value)}
                    className="bg-white/50 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer"
                >
                    <option value="Awaiting Shipment">Awaiting Shipment</option>
                    <option value="Packed">Packed</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                </select>
            </div>
          </div>

          {/* Order Summary & Logistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Logistics Card */}
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl">
              <h3 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2"><Truck size={14}/> Shipping & Tracking</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Carrier</p>
                  <p className="text-sm font-bold">UPS Ground - 1Z99928374</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Estimated Delivery</p>
                  <p className="text-sm font-bold text-emerald-600">May 24, 2026</p>
                </div>
              </div>
            </div>

            {/* Address Card */}
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl">
              <h3 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2"><MapPin size={14}/> Shipping Address</h3>
              <p className="text-sm font-bold leading-relaxed">
                Sarah Jenkins<br/>
                421 Maple Avenue<br/>
                Brooklyn, NY 11201
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-3xl">
            <h3 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2"><Box size={14}/> Manifest Items</h3>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/50 rounded-2xl border border-white/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                    <div>
                      <p className="text-sm font-bold">Premium Leather Component</p>
                      <p className="text-[10px] text-slate-500">SKU: PL-00{i} • Bin: A-12</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">$47.50</p>
                    <p className="text-[10px] text-slate-500">Qty: 1</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar (1/3 width) */}
        <div className="space-y-6">
          {/* Customer Profile */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl">
             <h3 className="text-[10px] font-black uppercase text-white/50 mb-4 tracking-widest">Customer Profile</h3>
             <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><User size={20} /></div>
               <div>
                  <p className="font-bold">Sarah Jenkins</p>
                  <p className="text-[10px] text-slate-400">VIP Client • Member since '22</p>
               </div>
             </div>
             <button className="w-full py-2 bg-white/10 rounded-xl text-xs font-bold hover:bg-white/20 transition-all">View Customer History</button>
          </div>

          {/* Payment & Risk Card */}
          <div className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white/60 space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><CreditCard size={14}/> Payment Status</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">Captured</span>
             </div>
             <div className="text-sm font-bold space-y-1">
               <div className="flex justify-between"><span>Subtotal</span> <span>$135.00</span></div>
               <div className="flex justify-between"><span>Tax</span> <span>$12.50</span></div>
               <div className="flex justify-between border-t pt-2 mt-2 border-white/50"><span>Total</span> <span>$147.50</span></div>
             </div>
          </div>

          {/* Fraud/Internal Notes */}
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl">
             <h3 className="text-[10px] font-black uppercase text-amber-800 mb-2 flex items-center gap-2"><AlertTriangle size={14}/> Internal Flags</h3>
             <p className="text-xs text-amber-900/70 leading-relaxed">
               Customer requested discreet packaging for this order. Ensure no branding is visible on the exterior box.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}