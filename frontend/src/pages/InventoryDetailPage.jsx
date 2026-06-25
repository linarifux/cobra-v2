import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { 
  ArrowLeft, Package, Tag, User, MapPin, 
  DollarSign, TrendingUp, History, ShieldAlert, Layers, ExternalLink, Loader2, 
  Info, Trash2
} from 'lucide-react';

// Redux Actions
import { fetchInventoryById, deleteInventory, clearCurrentInventoryItem } from '../store/slices/inventorySlice';

// Import Confirm Hook
import { useConfirm } from '../providers/ConfirmProvider';

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

// --- PROFESSIONAL ERROR TRANSLATOR ---
const formatErrorMessage = (err) => {
  const errorString = typeof err === 'string' ? err : (err?.message || '');
  return errorString || 'An unexpected server error occurred.';
};

export default function InventoryDetail() {
  const { inventoryId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const confirm = useConfirm();

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
    const isConfirmed = await confirm({
      title: 'Delete Asset?',
      message: 'Are you sure you want to permanently delete this inventory asset? This action cannot be undone and will remove it from all storage locations.',
      confirmText: 'Delete Asset',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        const deletePromise = dispatch(deleteInventory(inventoryId)).unwrap();
        
        toast.promise(deletePromise, {
          loading: 'Deleting asset...',
          success: 'Asset permanently removed from database.',
          error: (err) => `Delete Failed: ${formatErrorMessage(err)}`
        });

        await deletePromise;
        navigate('/inventory', { replace: true }); 
      } catch (err) {
        // Silently caught, toast.promise handles UI feedback
      }
    }
  };

  // -------------------------------------------------------------
  // STATE HANDLING: Loading & Error
  // -------------------------------------------------------------
  if (status === 'loading' || !item) {
    return (
      <div className="h-full flex flex-col justify-center items-center py-32 text-slate-400 gap-4">
        <Loader2 className="animate-spin text-brand-gold" size={36} />
        <p className="text-xs font-black uppercase tracking-widest animate-pulse">Retrieving Asset Node...</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="h-full max-w-[1400px] mx-auto p-6 flex justify-center items-center min-h-[60vh]">
        <div className="bg-white/60 backdrop-blur-2xl p-8 rounded-[2rem] text-center border border-red-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm">
            <ShieldAlert size={32} className="text-red-500" />
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight mb-2">Asset Retrieval Failed</h2>
          <p className="text-xs font-bold text-slate-500 mb-8">{error || 'An unexpected error occurred while querying the database.'}</p>
          <button 
            onClick={() => navigate('/inventory', { replace: true })} 
            className="w-full px-6 py-3.5 bg-slate-900 text-brand-gold rounded-xl text-xs uppercase tracking-widest font-black hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          >
            Return to Registry
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // DATA MAPPING
  // -------------------------------------------------------------
  const unitPrice = Number(item.price || 0);
  const onHand = Number(item.available || 0);
  const totalAssetValue = unitPrice * onHand;
  
  const safetyBuffer = Number(item.min || 0);
  const isLowStock = safetyBuffer > 0 && onHand <= safetyBuffer;
  
  const customerName = item.customer?.customerName || 'Unassigned Pool';
  const divisionName = item.division?.divisionName || 'Unassigned';
  const categoryName = item.category1?.categoryName || 'Unassigned';
  
  const safeImageUrl = sanitizeS3Url(item.productImage || item.image || item.imageUrl);
  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="h-full max-w-[1500px] mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      
      {/* 1. Header Navigation */}
      <div className="flex items-center justify-between pb-2">
        <button 
          onClick={() => navigate('/inventory')}
          className="flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white backdrop-blur-xl border border-slate-200/60 rounded-xl text-[11px] font-black text-slate-600 hover:text-slate-900 uppercase tracking-widest shadow-sm transition-all"
        >
          <ArrowLeft size={16} /> Registry
        </button>
        
        {/* NEW: Action Buttons (Delete) */}
        <button 
          onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 rounded-xl text-[11px] font-black text-red-600 uppercase tracking-widest shadow-sm transition-all"
        >
          <Trash2 size={14} /> Purge Asset
        </button>
      </div>

      {/* 2. Core Identity Hero Block */}
      <div className="bg-slate-900 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden border border-slate-800/60">
        
        {/* Abstract Background Gradient */}
        <div className="absolute top-0 right-0 w-3/4 h-full bg-gradient-to-l from-brand-gold/10 to-transparent pointer-events-none" />
        
        <div className="absolute right-0 top-0 h-full w-1/2 opacity-[0.03] pointer-events-none flex justify-end items-center overflow-hidden">
          {safeImageUrl && !imageError ? (
            <img src={safeImageUrl} alt="" className="w-full h-full object-cover scale-150 blur-md mix-blend-screen" />
          ) : (
            <Package size={400} className="-translate-y-10 translate-x-10" />
          )}
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8 w-full md:w-auto">
            
            {/* Visual Thumbnail */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 bg-slate-950 p-2 rounded-[1.5rem] shadow-2xl border border-slate-800 shrink-0 flex items-center justify-center overflow-hidden backdrop-blur-md relative group">
              {safeImageUrl && !imageError ? (
                <img 
                  src={safeImageUrl} 
                  alt={item.description || 'Product'} 
                  className="w-full h-full object-cover rounded-xl bg-white transition-transform duration-500 group-hover:scale-110" 
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-slate-900 rounded-xl flex flex-col items-center justify-center text-slate-600 gap-2">
                  <Package size={32} />
                  <span className="text-[9px] font-black uppercase tracking-widest">No Image</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[11px] font-mono font-black text-slate-900 uppercase tracking-widest bg-brand-gold px-3 py-1 rounded-lg shadow-sm">
                  SKU: {item.productCode || item.sku || 'N/A'}
                </span>
                <span className={`px-3 py-1 text-[10px] font-black rounded-lg tracking-widest uppercase border backdrop-blur-sm ${isLowStock ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                  {item.status !== 'Active' ? item.status : (isLowStock ? 'Low Stock Warning' : 'Active Status')}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
                {item.description || item.itemName || 'Unnamed Asset'}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <History size={14} className="text-slate-500" />
                <span>Last audited <strong className="text-slate-200">{new Date(item.lastAuditedAt || item.updatedAt).toLocaleString()}</strong> by <strong className="text-brand-gold">{item.lastAuditedBy || 'System Protocol'}</strong></span>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-950/50 backdrop-blur-xl border border-white/10 px-8 py-6 rounded-[2rem] text-right shrink-0 shadow-inner w-full md:w-auto self-stretch md:self-auto flex flex-col justify-center">
            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Pool Valuation</span>
            <span className="text-4xl font-mono font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.2)]">
              {formatCurrency(totalAssetValue)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Primary KPI Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* On-Hand Stock */}
        <div className="bg-white/60 backdrop-blur-2xl border border-white/80 p-6 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all hover:bg-white/80 flex flex-col justify-between min-h-[140px]">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Available On-Hand</span>
          <div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-mono font-black text-slate-900 tracking-tighter">{onHand}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Units</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner">
              <div 
                className={`h-full transition-all duration-700 ease-out ${isLowStock ? 'bg-red-500' : 'bg-brand-gold'}`} 
                style={{ width: `${Math.min((onHand / (safetyBuffer * 2 || 100)) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Pipeline Supply */}
        <div className="bg-white/60 backdrop-blur-2xl border border-white/80 p-6 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all hover:bg-white/80 flex flex-col justify-between min-h-[140px]">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pipeline Supply</span>
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-mono font-black text-blue-600 tracking-tighter">+{item.openOrders || 0}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inbound</span>
            </div>
            <span className="text-[10px] text-slate-500 font-bold block bg-slate-100 w-fit px-2 py-1 rounded-md">
              Projected Pool: {onHand + (item.openOrders || 0)}
            </span>
          </div>
        </div>

        {/* Unit Cost */}
        <div className="bg-white/60 backdrop-blur-2xl border border-white/80 p-6 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all hover:bg-white/80 flex flex-col justify-between min-h-[140px]">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Base Unit Cost</span>
          <div>
            <div className="flex items-baseline gap-1 mb-2">
              <DollarSign size={24} className="text-brand-gold self-center mb-1" />
              <span className="text-4xl font-mono font-black text-slate-900 tracking-tighter">{unitPrice.toFixed(2)}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">USD Standard</span>
          </div>
        </div>

        {/* Safety Buffer */}
        <div className="bg-white/60 backdrop-blur-2xl border border-white/80 p-6 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all hover:bg-white/80 flex flex-col justify-between min-h-[140px]">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Safety Threshold</span>
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-mono font-black text-slate-700 tracking-tighter">{safetyBuffer}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Min Qty</span>
            </div>
            <span className={`text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-widest ${isLowStock ? 'text-red-500' : 'text-emerald-600'}`}>
              <ShieldAlert size={14} /> {isLowStock ? 'Action Required' : 'Secure Buffer'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Deep Operational Meta Data Sheets & Tracking Ledger */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Meta Cards */}
        <div className="space-y-6">
          
          {/* Card A: Lineage Hierarchy Classification */}
          <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 pb-4 border-b border-slate-200/60 flex items-center gap-2 mb-5">
              <Layers size={14} className="text-brand-gold" /> Classification Hierarchy
            </h3>
            
            <div className="space-y-5">
              <div>
                <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest mb-2">Operational Division</span>
                <p className="text-slate-900 text-sm font-black bg-white px-4 py-2.5 rounded-xl border border-slate-200/60 inline-flex shadow-sm">
                  {divisionName}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest mb-2">Assigned Classifications</span>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-lg shadow-sm border border-slate-200/60 ${item.category1 ? 'bg-slate-900 text-brand-gold border-slate-800' : 'bg-slate-50 text-slate-400'}`}>
                    <Tag size={12} /> {categoryName}
                  </span>
                  {item.category2?.categoryName && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-lg shadow-sm bg-white text-slate-600 border border-slate-200/60">
                      <Tag size={12} className="text-slate-400" /> {item.category2.categoryName}
                    </span>
                  )}
                  {item.typePiece && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-lg shadow-sm bg-brand-gold/10 text-brand-gold border border-brand-gold/20">
                      <Package size={12} /> {item.typePiece}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card B: B2B Accounts Ecosystem Links */}
          <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 pb-4 border-b border-slate-200/60 flex items-center gap-2 mb-5">
              <User size={14} className="text-brand-gold" /> Ecosystem Architecture
            </h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest mb-2">Sourcing Profile</span>
                <p className="text-slate-800 text-xs font-black bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 shadow-inner flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 block"></span> Internal Supply Protocol
                </p>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest mb-2">Client Allocation</span>
                <p className="text-slate-900 text-sm font-black bg-white px-4 py-3 rounded-xl border border-slate-200/60 shadow-sm flex items-center gap-2">
                  <User size={16} className="text-brand-gold" /> {customerName}
                </p>
              </div>
            </div>
          </div>

          {/* Card C: Logistics Deployment Vector (NEW ARRAY LOGIC) */}
          <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-4xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 pb-4 border-b border-slate-200/60 flex items-center gap-2 mb-5">
              <MapPin size={14} className="text-brand-gold" /> Deployment Vector
            </h3>
            
            <div>
              <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest mb-2">Locations</span>
              
              {/* Maps over multiple locations, with legacy fallback */}
              {item.locations?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {item.locations.map((loc, idx) => (
                    <div key={loc._id || idx} className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border border-slate-200/60 shadow-sm w-fit">
                      <MapPin size={14} className="text-emerald-500 shrink-0" />
                      <span className="text-sm font-black text-slate-900 truncate">{loc.designation || loc}</span>
                      {loc.storageCategory && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-l border-slate-200 pl-2 ml-1">
                          {loc.storageCategory}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : item.locationString ? (
                <div className="flex items-center gap-2 text-slate-900 text-sm font-black bg-white px-4 py-3 rounded-xl border border-slate-200/60 shadow-sm w-fit max-w-full">
                  <MapPin size={16} className="text-emerald-500 shrink-0" />
                  <span className="truncate">{item.locationString}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 text-sm font-bold bg-slate-50 border border-slate-200 border-dashed px-4 py-3 rounded-xl w-fit max-w-full">
                  <MapPin size={16} className="text-slate-300 shrink-0" />
                  <span className="truncate italic">Unassigned Facility</span>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 rounded-xl mt-4 text-[10px] font-bold leading-relaxed flex gap-3 items-start">
                <Info size={14} className="shrink-0 mt-0.5" />
                <p>Cross-dock adjustments require verified barcode validation matching on-site vault sequences.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Ledger Table (Spans 2 Columns) */}
        <div className="xl:col-span-2 bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] h-full flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-5 border-b border-slate-200/60 mb-6 gap-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <History size={18} className="text-brand-gold" /> Audit Ledger
            </h3>
            <span className="text-[9px] font-black tracking-widest text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg uppercase shadow-sm">
              Realtime Sync Stream
            </span>
          </div>

          <div className="overflow-x-auto w-full flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="p-4 rounded-tl-xl w-[25%]">Timestamp</th>
                  <th className="p-4 w-[35%]">Adjustment Event</th>
                  <th className="p-4 w-[25%]">Reference ID</th>
                  <th className="p-4 rounded-tr-xl text-center w-[15%]">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {item.auditLedger && item.auditLedger.length > 0 ? (
                  item.auditLedger.slice().reverse().map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-4 text-xs font-mono font-bold text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric', 
                          hour: 'numeric', minute: '2-digit'
                        })}
                      </td>
                      <td className="p-4 font-black text-slate-800">{log.event}</td>
                      <td className="p-4 text-xs font-mono font-bold text-slate-500">
                        <span className="inline-flex items-center gap-1.5 hover:text-brand-gold transition-colors cursor-pointer bg-white px-2.5 py-1 rounded border border-slate-200 shadow-sm truncate max-w-[150px]">
                          {log.referenceId} <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex justify-center items-center px-3 py-1 rounded-lg text-xs font-black font-mono border shadow-sm w-16 ${log.quantityDelta >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {log.quantityDelta > 0 ? '+' : ''}{log.quantityDelta}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-50/50">
                      No audit records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="bg-slate-900 rounded-2xl p-5 mt-6 flex items-start gap-4 text-xs text-slate-400 font-medium shadow-inner">
            <TrendingUp size={20} className="text-brand-gold shrink-0" />
            <p className="leading-relaxed">
              Metrics dynamically balance across system checkouts. Adjusting asset specifications or triggering stock decommission updates entries across real-time analytics frameworks instantly.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}