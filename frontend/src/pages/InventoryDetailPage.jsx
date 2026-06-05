import React, { useState } from 'react';
import { 
  ArrowLeft, Edit, Trash2, Package, Tag, User, MapPin, 
  DollarSign, TrendingUp, History, ShieldAlert, Layers, ExternalLink 
} from 'lucide-react';

export default function InventoryDetailPage({ itemId, onBack, onEdit, onDelete }) {
  // Mock fallback item lookup matching your schema matrix
  const [item, setItem] = useState({
    id: itemId || 1,
    code: '61943',
    desc: 'Hy-D vs. Bio-D Comparison Study Pack',
    vendor: 'DSM',
    customer: 'Global Feeds Corp',
    division: 'Animal Nutrition',
    category: 'Supplements',
    location: 'Warehouse Alpha - A3',
    price: 145.50,
    available: 325,
    onOrder: 50,
    minThreshold: 100,
    updatedAt: '2026-06-02 14:22',
    updatedBy: 'Sarah Jenkins'
  });

  // Mock ledger data tracking audit trails
  const [stockHistory] = useState([
    { id: 1, type: 'Inbound Receipt', qty: '+50', date: '2026-06-02', reference: 'PO-99021', operator: 'Sarah Jenkins' },
    { id: 2, type: 'Allocation Order', qty: '-20', date: '2026-05-28', reference: 'SO-44102', operator: 'Marcus Vance' },
    { id: 3, type: 'Cycle Count Audit', qty: '+5', date: '2026-05-15', reference: 'AUD-619', operator: 'Sarah Jenkins' },
    { id: 4, type: 'Inbound Receipt', qty: '+100', date: '2026-04-10', reference: 'PO-98771', operator: 'System Auto' },
  ]);

  // Derived Financial Valuations
  const totalAssetValue = item.price * item.available;
  const isLowStock = item.available <= item.minThreshold;

  return (
    <div className="h-full max-w-[1400px] mx-auto p-6 space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Upper Breadcrumb / Context Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/60 pb-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-slate-900 uppercase tracking-wider transition-colors"
        >
          <ArrowLeft size={16} /> Back to Stock Registry
        </button>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => onEdit && onEdit(item)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Edit size={13} /> Edit Asset Node
          </button>
          <button 
            onClick={() => onDelete && onDelete(item.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200/40 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Trash2 size={13} /> Decommission Item
          </button>
        </div>
      </div>

      {/* 2. Core Identity Hero Block */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 opacity-5 pointer-events-none">
          <Package size={240} />
        </div>
        
        <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono font-black text-slate-900 uppercase tracking-widest bg-emerald-400 px-2 py-0.5 rounded-md">
                SKU: {item.code}
              </span>
              <span className={`px-2 py-0.5 text-[9px] font-black rounded-full tracking-wide uppercase ${isLowStock ? 'bg-amber-500 text-slate-900 animate-pulse' : 'bg-slate-800 text-slate-300'}`}>
                {isLowStock ? 'Low Stock Warning' : 'Stable Inventory Pool'}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">{item.desc}</h1>
            <p className="text-xs text-slate-400 font-medium">
              Last audited on <span className="text-slate-200 font-bold">{item.updatedAt}</span> by <span className="text-slate-200 font-bold">{item.updatedBy}</span>
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-2.5 rounded-2xl text-right shrink-0">
            <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Total Asset Pool Valuation</span>
            <span className="text-xl font-mono font-black text-emerald-400">${totalAssetValue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 3. Primary Performance Indicator Matrix Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* On-Hand Stock Card */}
        <div className="bg-white/50 backdrop-blur-sm border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Units Available On-Hand</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-black text-slate-900">{item.available}</span>
            <span className="text-xs font-bold text-slate-400">Units</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full ${isLowStock ? 'bg-amber-500' : 'bg-emerald-500'}`} 
              style={{ width: `${Math.min((item.available / (item.minThreshold * 2)) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Pending Inbound Stock Card */}
        <div className="bg-white/50 backdrop-blur-sm border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Pipeline Supply (On-Order)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-black text-blue-600">+{item.onOrder}</span>
            <span className="text-xs font-bold text-slate-400">Inbound Allocation</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium block">Total pool sizing dynamic shift to {item.available + item.onOrder}</span>
        </div>

        {/* Unit Cost Valuation Card */}
        <div className="bg-white/50 backdrop-blur-sm border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Base Unit Cost</span>
          <div className="flex items-baseline gap-0.5">
            <DollarSign size={18} className="text-slate-400 self-center -mb-0.5" />
            <span className="text-2xl font-mono font-black text-slate-900">{item.price.toFixed(2)}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block">USD standard market acquisition valuation</span>
        </div>

        {/* Risk / Safety Cushion Threshold Card */}
        <div className="bg-white/50 backdrop-blur-sm border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Safety Buffer Threshold</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-black text-slate-700">{item.minThreshold}</span>
            <span className="text-xs font-bold text-slate-400">Minimum Pool</span>
          </div>
          <span className={`text-[10px] font-bold flex items-center gap-1 ${isLowStock ? 'text-amber-600' : 'text-slate-500'}`}>
            <ShieldAlert size={12} /> {isLowStock ? 'Requires re-order allocation trigger' : 'Stock levels securely buffered'}
          </span>
        </div>
      </div>

      {/* 4. Deep Operational Meta Data Sheets & Tracking Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Segment & Corporate Association Cards (Spans 1 Column) */}
        <div className="space-y-4">
          
          {/* Card A: Lineage Hierarchy Classification */}
          <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-200/40 flex items-center gap-1.5">
              <Layers size={12} /> Classification Hierarchy
            </h3>
            
            <div className="space-y-2 text-xs font-bold">
              <div>
                <span className="text-[9px] font-medium text-slate-400 block uppercase">Operational Unit / Division</span>
                <p className="text-slate-800 text-sm font-black flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-900" /> {item.division}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-medium text-slate-400 block uppercase">Assigned Category Depth</span>
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-slate-100 text-slate-700 font-black tracking-wide uppercase px-2 py-0.5 rounded-md border border-slate-200/40">
                  <Tag size={10} className="text-slate-400" /> {item.category}
                </span>
              </div>
            </div>
          </div>

          {/* Card B: B2B Accounts Ecosystem Links */}
          <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-200/40 flex items-center gap-1.5">
              <User size={12} /> B2B Stakeholder Architecture
            </h3>
            
            <div className="space-y-2 text-xs font-bold">
              <div>
                <span className="text-[9px] font-medium text-slate-400 block uppercase">Supplier Vendor Instance</span>
                <p className="text-slate-800 font-extrabold mt-0.5 flex items-center gap-1">
                  {item.vendor} <span className="text-[10px] text-slate-400 font-normal font-mono">(Primary Source)</span>
                </p>
              </div>
              <div>
                <span className="text-[9px] font-medium text-slate-400 block uppercase">Target Client Account Allocation</span>
                <p className="text-slate-600 font-medium mt-0.5 flex items-center gap-1.5">
                  <User size={12} className="text-slate-400" />
                  <span>{item.customer || 'Unassigned General Reserve'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Card C: Logistics Deployment Vector */}
          <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-200/40 flex items-center gap-1.5">
              <MapPin size={12} /> Logistics Deployment Location
            </h3>
            
            <div className="space-y-1.5 text-xs font-bold">
              <span className="text-[9px] font-medium text-slate-400 block uppercase">Active Vault Coordinates</span>
              <div className="flex items-center gap-1.5 text-slate-800 font-extrabold bg-white/60 p-2 rounded-xl border border-slate-200/40">
                <MapPin size={13} className="text-slate-400 shrink-0" />
                <span className="truncate">{item.location}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium pt-1">
                Cross-dock adjustments require verified barcode validation matching on-site vault sequences.
              </p>
            </div>
          </div>

        </div>

        {/* Right Side: Historical Stock Log Ledger (Spans 2 Columns) */}
        <div className="lg:col-span-2 bg-white/40 border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/40">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <History size={13} /> Stock Movement Audit Ledger
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Realtime Data Stream</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-bold">
              <thead>
                <tr className="border-b border-slate-200/40 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">Timestamp Date</th>
                  <th className="pb-2">Adjustment Transaction Event</th>
                  <th className="pb-2">Reference ID</th>
                  <th className="pb-2 text-center">Quantity Δ</th>
                  <th className="pb-2 text-right">System Authorized By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/20 text-slate-700">
                {stockHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-white/40 transition-colors group">
                    <td className="py-2.5 font-mono text-slate-500 font-medium">{log.date}</td>
                    <td className="py-2.5 font-extrabold text-slate-900">{log.type}</td>
                    <td className="py-2.5 font-mono text-slate-500">
                      <span className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors cursor-pointer">
                        {log.reference} <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-mono font-black">
                      <span className={`px-1.5 py-0.5 rounded text-[11px] ${log.qty.startsWith('+') ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {log.qty}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-500">{log.operator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/40 flex items-start gap-2.5 text-[11px] text-slate-500 font-medium">
            <TrendingUp size={14} className="text-slate-400 mt-0.5 shrink-0" />
            <p>
              Inventory metrics dynamically balance across system checkouts. Adjusting asset specifications or triggering stock decommission updates entries across real-time integrated analytics frameworks instantly.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}