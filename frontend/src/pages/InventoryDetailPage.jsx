import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ArrowLeft, Edit, Trash2, Package, Tag, User, MapPin, 
  DollarSign, TrendingUp, History, ShieldAlert, Layers, ExternalLink, Loader2 
} from 'lucide-react';

// Redux Actions
import { fetchInventoryById, deleteInventory, clearCurrentInventoryItem } from '../store/slices/inventorySlice';

export default function InventoryDetailPage() {
  // CRITICAL FIX: Extract 'inventoryId' to match the parameter defined in App.jsx routes
  const { inventoryId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Safely access Redux state
  const { currentItem: item, status, error } = useSelector(state => state.inventory || {});

  // Fetch data on mount using the correct parameter
  useEffect(() => {
    if (inventoryId) {
      dispatch(fetchInventoryById(inventoryId));
    }
    // Cleanup function to clear stale data when unmounting
    return () => dispatch(clearCurrentInventoryItem());
  }, [inventoryId, dispatch]);

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to permanently delete this inventory asset item?")) {
      try {
        await dispatch(deleteInventory(inventoryId)).unwrap();
        navigate('/inventory'); // Send user back to the main list after deletion
      } catch (err) {
        console.error("Failed to delete inventory:", err);
        alert(`Failed to delete: ${err}`);
      }
    }
  };

  // -------------------------------------------------------------
  // STATE HANDLING: Loading & Error
  // -------------------------------------------------------------
  if (status === 'loading' || !item) {
    return (
      <div className="h-full flex justify-center items-center py-32 text-slate-400">
        <Loader2 className="animate-spin text-brand-gold" size={32} />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="h-full max-w-[1400px] mx-auto p-6 flex justify-center items-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-3xl text-center text-sm font-bold border border-red-200 shadow-sm">
          Failed to load inventory item: {error}
          <button onClick={() => navigate('/inventory')} className="block mt-4 mx-auto text-xs underline text-slate-500 hover:text-slate-800">
            Return to Registry
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // DATA MAPPING: Safely deriving values from the backend schema
  // -------------------------------------------------------------
  const totalAssetValue = (item.unitCost || 0) * (item.unitsOnHand || 0);
  const isLowStock = item.unitsOnHand <= (item.safetyBuffer || 20);
  
  // Safely extract populated relational data
  const customerName = item.customer?.customerName || 'Unassigned Pool';
  const divisionName = item.divisions?.[0]?.divisionName || 'Unassigned';
  const categoryName = item.categories?.[0]?.categoryName || 'Unassigned';

  return (
    <div className="h-full max-w-[1400px] mx-auto p-6 space-y-6 animate-fade-in">
      
      {/* 1. Upper Breadcrumb / Context Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/60 pb-4">
        <button 
          onClick={() => navigate('/inventory')}
          className="flex items-center gap-2 text-[11px] font-black text-slate-500 hover:text-slate-900 uppercase tracking-widest transition-colors"
        >
          <ArrowLeft size={16} /> Back to Stock Registry
        </button>

        <div className="flex items-center gap-2">
          {/* If you implement a standalone edit page, route it here, or open a modal */}
          <button 
            className="flex items-center gap-1.5 px-4 py-2 bg-white/60 hover:bg-white border border-slate-200 text-slate-700 hover:text-brand-gold rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm"
          >
            <Edit size={13} /> Edit Asset Node
          </button>
          <button 
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/60 hover:bg-red-50 border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm"
          >
            <Trash2 size={13} /> Decommission
          </button>
        </div>
      </div>

      {/* 2. Core Identity Hero Block */}
      <div className="bg-slate-950 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden border border-slate-900">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 opacity-5 pointer-events-none">
          <Package size={300} />
        </div>
        
        <div className="flex flex-wrap items-start justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono font-black text-slate-950 uppercase tracking-widest bg-brand-gold px-2.5 py-0.5 rounded-md shadow-sm">
                SKU: {item.sku}
              </span>
              <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-md tracking-widest uppercase border ${isLowStock ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                {item.status || (isLowStock ? 'Low Stock Warning' : 'Stable Inventory Pool')}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">{item.itemName}</h1>
            <p className="text-xs text-slate-400 font-medium pt-1">
              Last audited on <span className="text-slate-200 font-bold">{new Date(item.lastAuditedAt).toLocaleString()}</span> by <span className="text-brand-gold font-bold">{item.lastAuditedBy || 'System'}</span>
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/10 px-5 py-4 rounded-2xl text-right shrink-0 shadow-inner">
            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Asset Pool Valuation</span>
            <span className="text-3xl font-mono font-black text-emerald-400">${totalAssetValue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 3. Primary Performance Indicator Matrix Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* On-Hand Stock Card */}
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-3xl shadow-sm space-y-1.5 transition-all hover:bg-white/60">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Units Available On-Hand</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-slate-900">{item.unitsOnHand}</span>
            <span className="text-xs font-bold text-slate-400">Units</span>
          </div>
          <div className="w-full bg-white/60 h-1.5 rounded-full overflow-hidden mt-3 shadow-inner">
            <div 
              className={`h-full ${isLowStock ? 'bg-red-500' : 'bg-brand-gold'}`} 
              style={{ width: `${Math.min((item.unitsOnHand / ((item.safetyBuffer || 20) * 2)) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Pending Inbound Stock Card */}
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-3xl shadow-sm space-y-1.5 transition-all hover:bg-white/60">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pipeline Supply (On-Order)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-blue-600">+{item.pipelineSupply}</span>
            <span className="text-xs font-bold text-slate-400">Inbound</span>
          </div>
          <span className="text-[10px] text-slate-500 font-bold block mt-3">Dynamic pool sizing to {item.unitsOnHand + item.pipelineSupply}</span>
        </div>

        {/* Unit Cost Valuation Card */}
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-3xl shadow-sm space-y-1.5 transition-all hover:bg-white/60">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Base Unit Cost</span>
          <div className="flex items-baseline gap-1">
            <DollarSign size={20} className="text-brand-gold self-center -mb-1" />
            <span className="text-3xl font-mono font-black text-slate-900">{item.unitCost?.toFixed(2) || '0.00'}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold block mt-3">USD standard market valuation</span>
        </div>

        {/* Risk / Safety Cushion Threshold Card */}
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-3xl shadow-sm space-y-1.5 transition-all hover:bg-white/60">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Safety Buffer Threshold</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-slate-700">{item.safetyBuffer || 20}</span>
            <span className="text-xs font-bold text-slate-400">Minimum Pool</span>
          </div>
          <span className={`text-[10px] font-bold flex items-center gap-1.5 mt-3 ${isLowStock ? 'text-red-500' : 'text-slate-500'}`}>
            <ShieldAlert size={12} /> {isLowStock ? 'Re-order allocation required' : 'Stock securely buffered'}
          </span>
        </div>
      </div>

      {/* 4. Deep Operational Meta Data Sheets & Tracking Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Segment & Corporate Association Cards */}
        <div className="space-y-5">
          
          {/* Card A: Lineage Hierarchy Classification */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-5 space-y-4 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 pb-3 border-b border-white/60 flex items-center gap-2">
              <Layers size={14} className="text-brand-gold" /> Classification Hierarchy
            </h3>
            
            <div className="space-y-3 text-xs font-bold">
              <div>
                <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest mb-1">Operational Division</span>
                <p className="text-slate-900 text-sm font-black bg-white/60 px-3 py-1.5 rounded-xl border border-slate-200/60 inline-flex shadow-sm">
                  {divisionName}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest mb-1">Assigned Category Depth</span>
                <span className="inline-flex items-center gap-1.5 text-[10px] bg-slate-900 text-white font-black tracking-widest uppercase px-2.5 py-1 rounded-lg shadow-md">
                  <Tag size={10} className="text-brand-gold" /> {categoryName}
                </span>
              </div>
            </div>
          </div>

          {/* Card B: B2B Accounts Ecosystem Links */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-5 space-y-4 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 pb-3 border-b border-white/60 flex items-center gap-2">
              <User size={14} className="text-brand-gold" /> B2B Stakeholder Architecture
            </h3>
            
            <div className="space-y-3 text-xs font-bold">
              <div>
                <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest mb-1">Supplier / Sourcing Data</span>
                <p className="text-slate-800 font-extrabold mt-0.5 flex items-center gap-1.5 bg-white/60 px-3 py-2 rounded-xl border border-slate-200/60 shadow-sm">
                  Internal Supply <span className="text-[10px] text-slate-400 font-normal font-mono">(System Recorded)</span>
                </p>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest mb-1">Target Client Account Allocation</span>
                <p className="text-slate-900 font-extrabold mt-0.5 flex items-center gap-2 bg-white/60 px-3 py-2 rounded-xl border border-slate-200/60 shadow-sm">
                  <User size={14} className="text-brand-gold" />
                  <span>{customerName}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Card C: Logistics Deployment Vector */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-5 space-y-4 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 pb-3 border-b border-white/60 flex items-center gap-2">
              <MapPin size={14} className="text-brand-gold" /> Logistics Deployment
            </h3>
            
            <div className="space-y-2 text-xs font-bold">
              <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest mb-1">Active Vault Coordinates</span>
              <div className="flex items-center gap-2 text-slate-800 font-extrabold bg-white/60 px-3 py-2 rounded-xl border border-slate-200/60 shadow-sm">
                <MapPin size={14} className="text-brand-gold shrink-0" />
                <span className="truncate">{item.locationCoordinates || 'Unassigned Facility'}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium pt-1.5 leading-relaxed">
                Cross-dock adjustments require verified barcode validation matching on-site vault sequences.
              </p>
            </div>
          </div>

        </div>

        {/* Right Side: Historical Stock Log Ledger (Spans 2 Columns) */}
        <div className="lg:col-span-2 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex justify-between items-center pb-3 border-b border-white/60">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <History size={16} className="text-brand-gold" /> Stock Movement Audit Ledger
            </h3>
            <span className="text-[9px] font-black tracking-widest text-slate-500 bg-white/60 border border-slate-200/60 px-2.5 py-1 rounded-md uppercase shadow-sm">Realtime Sync Stream</span>
          </div>

          <div className="overflow-x-auto scrollbar-hide min-h-[300px]">
            <table className="w-full text-left border-collapse text-xs font-bold">
              <thead>
                <tr className="border-b border-white/40 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="pb-3 w-[20%]">Timestamp Date</th>
                  <th className="pb-3 w-[40%]">Adjustment Transaction Event</th>
                  <th className="pb-3 w-[25%]">Reference ID</th>
                  <th className="pb-3 text-center w-[15%]">Quantity Δ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40 text-slate-700">
                {item.auditLedger && item.auditLedger.length > 0 ? (
                  // Slice and reverse so the newest transactions appear at the top
                  item.auditLedger.slice().reverse().map((log) => (
                    <tr key={log._id} className="hover:bg-white/40 transition-colors group">
                      <td className="py-3.5 font-mono text-slate-500 font-semibold">{new Date(log.timestamp).toLocaleDateString()}</td>
                      <td className="py-3.5 font-extrabold text-slate-900">{log.event}</td>
                      <td className="py-3.5 font-mono text-slate-500">
                        <span className="inline-flex items-center gap-1 hover:text-brand-gold transition-colors cursor-pointer bg-white/40 px-2 py-0.5 rounded border border-white/60 shadow-sm">
                          {log.referenceId} <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                      </td>
                      <td className="py-3.5 text-center font-mono font-black">
                        <span className={`px-2 py-1 rounded-md text-[11px] border shadow-sm ${log.quantityDelta >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {log.quantityDelta > 0 ? '+' : ''}{log.quantityDelta}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 font-semibold text-[11px] uppercase tracking-widest bg-white/20 rounded-xl">
                      No audit records found for this item.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="bg-slate-900 rounded-2xl p-4 flex items-start gap-3 text-[11px] text-slate-400 font-medium shadow-inner">
            <TrendingUp size={16} className="text-brand-gold mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              Inventory metrics dynamically balance across system checkouts. Adjusting asset specifications or triggering stock decommission updates entries across real-time integrated analytics frameworks instantly.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}