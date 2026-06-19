import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { 
  ArrowLeft, FileText, CheckCircle2, 
  Info, Building2, MapPin, Weight, Calendar, Truck, Loader2,
  Package, ChevronDown, UserCircle, Printer
} from 'lucide-react';

import { fetchReceivingById, clearCurrentReceivingLog } from '../store/slices/receivingSlice';

export default function ReceivingOrderDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();

  const { currentLog, currentLogStatus, error } = useSelector(state => state.receiving || {});

  // --- Print State & Refs ---
  const printRef = useRef(null);
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [printMode, setPrintMode] = useState('admin'); // 'admin' | 'customer'

  useEffect(() => {
    if (id) dispatch(fetchReceivingById(id));
    return () => dispatch(clearCurrentReceivingLog());
  }, [id, dispatch]);

  const enrichedItems = useMemo(() => {
    if (!currentLog) return [];
    const qty = Number(currentLog.quantity) || 0;
    const unitWeight = Number(currentLog.unitWeight) || 0;
    
    // Check if we have the new breakdown array, otherwise fallback to legacy fields
    const breakdown = currentLog.cartonBreakdown?.length > 0 
      ? currentLog.cartonBreakdown 
      : [{ cartons: currentLog.numberOfCartons || 0, unitsPerCarton: currentLog.unitsPerCarton || 0 }];
    
    return [{
      id: currentLog._id,
      name: currentLog.inventoryItem?.itemName || currentLog.inventoryItem?.description || 'Unknown Item',
      sku: currentLog.inventoryItem?.sku || currentLog.inventoryItem?.productCode || 'N/A',
      division: currentLog.inventoryItem?.division?.divisionName || 'Unassigned Division',
      category: currentLog.inventoryItem?.category1?.categoryName || 'Unassigned Category',
      
      cartonBreakdown: breakdown,
      totalCartons: currentLog.numberOfCartons || 0,
      qty: qty,
      received: qty,
      unitWeight: unitWeight,
      totalLineWeight: qty * unitWeight,
      condition: "Perfect"
    }];
  }, [currentLog]);

  const calculatedTotalWeight = useMemo(() => {
    const totalLbs = enrichedItems.reduce((acc, curr) => acc + curr.totalLineWeight, 0);
    return totalLbs > 0 ? `${totalLbs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '0.00';
  }, [enrichedItems]);

  const auditLogs = useMemo(() => {
    if (!currentLog) return [];
    const logs = [];
    if (currentLog.updatedAt !== currentLog.createdAt) {
      logs.push({
        time: new Date(currentLog.updatedAt).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' }),
        event: 'Receipt details updated/modified',
        user: 'System'
      });
    }
    logs.push({
      time: new Date(currentLog.createdAt).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' }),
      event: 'Initial receiving intake logged',
      user: 'System'
    });
    return logs;
  }, [currentLog]);

  // --- react-to-print Configuration ---
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    content: () => printRef.current, 
    documentTitle: `Receiving-Notification-${currentLog?.receivingId || id}`,
    pageStyle: `
      @page { size: letter; margin: 0.5in; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `,
  });

  const handlePrintTrigger = (mode) => {
    setPrintMode(mode);
    setShowPrintMenu(false);
    setTimeout(() => {
      handlePrint();
    }, 150);
  };

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

  const primaryItem = enrichedItems[0];

  return (
    <>
      {/* ========================================================================= */}
      {/* MAIN SCREEN UI                                                            */}
      {/* ========================================================================= */}
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 max-w-[1500px] mx-auto p-6 pb-20">
        
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
            <div className="relative">
              <button onClick={() => setShowPrintMenu(!showPrintMenu)} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-brand-gold rounded-xl text-sm font-black shadow-xl shadow-slate-900/20 transition-all active:scale-95 uppercase tracking-wider">
                <FileText size={16} /> Print PDF <ChevronDown size={14} className="ml-1" />
              </button>
              {showPrintMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <button onClick={() => handlePrintTrigger('admin')} className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-100">
                    Print for Admin <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Full</span>
                  </button>
                  <button onClick={() => handlePrintTrigger('customer')} className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                    Print for Customer <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100">Safe</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Customer', val: currentLog.customer?.customerName || '—', icon: Building2 },
            { label: 'Carrier', val: currentLog.carrier || '—', icon: Truck },
            { label: 'Vendor', val: currentLog.vendor || '—', icon: UserCircle },
            { label: 'Storage Location', val: currentLog.location?.designation || 'Unassigned', icon: MapPin },
            { label: 'Total Weight', val: `${calculatedTotalWeight} lbs`, icon: Weight }, 
            { label: 'Skids Rcvd', val: `${currentLog.skids || 0} Skids`, icon: Package },
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

        {/* Main Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right border-b border-slate-100">Total Rcvd</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right border-b border-slate-100">Total Wt (lbs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {enrichedItems.map((item, i) => (
                      <tr key={i} className="hover:bg-white transition-colors">
                        <td className="p-5 align-top">
                          <p className="text-sm font-black text-slate-900">{item.name}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] text-slate-500 font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 shadow-sm">{item.sku}</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white px-1.5 py-0.5 rounded border border-slate-200/60 shadow-sm">{item.division}</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white px-1.5 py-0.5 rounded border border-slate-200/60 shadow-sm">{item.category}</span>
                          </div>
                        </td>
                        <td className="p-5 text-center text-xs font-bold text-slate-600 align-top">
                          <div className="flex flex-col gap-1 items-center">
                            {item.cartonBreakdown.map((b, idx) => (
                              <div key={idx} className="bg-slate-50 border border-slate-200 px-2 py-1 rounded w-max whitespace-nowrap text-[10px]">
                                {b.cartons} <span className="text-slate-400 mx-0.5 font-normal">×</span> {b.unitsPerCarton}
                              </div>
                            ))}
                            {item.cartonBreakdown.length > 1 && (
                              <div className="text-[9px] font-black text-brand-gold uppercase mt-1">
                                Total: {item.totalCartons} Cartons
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-5 text-right align-top">
                          <div className="text-lg font-black text-emerald-700">{item.received.toLocaleString()}</div>
                        </td>
                        <td className="p-5 text-sm font-black text-slate-900 text-right align-top">
                          {item.totalLineWeight.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {printMode === 'admin' && currentLog.vendorAddress && (
              <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <UserCircle className="text-brand-gold" size={18} />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Vendor Contact Profile</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Address</span>
                    <p className="text-sm font-bold text-slate-700">{currentLog.vendorAddress}</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">{currentLog.vendorCityStateZip}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Phone Number</span>
                    <p className="text-sm font-bold text-slate-700">{currentLog.vendorPhone}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

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

      {/* ========================================================================= */}
      {/* ISOLATED PDF COMPONENT - Cloned by react-to-print, safely hidden off-screen */}
      {/* ========================================================================= */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -9999 }}>
        <div 
          ref={printRef} 
          className="bg-white text-black font-sans w-[8.5in] p-[0.5in] leading-tight"
        >
          {/* Header Block */}
          <div className="relative mb-6 pb-4 border-b-2 border-black">
            <h1 className="text-center font-bold text-[18pt] tracking-tight uppercase text-black m-0">
              {currentLog.customer?.customerName || 'Customer'} Item Received Notification
            </h1>
            
            {/* Vendor strictly on Admin print */}
            {printMode === 'admin' && (
              <div className="absolute right-0 top-0 text-[10pt] font-black uppercase text-black">
                {currentLog.vendor}
              </div>
            )}
            
            <p className="text-center italic text-[11pt] text-gray-700 mt-4 m-0">
              <span className="font-bold text-black">Please Note:</span> This notice has been sent to you to advise you of item(s) which have been received at {currentLog.customer?.customerName || 'our facilities'}.
            </p>
          </div>

          {/* 2-Column Professional Layout */}
          <div className="flex flex-row justify-between gap-x-12 text-[11pt]">
            
            {/* LEFT COLUMN */}
            <div className="w-1/2 flex flex-col gap-y-4">
              <div className="flex items-start">
                <span className="w-36 font-bold text-black shrink-0">Item Code /<br/>Item Description:</span>
                <div className="flex-1">
                  <span className="font-bold block text-[13pt] text-black leading-none mb-1">{primaryItem.sku}</span>
                  <span className="font-bold block text-black mb-1">{primaryItem.name}</span>
                  {currentLog.lot !== 'N/A' && <span className="font-bold block text-black mt-1">Lot: {currentLog.lot}</span>}
                </div>
              </div>

              <div className="flex items-start mt-2">
                <span className="w-36 font-bold text-black shrink-0">Product Code:</span>
                <span className="flex-1 text-black">{primaryItem.category}</span>
              </div>

              <div className="flex items-start mt-2">
                <span className="w-36 font-bold text-black shrink-0">Receiver Type:</span>
                <span className="flex-1 uppercase text-black">REGULAR</span>
              </div>

              <div className="flex items-start mt-4">
                <span className="w-36 font-bold text-black shrink-0">Qty. Received:</span>
                <span className="flex-1 font-black text-[14pt] text-black leading-none">{currentLog.quantity?.toLocaleString() || 0}</span>
              </div>

              <div className="flex items-start mt-2 border-b border-dashed border-gray-300 pb-3">
                <span className="w-36 font-bold text-black shrink-0">Number of<br/>Cartons:</span>
                <span className="flex-1 text-black font-bold text-[12pt]">{currentLog.numberOfCartons?.toLocaleString() || 0}</span>
              </div>

              {/* Dynamic Carton Breakdown Render for PDF */}
              {primaryItem.cartonBreakdown.map((row, idx) => (
                <div key={idx} className="flex items-start py-0.5">
                  <span className="w-36 text-[10pt] text-gray-700 italic shrink-0">Breakdown {idx + 1}:</span>
                  <span className="flex-1 text-[10pt] text-black">{row.cartons} Cartons @ {row.unitsPerCarton} units</span>
                </div>
              ))}

              <div className="flex items-start mt-4 border-t border-gray-300 pt-3">
                <span className="w-36 font-bold text-black shrink-0">Total Weight:</span>
                <span className="flex-1 text-black">{calculatedTotalWeight} lbs</span>
              </div>

              <div className="flex items-start mt-2">
                <span className="w-36 font-bold text-black shrink-0">Comments:</span>
                <span className="flex-1 whitespace-pre-wrap text-black">{currentLog.description || ''}</span>
              </div>

              {/* ADMIN ONLY LEFT COLUMN */}
              {printMode === 'admin' && (
                <div className="mt-4 flex flex-col gap-y-4 border-t border-gray-300 pt-4">
                  <div className="flex items-start">
                    <span className="w-36 font-bold text-black shrink-0">Vendor Name:</span>
                    <span className="flex-1 uppercase text-black">{currentLog.vendor}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="w-36 font-bold text-black shrink-0">Address:</span>
                    <span className="flex-1 uppercase text-black">{currentLog.vendorAddress || 'ON FILE'}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="w-36 font-bold text-black shrink-0">City, State, ZIP:</span>
                    <span className="flex-1 uppercase text-black">{currentLog.vendorCityStateZip || 'ON FILE'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="w-1/2 flex flex-col gap-y-4">
              <div className="flex items-start">
                <span className="w-40 font-bold text-black shrink-0">Date Received:</span>
                <span className="flex-1 font-bold text-[11pt] text-black leading-none">
                  {new Date(currentLog.dateReceived).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                </span>
              </div>

              <div className="flex items-start mt-2">
                <span className="w-40 font-bold text-black shrink-0">Intermediate Code:</span>
                <span className="flex-1 text-black">{primaryItem.division}</span>
              </div>

              <div className="flex items-start mt-2">
                <span className="w-40 font-bold text-black shrink-0">Receiver<br/>Description:</span>
                <span className="flex-1 text-black">{currentLog.description2 || ''}</span>
              </div>

              <div className="flex items-start mt-[28px]">
                <span className="w-40 font-bold text-black shrink-0">Number Of Skids:</span>
                <span className="flex-1 text-black">{currentLog.skids || 0}</span>
              </div>

              <div className="flex items-start mt-[10px]">
                <span className="w-40 font-bold text-black shrink-0">Carrier:</span>
                <span className="flex-1 uppercase text-black">{currentLog.carrier || ''}</span>
              </div>

              {/* ADMIN ONLY RIGHT COLUMN */}
              {printMode === 'admin' && (
                <div className="mt-[42px] flex flex-col gap-y-4 border-t border-gray-300 pt-4">
                  <div className="flex items-start">
                    <span className="w-40 font-bold text-black shrink-0">Address cont'd:</span>
                    <span className="flex-1 uppercase text-black">ON FILE</span>
                  </div>
                  <div className="flex items-start mt-[2px]">
                    <span className="w-40 font-bold text-black shrink-0">Phone:</span>
                    <span className="flex-1 uppercase text-black">{currentLog.vendorPhone || 'ON FILE'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}