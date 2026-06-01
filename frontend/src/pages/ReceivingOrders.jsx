import { useState } from 'react';
import { 
  Package, Calendar, Filter, Plus, ChevronDown, 
  Search, Trash2, Edit2, AlertCircle, CheckCircle2,
  ArrowRight, Download, RefreshCw
} from 'lucide-react';
import PageHeader from '../components/PageHeader'; // Assuming this exists from your previous code

const MOCK_DATA = [
  { id: 538, date: '2026-05-12', customer: 'Joff Company', item: 'Probiotic Blend', qty: 5800, skids: 1, status: 'Received' },
  { id: 537, date: '2026-05-11', customer: 'Joff Company', item: 'Shipping Box L', qty: 8900, skids: 0, status: 'Pending' },
  { id: 536, date: '2026-05-11', customer: 'Joff Company', item: 'Tape Roll 2"', qty: 90, skids: 0, status: 'Received' },
];

export default function ReceivingOrders() {
  return (
    <div className="space-y-6 animate-slide-in-right">
      
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Receiving Management</h1>
          <p className="text-slate-500 font-medium">Track, confirm, and manage incoming stock shipments.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/50 border border-white/60 hover:bg-white/80 rounded-xl text-sm font-bold text-slate-700 shadow-sm transition-all">
            <Download size={16} /> Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-brand-gold hover:bg-brand-gold-hover text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-gold/20 transition-all hover:-translate-y-0.5">
            <Plus size={16} /> Add Shipment
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Today Received', val: '14,790', icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Pending Arrival', val: '2', icon: AlertCircle, color: 'text-brand-gold' },
          { label: 'Total Shipments', val: '538', icon: Package, color: 'text-slate-900' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/60 backdrop-blur-md border border-white/60 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stat.val}</h3>
            </div>
            <stat.icon className={`w-8 h-8 opacity-20 ${stat.color}`} />
          </div>
        ))}
      </div>

      {/* 3. Filter Controls Pane */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Customer</label>
            <div className="relative">
              <select className="w-full pl-4 pr-10 py-2.5 bg-white/60 border border-white/50 rounded-xl text-sm font-semibold text-slate-900 appearance-none focus:ring-2 focus:ring-brand-gold/50 outline-none">
                <option>All Customers</option>
                <option>Joff Company</option>
              </select>
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
            </div>
          </div>
          
          <div className="w-[180px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">From Date</label>
            <input type="date" className="w-full px-4 py-2.5 bg-white/60 border border-white/50 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none" />
          </div>

          <div className="w-[180px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">To Date</label>
            <input type="date" className="w-full px-4 py-2.5 bg-white/60 border border-white/50 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none" />
          </div>

          <button className="self-end px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md transition-all">
            Apply Filters
          </button>
        </div>
      </div>

      {/* 4. Data Table */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/50">
              {['Date', 'Receiving #', 'Customer', 'Inventory Item', 'Qty', 'Skids', 'Status', ''].map((h) => (
                <th key={h} className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/40">
            {MOCK_DATA.map((row) => (
              <tr key={row.id} className="hover:bg-white/40 transition-colors group">
                <td className="p-4 text-sm font-bold text-slate-600">{row.date}</td>
                <td className="p-4 text-sm font-mono font-bold text-slate-900">#{row.id}</td>
                <td className="p-4 text-sm font-medium text-slate-600">{row.customer}</td>
                <td className="p-4 text-sm font-semibold text-slate-800">{row.item}</td>
                <td className="p-4 text-sm font-bold text-slate-900">{row.qty.toLocaleString()}</td>
                <td className="p-4 text-sm font-bold text-slate-600">{row.skids}</td>
                <td className="p-4">
                  <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${row.status === 'Received' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                    {row.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-brand-gold transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}