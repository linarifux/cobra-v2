import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ArrowLeft, Edit2, Trash2, Package, Tag, User, MapPin, 
  DollarSign, TrendingUp, History, ShieldAlert, Layers, ExternalLink, Loader2 
} from 'lucide-react';

// Redux Actions
import { fetchInventoryById, deleteInventory, clearCurrentInventoryItem } from '../store/slices/inventorySlice';

// Utility to sanitize S3 URLs and bypass SSL wildcard dot errors
const sanitizeS3Url = (url) => {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    const hostParts = urlObj.hostname.split('.s3.');
    if (hostParts.length === 2 && hostParts[0].includes('.')) {
      const bucketName = hostParts[0];
      return `https://s3.amazonaws.com/${bucketName}${urlObj.pathname}`;
    }
  } catch (err) {
    return url;
  }
  return url;
};

export default function InventoryDetail() {
  const { inventoryId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [imageError, setImageError] = useState(false);

  // Safely access Redux state
  const { currentItem: item, status, error } = useSelector(state => state.inventory || {});

  // Fetch data on mount using the correct parameter
  useEffect(() => {
    if (inventoryId) {
      dispatch(fetchInventoryById(inventoryId));
      setImageError(false); // Reset error state when fetching a new item
    }
    // Cleanup function to clear stale data when unmounting
    return () => dispatch(clearCurrentInventoryItem());
  }, [inventoryId, dispatch]);

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to permanently delete this inventory asset item?")) {
      try {
        await dispatch(deleteInventory(inventoryId)).unwrap();
        navigate('/inventory', { replace: true }); 
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
      <div className="h-full flex flex-col justify-center items-center py-32 text-slate-400 gap-4">
        <Loader2 className="animate-spin text-brand-gold" size={32} />
        <p className="text-xs font-black uppercase tracking-widest">Retrieving Asset Node...</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="h-full max-w-[1400px] mx-auto p-6 flex justify-center items-center">
        <div className="bg-red-50 text-red-600 p-8 rounded-[2rem] text-center text-sm font-bold border border-red-200 shadow-sm max-w-md w-full">
          <ShieldAlert size={32} className="mx-auto mb-3 text-red-500" />
          <p>Failed to load inventory item.</p>
          <p className="text-xs font-medium mt-1 opacity-80">{error}</p>
          <button 
            onClick={() => navigate('/inventory', { replace: true })} 
            className="mt-6 px-6 py-2.5 bg-red-600 text-white rounded-xl text-xs uppercase tracking-wider font-black hover:bg-red-700 transition-colors"
          >
            Return to Registry
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // DATA MAPPING: Safely deriving values from the updated backend schema
  // -------------------------------------------------------------
  const unitPrice = Number(item.price || 0);
  const onHand = Number(item.available || 0);
  const totalAssetValue = unitPrice * onHand;
  
  const safetyBuffer = Number(item.min || 0);
  const isLowStock = safetyBuffer > 0 && onHand <= safetyBuffer;
  
  // Safely extract populated relational data based on the new schema structure
  const customerName = item.customer?.customerName || 'Unassigned Pool';
  const divisionName = item.division?.divisionName || 'Unassigned';
  const categoryName = item.category1?.categoryName || 'Unassigned';
  
  // Check for the image field (added fallback fields just in case backend mapping changed)
  const safeImageUrl = sanitizeS3Url(item.productImage || item.image || item.imageUrl);

  // Format currency nicely
  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="h-full max-w-[1400px] mx-auto p-6 space-y-6 animate-fade-in pb-20">
      
      {/* 1. Upper Breadcrumb / Context Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/60 pb-4">
        <button 
          onClick={() => navigate('/inventory')}
          className="flex items-center gap-2 text-[11px] font-black text-slate-500 hover:text-slate-900 uppercase tracking-widest transition-colors"
        >
          <ArrowLeft size={16} /> Back to Stock Registry
        </button>

        <div className="flex items-center gap-2">
          {/* Navigate to edit page */}
          <button 
            onClick={() => navigate(`/inventory/${inventoryId}/edit`)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/60 hover:bg-white border border-slate-200 text-slate-700 hover:text-brand-gold rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
          >
            <Edit2 size={13} /> Edit Asset Node
          </button>
          <button 
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/60 hover:bg-red-50 border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
          >
            <Trash2 size={13} /> Decommission
          </button>
        </div>
      </div>

      {/* 2. Core Identity Hero Block */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden border border-slate-900">
        
        {/* Dynamic Background Watermark */}
        <div className="absolute right-0 top-0 h-full w-1/2 opacity-[0.04] pointer-events-none flex justify-end items-center overflow-hidden">
          {safeImageUrl && !imageError ? (
            <img src={safeImageUrl} alt="" className="w-full h-full object-cover scale-150 blur-sm mix-blend-screen" />
          ) : (
            <Package size={350} className="-translate-y-10 translate-x-10" />
          )}
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6 w-full md:w-auto">
            
            {/* Visual Thumbnail (Always rendered to preserve layout) */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-900/80 p-1.5 rounded-2xl shadow-xl border border-slate-800 shrink-0 flex items-center justify-center overflow-hidden backdrop-blur-md">
              {safeImageUrl && !imageError ? (
                <img 
                  src={safeImageUrl} 
                  alt={item.description || 'Product'} 
                  className="w-full h-full object-cover rounded-xl bg-white" 
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-slate-800/50 rounded-xl flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Package size={28} />
                  <span className="text-[8px] font-black uppercase tracking-widest">No Image</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-black text-slate-950 uppercase tracking-widest bg-brand-gold px-2.5 py-0.5 rounded-md shadow-sm">
                  SKU: {item.productCode || item.sku || 'N/A'}
                </span>
                <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-md tracking-widest uppercase border ${isLowStock ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                  {item.status !== 'Active' ? item.status : (isLowStock ? 'Low Stock Warning' : 'Stable Inventory Pool')}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">{item.description || item.itemName || 'Unnamed Asset'}</h1>
              <p className="text-xs text-slate-400 font-medium pt-1">
                Last audited on <span className="text-slate-200 font-bold">{new Date(item.lastAuditedAt || item.updatedAt).toLocaleString()}</span> by <span className="text-brand-gold font-bold">{item.lastAuditedBy || 'System Protocol'}</span>
              </p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/10 px-5 py-4 rounded-2xl text-right shrink-0 shadow-inner w-full md:w-auto">
            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Asset Pool Valuation</span>
            <span className="text-3xl font-mono font-black text-emerald-400">{formatCurrency(totalAssetValue)}</span>
          </div>

        </div>
      </div>

      {/* 3. Primary Performance Indicator Matrix Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* On-Hand Stock Card */}
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-3xl shadow-sm space-y-1.5 transition-all hover:bg-white/60">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Units Available On-Hand</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-slate-900">{onHand}</span>
            <span className="text-xs font-bold text-slate-400">Units</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-3 shadow-inner">
            <div 
              className={`h-full ${isLowStock ? 'bg-red-500' : 'bg-brand-gold'}`} 
              style={{ width: `${Math.min((onHand / (safetyBuffer * 2 || 100)) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Pending Inbound Stock Card */}
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-3xl shadow-sm space-y-1.5 transition-all hover:bg-white/60">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pipeline Supply (On-Order)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-blue-600">+{item.openOrders || 0}</span>
            <span className="text-xs font-bold text-slate-400">Inbound</span>
          </div>
          <span className="text-[10px] text-slate-500 font-bold block mt-3">Dynamic pool sizing to {onHand + (item.openOrders || 0)}</span>
        </div>

        {/* Unit Cost Valuation Card */}
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-3xl shadow-sm space-y-1.5 transition-all hover:bg-white/60">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Base Unit Cost</span>
          <div className="flex items-baseline gap-1">
            <DollarSign size={20} className="text-brand-gold self-center -mb-1" />
            <span className="text-3xl font-mono font-black text-slate-900">{unitPrice.toFixed(2)}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold block mt-3">USD standard market valuation</span>
        </div>

        {/* Risk / Safety Cushion Threshold Card */}
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-3xl shadow-sm space-y-1.5 transition-all hover:bg-white/60">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Safety Buffer Threshold</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-slate-700">{safetyBuffer}</span>
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
            
            <div className="space-y-4 text-xs font-bold">
              <div>
                <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest mb-1.5">Operational Division</span>
                <p className="text-slate-900 text-sm font-black bg-white/60 px-3 py-1.5 rounded-xl border border-slate-200/60 inline-flex shadow-sm">
                  {divisionName}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest mb-1.5">Assigned Classifications</span>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-lg shadow-sm border border-slate-200/60 ${item.category1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Tag size={10} className={item.category1 ? "text-brand-gold" : "text-slate-400"} /> {categoryName}
                  </span>
                  {item.category2?.categoryName && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-lg shadow-sm bg-white text-slate-700 border border-slate-200/60">
                      <Tag size={10} className="text-slate-400" /> {item.category2.categoryName}
                    </span>
                  )}
                  {item.typePiece && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-lg shadow-sm bg-brand-gold/10 text-brand-gold border border-brand-gold/20">
                      <Package size={10} /> {item.typePiece}
                    </span>
                  )}
                </div>
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
              <div className="flex items-center gap-2 text-slate-800 font-extrabold bg-white/60 px-3 py-2 rounded-xl border border-slate-200/60 shadow-sm w-fit">
                <MapPin size={14} className="text-brand-gold shrink-0" />
                <span className="truncate">{item.locationString || 'Unassigned Facility'}</span>
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
                  <th className="pb-3 w-[25%]">Timestamp</th>
                  <th className="pb-3 w-[35%]">Adjustment Event</th>
                  <th className="pb-3 w-[25%]">Reference ID</th>
                  <th className="pb-3 text-center w-[15%]">Quantity Δ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40 text-slate-700">
                {item.auditLedger && item.auditLedger.length > 0 ? (
                  // Slice and reverse so the newest transactions appear at the top
                  item.auditLedger.slice().reverse().map((log) => (
                    <tr key={log._id} className="hover:bg-white/40 transition-colors group">
                      {/* Formatted Date & Time */}
                      <td className="py-3.5 font-mono text-slate-500 font-semibold text-[10px]">
                        {new Date(log.timestamp).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric', 
                          hour: 'numeric', minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3.5 font-extrabold text-slate-900">{log.event}</td>
                      <td className="py-3.5 font-mono text-slate-500">
                        <span className="inline-flex items-center gap-1 hover:text-brand-gold transition-colors cursor-pointer bg-white/40 px-2 py-0.5 rounded border border-white/60 shadow-sm truncate max-w-[150px]">
                          {log.referenceId} <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
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