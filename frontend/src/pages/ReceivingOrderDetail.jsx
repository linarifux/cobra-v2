import React, { useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ArrowLeft, Printer, FileText, CheckCircle2, 
  Info, Building2, MapPin, Weight, Calendar, Truck, Loader2,
  Package
} from 'lucide-react';

// Import Redux Actions
import { fetchReceivingById, clearCurrentReceivingLog } from '../store/slices/receivingSlice';

export default function ReceivingOrderDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();

  // Access Redux State
  const { currentLog, currentLogStatus, error } = useSelector(state => state.receiving || {});

  // Fetch record on mount, clear on unmount
  useEffect(() => {
    if (id) {
      dispatch(fetchReceivingById(id));
    }
    return () => {
      dispatch(clearCurrentReceivingLog());
    };
  }, [id, dispatch]);

  // Construct a standard array for the table, now including Division and Category
  const enrichedItems = useMemo(() => {
    if (!currentLog) return [];
    
    const qty = Number(currentLog.quantity) || 0;
    const unitWeight = Number(currentLog.unitWeight) || 0;
    
    // Safely extract division and category names (assuming they are populated from the backend)
    const divisionName = currentLog.inventoryItem?.divisions?.[0]?.divisionName || 'Unassigned Division';
    const categoryName = currentLog.inventoryItem?.categories?.[0]?.categoryName || 'Unassigned Category';
    
    return [{
      id: currentLog._id,
      name: currentLog.inventoryItem?.itemName || 'Unknown Item',
      sku: currentLog.inventoryItem?.sku || 'N/A',
      division: divisionName,
      category: categoryName,
      cartons: currentLog.numberOfCartons || 0,
      unitsPerCarton: currentLog.unitsPerCarton || 0,
      qty: qty,
      received: qty,
      unitWeight: unitWeight,
      totalLineWeight: qty * unitWeight,
      condition: "Perfect" // Hardcoded status for now as it's not in the DB schema
    }];
  }, [currentLog]);

  // Calculate global order weight
  const calculatedTotalWeight = useMemo(() => {
    const totalLbs = enrichedItems.reduce((acc, curr) => acc + curr.totalLineWeight, 0);
    return totalLbs > 0 ? `${totalLbs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lbs` : '0.00 lbs';
  }, [enrichedItems]);

  // Generate an Audit Timeline from DB timestamps
  const auditLogs = useMemo(() => {
    if (!currentLog) return [];
    const logs = [];
    
    // Updated At log
    if (currentLog.updatedAt !== currentLog.createdAt) {
      logs.push({
        time: new Date(currentLog.updatedAt).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' }),
        event: 'Receipt details updated/modified',
        user: 'System'
      });
    }

    // Created At log
    logs.push({
      time: new Date(currentLog.createdAt).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' }),
      event: 'Initial receiving intake logged',
      user: 'System'
    });

    return logs;
  }, [currentLog]);

  // --- Loading & Error States ---
  if (currentLogStatus === 'loading' || !currentLog) {
    return (
      <div className="h-full flex flex-col items-center justify-center min-h-[500px] text-slate-400 gap-4">
        <Loader2 className="animate-spin text-brand-gold" size={36} />
        <p className="text-xs font-black uppercase tracking-widest">Retrieving Receipt Data...</p>
      </div>
    );
  }

  if (currentLogStatus === 'failed') {
    return (
      <div className="p-10 text-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl inline-block font-bold border border-red-200 shadow-sm">
          Error retrieving record: {error}
          <Link to="/receiving" className="block mt-4 text-xs underline text-slate-500 hover:text-slate-800">Return to Log</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 max-w-[1500px] mx-auto p-6 pb-20">
      
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/receiving" className="p-2.5 bg-white/50 hover:bg-white/80 border border-white/60 rounded-xl transition-all shadow-sm">
            <ArrowLeft className="text-slate-600" size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900">Receipt #{currentLog.receivingId}</h1>
              <span className="px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wide bg-emerald-100 text-emerald-700">
                Received
              </span>
            </div>
            <p className="text-slate-500 font-medium text-sm mt-0.5">
              Logged on {new Date(currentLog.dateReceived).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-black text-slate-700 shadow-sm transition-all active:scale-95 uppercase tracking-wider">
            <FileText size={16} /> PDF
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-brand-gold rounded-xl text-sm font-black shadow-xl shadow-slate-900/20 transition-all active:scale-95 uppercase tracking-wider">
            <Printer size={16} /> Print Label
          </button>
        </div>
      </div>

      {/* 2. Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Customer', val: currentLog.customer?.customerName || '—', icon: Building2 },
          { label: 'Vendor / Carrier', val: currentLog.vendor || '—', icon: Truck },
          { label: 'Skids Rcvd', val: `${currentLog.skids || 0} Skids`, icon: Package },
          { label: 'Storage Location', val: currentLog.location?.designation || 'Unassigned', icon: MapPin },
          { label: 'Total Weight', val: calculatedTotalWeight, icon: Weight }, 
          { label: 'Billed Charge', val: `$${(currentLog.charge || 0).toFixed(2)}`, icon: Calendar },
        ].map((stat, i) => (
          <div key={i} className="bg-white/60 backdrop-blur-xl border border-white/80 p-5 rounded-[1.5rem] shadow-sm flex items-center gap-3 transition-colors hover:bg-white/80">
            <div className="p-2.5 bg-slate-100 rounded-xl text-brand-gold shrink-0 border border-slate-200/60"><stat.icon size={20} /></div>
            <div className="overflow-hidden">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate mb-0.5">{stat.label}</p>
              <p className="text-sm font-black text-slate-900 truncate">{stat.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Items & Notes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="p-6 border-b border-white/80 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Inventory Inbound Details</h3>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-sm">
                Lot: {currentLog.lot || 'N/A'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-white/40">
                    <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Item Details</th>
                    <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100">Pack Config</th>
                    <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right border-b border-slate-100">Expected / Rcvd</th>
                    <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right border-b border-slate-100">Item Wt (lbs)</th>
                    <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right border-b border-slate-100">Total Wt (lbs)</th>
                    <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrichedItems.map((item, i) => (
                    <tr key={i} className="hover:bg-white transition-colors">
                      <td className="p-5">
                        <p className="text-sm font-black text-slate-900">{item.name}</p>
                        
                        {/* UPDATED: SKU, Division, and Category badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] text-slate-500 font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 shadow-sm">
                            {item.sku}
                          </span>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white px-1.5 py-0.5 rounded border border-slate-200/60 shadow-sm">
                            {item.division}
                          </span>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white px-1.5 py-0.5 rounded border border-slate-200/60 shadow-sm">
                            {item.category}
                          </span>
                        </div>
                      </td>
                      <td className="p-5 text-center text-xs font-bold text-slate-600">
                        {item.cartons} ctn <span className="text-slate-400 font-normal mx-1">×</span> {item.unitsPerCarton} units
                      </td>
                      <td className="p-5 text-right">
                        <div className="text-xs font-bold text-slate-400 line-through decoration-slate-300">{item.qty.toLocaleString()}</div>
                        <div className="text-sm font-black text-emerald-700">{item.received.toLocaleString()}</div>
                      </td>
                      <td className="p-5 text-sm font-bold text-slate-500 text-right">
                        {item.unitWeight.toFixed(2)}
                      </td>
                      <td className="p-5 text-sm font-black text-slate-900 text-right">
                        {item.totalLineWeight.toFixed(2)}
                      </td>
                      <td className="p-5 text-center">
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border ${item.condition === 'Perfect' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {item.condition}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <Info className="text-brand-gold" size={18} />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Internal Descriptions</h3>
            </div>
            <div className="space-y-4">
              {currentLog.description ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Description 1</span>
                  <p className="text-sm font-medium text-slate-700">{currentLog.description}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No primary description provided.</p>
              )}

              {currentLog.description2 && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Description 2</span>
                  <p className="text-sm font-medium text-slate-700">{currentLog.description2}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Activity Timeline */}
        <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] p-6 shadow-sm h-fit">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 pb-2 border-b border-slate-100">System Audit Trail</h3>
          <div className="space-y-6">
            {auditLogs.map((log, i) => (
              <div key={i} className="relative flex gap-4 pl-2 group">
                {i !== auditLogs.length - 1 && (
                  <div className="absolute left-[15px] top-8 bottom-[-24px] w-[2px] bg-slate-200 group-hover:bg-brand-gold/50 transition-colors" />
                )}
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0 shadow-md">
                  <CheckCircle2 size={16} className="text-brand-gold" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">{log.event}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{log.time} • User: {log.user}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}