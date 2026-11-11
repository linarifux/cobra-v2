import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ArrowLeft, Loader2, AlertTriangle, User,
  DollarSign, Code, LayoutList, MapPin, 
  RefreshCw, Truck, Link as LinkIcon, ShoppingBag, Mail, Hash, Receipt, ExternalLink,
  FileText, Building2
} from 'lucide-react';
import { fetchNetSuiteRecordById, clearSelectedRecord } from '../store/slices/netSuiteSlice';

const parseNetSuiteError = (err) => {
  if (!err) return 'The requested record could not be found.';
  if (typeof err === 'string') return err;
  
  if (err['o:errorDetails'] && Array.isArray(err['o:errorDetails']) && err['o:errorDetails'][0]) {
    return err['o:errorDetails'][0].detail || err['o:errorDetails'][0]['o:errorCode'] || 'NetSuite API validation failed.';
  }
  
  if (err.message) return err.message;
  if (err.title) return `${err.title}: ${err.status || ''}`;
  if (err.error) return typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
  
  return 'A complex data error occurred. Check console for details.';
};

const getTrackingUrl = (carrierName, trackingNumber) => {
  const carrier = carrierName?.toLowerCase() || '';
  if (carrier.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  if (carrier.includes('ups')) return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  if (carrier.includes('usps') || carrier.includes('postal')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  if (carrier.includes('dhl')) return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`;
  return `https://www.google.com/search?q=${trackingNumber}`;
};

export default function NetSuiteOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [viewMode, setViewMode] = useState('visual'); 

  const { 
    selectedRecord, 
    recordsByRecordType = {}, 
    recordDetailsCache = {}, 
    status, 
    error 
  } = useSelector((state) => state.netsuite || {});

  // FIX: Look in the unified 'orders' cache
  const cachedDetail = recordDetailsCache[`orders:${id}`];
  const listPreview = useMemo(() => {
    const list = recordsByRecordType.orders || [];
    return list.find((item) => String(item.id) === String(id));
  }, [recordsByRecordType.orders, id]);

  const record = selectedRecord || cachedDetail || listPreview || null;

  const loadOrderDetails = (forceRefresh = false) => {
    if (id) {
      // FIX: Hit the new smart unified endpoint
      dispatch(fetchNetSuiteRecordById({ recordType: 'orders', id, forceRefresh }));
    }
  };

  useEffect(() => {
    loadOrderDetails(false);
    return () => dispatch(clearSelectedRecord());
  }, [dispatch, id]);

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-6rem)]">
        <Loader2 className="animate-spin text-brand-gold mb-4" size={48} />
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Fetching Full Order Details...</p>
      </div>
    );
  }

  if (status === 'failed' && !selectedRecord && !cachedDetail) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-6rem)] p-6">
        <div className="bg-red-50 text-red-600 p-8 rounded-3xl text-center border border-red-200 max-w-md w-full shadow-lg">
          <AlertTriangle size={40} className="mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-black tracking-tight mb-2">Failed to Load Record</h3>
          <p className="text-sm font-medium opacity-80 mb-6 break-words">{parseNetSuiteError(error)}</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => navigate(-1)} className="px-6 py-2.5 bg-white border border-red-200 hover:bg-red-100 text-red-600 rounded-[10px] text-xs font-bold transition-all">Go Back</button>
            <button onClick={() => loadOrderDetails(true)} className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-[10px] text-xs font-bold transition-all">Retry Connection</button>
          </div>
        </div>
      </div>
    );
  }

  if (!record) return null;

  // --- DYNAMIC DATA EXTRACTION (Handles both SO and TO) ---
  const isTransfer = record.transactionNumber?.startsWith('TRNFRORD');
  const orderTypeStr = isTransfer ? 'TRANSFER' : 'WEBORDER';

  // Customer vs Transfer Location
  const customerName = record.entity?.refName; 
  const destinationLocation = record.transferLocation?.refName;

  // Employee vs Sales Rep
  const email = record.email || record.custbody114 || 'No email provided';
  const assignedRep = record.salesRep?.refName || record.employee?.refName || 'Unassigned';
  const source = record.source?.refName || record.originator || 'Direct/System';
  
  // Status Formatting
  const rawStatus = record.status?.refName;
  let orderStatus = rawStatus ? rawStatus.replace(/^(Sales Order|Transfer Order)\s*:\s*/i, '').trim() : '';
  if (orderStatus.toLowerCase() === 'pending fulfillment') orderStatus = 'PENDING';
  
  // Dates
  const orderDate = record.tranDate;
  const formattedDate = orderDate ? new Date(orderDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '-';
  const shipDate = record.actualShipDate;
  const formattedShipDate = shipDate ? new Date(shipDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending Fulfillment';

  // Financials (Transfers usually have 0)
  const subTotal = record.subtotal ?? 0;
  const shippingCost = record.shippingCost ?? 0;
  const discountTotal = record.discountTotal ?? 0;
  const taxTotal = record.taxTotal ?? 0;
  const totalAmount = record.total ?? 0;

  // Logistics
  const shipMethod = record.shipMethod?.refName;
  const trackingNumbers = record.linkedTrackingNumbers;
  let trackingList = [];
  if (trackingNumbers && trackingNumbers !== '-') {
    trackingList = Array.isArray(trackingNumbers) ? trackingNumbers : trackingNumbers?.split(/[\s,]+/).filter(Boolean);
  }

  const externalId = record.externalId || '-';
  const cleanExternalId = externalId !== '-' ? externalId.replace(/^[^#]*/, '') : '-';
  const poNumber = record.otherRefNum || '-';

  const shipAddress = record.shippingAddress_text || record.shippingAddress?.addrText;
  const billAddress = record.billingAddress_text || record.billingAddress?.addrText || 'N/A for Transfers';

  const lineItems = record.item?.items || [];

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Order #{id}</h1>
              <span className={`px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-widest border shadow-sm ${
                orderStatus.toLowerCase() === 'pending' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
              }`}>
                {orderStatus}
              </span>
              <span className={`border px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-widest ${isTransfer ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                {orderTypeStr}
              </span>
              <span className="bg-slate-100 text-blue-600 border border-slate-200 px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-widest">
                {record.tranId}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-1">{formattedDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-xl">
            <button onClick={() => setViewMode('visual')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${viewMode === 'visual' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900'}`}>
              <LayoutList size={14} /> View
            </button>
            <button onClick={() => setViewMode('raw')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${viewMode === 'raw' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900'}`}>
              <Code size={14} /> JSON
            </button>
          </div>
          <button onClick={() => loadOrderDetails(true)} disabled={status === 'loading'} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-brand-gold transition-all shadow-sm active:scale-95 disabled:opacity-50">
            <RefreshCw size={16} className={status === 'loading' ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {viewMode === 'visual' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* MAIN CONTENT COLUMN (Left 2/3) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Metrics Row */}
            <div className={`grid gap-4 ${isTransfer ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
              {!isTransfer && (
                <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5"><DollarSign size={14}/> Total Amount</span>
                  <span className="text-xl font-black text-slate-900">${Number(totalAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5"><Hash size={14}/> Source Order</span>
                <span className="text-sm font-bold text-slate-900">{cleanExternalId}</span>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5"><Receipt size={14}/> PO Number</span>
                <span className="text-sm font-bold text-slate-900">{poNumber}</span>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5"><LinkIcon size={14}/> Source System</span>
                <span className="text-sm font-bold text-slate-900 truncate">{source}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="text-brand-gold" size={18} />
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Line Items <span className="text-slate-400 ml-1">({lineItems?.length})</span></h2>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead className="bg-slate-50/50">
                    <tr className="text-[10px] uppercase font-bold text-slate-400 tracking-widest border-b border-slate-100">
                      <th className="py-4 pl-6 pr-4">Item</th>
                      <th className="py-4 px-4">Description</th>
                      <th className="py-4 px-3 text-center" title="Quantity Ordered">Ord</th>
                      <th className="py-4 px-3 text-center" title="Quantity Shipped / Fulfilled">Ship</th>
                      <th className="py-4 px-3 text-center" title="Quantity Available">Avail</th>
                      <th className="py-4 px-3 text-center" title="Quantity Backordered">B/O</th>
                      {!isTransfer && <th className="py-4 px-4 text-right">Rate</th>}
                      {!isTransfer && <th className="py-4 pr-6 pl-4 text-right">Amount</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {lineItems?.length > 0 ? (
                      lineItems.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pl-6 pr-4 font-bold text-slate-800">{line.item?.refName || line.item?.id || `Item ${idx + 1}`}</td>
                          <td className="py-4 px-4 text-slate-500 whitespace-normal min-w-[150px] max-w-[250px] leading-relaxed">{line.description || '-'}</td>
                          
                          {/* Fulfillment Metrics */}
                          <td className="py-4 px-3 text-center font-black text-slate-700 bg-slate-50/50">{line.quantity || 0}</td>
                          <td className="py-4 px-3 text-center font-bold text-emerald-600">{line.quantityFulfilled ?? line.quantityBilled ?? 0}</td>
                          <td className="py-4 px-3 text-center font-semibold text-slate-500">{line.quantityAvailable ?? 0}</td>
                          <td className="py-4 px-3 text-center font-semibold text-amber-500">{line.quantityBackOrdered ?? 0}</td>
                          
                          {!isTransfer && <td className="py-4 px-4 text-right text-slate-500">${Number(line.rate || 0).toFixed(2)}</td>}
                          {!isTransfer && <td className="py-4 pr-6 pl-4 text-right font-black text-slate-900">${Number(line.amount || 0).toFixed(2)}</td>}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={isTransfer ? "6" : "8"} className="p-10 text-center text-slate-400">
                           No line items found on this order.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Financial Totals Footer (Only for Sales Orders) */}
              {!isTransfer && (
                <div className="bg-slate-50/80 p-5 border-t border-slate-100 flex flex-col items-end space-y-2 text-xs">
                  <div className="flex justify-between w-48 text-slate-500"><span className="font-medium">Subtotal</span> <span>${Number(subTotal).toFixed(2)}</span></div>
                  {discountTotal < 0 && <div className="flex justify-between w-48 text-emerald-500"><span className="font-medium">Discount</span> <span>-${Math.abs(discountTotal).toFixed(2)}</span></div>}
                  <div className="flex justify-between w-48 text-slate-500"><span className="font-medium">Shipping</span> <span>${Number(shippingCost).toFixed(2)}</span></div>
                  <div className="flex justify-between w-48 text-slate-500"><span className="font-medium">Tax</span> <span>${Number(taxTotal).toFixed(2)}</span></div>
                  <div className="flex justify-between w-48 text-slate-900 pt-2 border-t border-slate-200 mt-2"><span className="font-black">Total</span> <span className="font-black text-sm">${Number(totalAmount).toFixed(2)}</span></div>
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR COLUMN (Right 1/3) */}
          <div className="space-y-6">
            
            {/* Dynamic Customer / Destination Box */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                {isTransfer ? <><Building2 size={14}/> Destination Location</> : <><User size={14}/> Customer Details</>}
              </h3>
              <p className="text-sm font-bold text-slate-900 mb-1">{isTransfer ? destinationLocation : customerName}</p>
              
              {!isTransfer && (
                <p className="text-xs font-medium text-blue-600 flex items-center gap-1.5 mb-4 hover:underline cursor-pointer"><Mail size={12}/> {email}</p>
              )}
              
              <div className={`pt-4 border-t border-slate-100 ${isTransfer && 'mt-4'}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{isTransfer ? 'Assigned Employee' : 'Sales Rep'}</p>
                <p className="text-xs font-semibold text-slate-700">{assignedRep}</p>
              </div>
            </div>

            {/* Logistics Box */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><Truck size={14}/> Fulfillment</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Status</p>
                  <p className="text-xs font-bold text-slate-900">{formattedShipDate === 'Pending Fulfillment' ? 'Unshipped' : 'Shipped'}</p>
                </div>
                
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Ship Date</p>
                  <p className="text-xs font-bold text-slate-900">{formattedShipDate}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Carrier Method</p>
                  <p className="text-xs font-bold text-slate-900">{shipMethod || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Tracking Numbers</p>
                  {trackingList?.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {trackingList?.map((track, i) => (
                        <a 
                          key={i} 
                          href={getTrackingUrl(shipMethod, track)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center justify-between bg-blue-50 border border-blue-100 hover:border-blue-300 text-blue-700 px-3 py-1.5 rounded-[8px] text-xs font-mono font-medium transition-all"
                          title="Click to track package"
                        >
                          <span className="truncate">{track}</span>
                          <ExternalLink size={12} className="text-blue-400 group-hover:text-blue-600 shrink-0" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-slate-400 italic">No tracking generated</p>
                  )}
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-6">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2"><MapPin size={14}/> Shipping Address</h3>
                <p className="text-xs font-medium text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  {shipAddress}
                </p>
              </div>
              
              {!isTransfer && (
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2"><FileText size={14}/> Billing Address</h3>
                  <p className="text-xs font-medium text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    {billAddress}
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-[2rem] overflow-hidden shadow-xl border border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Code size={14}/> Raw REST Payload</span>
          </div>
          <div className="p-6 overflow-auto max-h-[75vh] custom-scrollbar">
            <pre className="text-[11px] leading-5 font-mono text-emerald-400 whitespace-pre-wrap break-words">
              {JSON.stringify(record, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}