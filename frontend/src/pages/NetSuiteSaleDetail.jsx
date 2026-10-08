import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Loader2, AlertTriangle, FileText, User, Calendar, DollarSign, Package, Code, LayoutList, MapPin } from 'lucide-react';
import { fetchNetSuiteRecordById, clearSelectedRecord } from '../store/slices/netSuiteSlice';

export default function NetSuiteSaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Local state to toggle between visual data and raw JSON payload
  const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'raw'

  // Redux state
  const { selectedRecord: record, status, error } = useSelector((state) => state.netsuite || {});

  useEffect(() => {
    if (id) {
      dispatch(fetchNetSuiteRecordById({ recordType: 'salesOrder', id }));
    }
    
    // Cleanup when leaving the page so the old record doesn't flash on the next visit
    return () => {
      dispatch(clearSelectedRecord());
    };
  }, [dispatch, id]);

  // --- RENDER HELPERS ---
  if (status === 'loading' || (!record && status === 'idle')) {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-6rem)]">
        <Loader2 className="animate-spin text-brand-gold mb-4" size={48} />
        <p className="text-sm font-black uppercase tracking-widest text-slate-500">Fetching NetSuite Order...</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-6rem)] p-6">
        <div className="bg-red-50 text-red-600 p-8 rounded-3xl text-center border border-red-200 max-w-md w-full shadow-lg">
          <AlertTriangle size={40} className="mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-black tracking-tight mb-2">Failed to Load Record</h3>
          <p className="text-sm font-medium opacity-80 mb-6">{error || 'The requested record could not be found.'}</p>
          <button 
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!record) return null;

  // Extract fields matching the provided JSON structure
  const tranId = record.tranId || record.id || 'N/A';
  const customerName = record.entity?.refName || 'Unknown Customer';
  const orderStatus = record.status?.refName || 'Unknown';
  const totalAmount = record.total || 0;
  const orderDate = record.tranDate ? new Date(record.tranDate).toLocaleDateString() : 'N/A';
  
  // Custom Fields from JSON
  const email = record.email || record.custbody53 || 'N/A';
  const orderType = record.custbody_pet_salesorder_type?.refName || 'Standard';
  const trackingMemo = record.memo || 'No notes provided.';
  const shippingAddress = record.shippingAddress_text || record.shipAddress || 'No shipping address provided.';

  // NetSuite line items usually exist under `item.items` in the REST API
  const lineItems = record.item?.items || [];

  return (
    <div className="max-w-[1200px] mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* 1. Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sales Order #{tranId}</h1>
              <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
                {orderStatus}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Internal ID: {record.id} • Type: {orderType}</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex bg-white/60 backdrop-blur-md border border-slate-200 p-1 rounded-xl shadow-sm">
          <button 
            onClick={() => setViewMode('visual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${viewMode === 'visual' ? 'bg-slate-900 text-brand-gold shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <LayoutList size={14} /> Formatted
          </button>
          <button 
            onClick={() => setViewMode('raw')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${viewMode === 'raw' ? 'bg-slate-900 text-brand-gold shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <Code size={14} /> Raw JSON
          </button>
        </div>
      </div>

      {viewMode === 'visual' ? (
        <>
          {/* 2. Quick Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/50 backdrop-blur-md border border-white/60 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <User size={16} /> <h3 className="text-[10px] font-black uppercase tracking-widest">Customer</h3>
              </div>
              <p className="text-sm font-black text-slate-900 truncate" title={customerName}>{customerName}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1 truncate" title={email}>{email}</p>
            </div>
            <div className="bg-white/50 backdrop-blur-md border border-white/60 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Calendar size={16} /> <h3 className="text-[10px] font-black uppercase tracking-widest">Date</h3>
              </div>
              <p className="text-lg font-black text-slate-900">{orderDate}</p>
            </div>
            <div className="bg-white/50 backdrop-blur-md border border-white/60 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <DollarSign size={16} /> <h3 className="text-[10px] font-black uppercase tracking-widest">Total</h3>
              </div>
              <p className="text-lg font-black text-slate-900">${Number(totalAmount).toFixed(2)}</p>
            </div>
            <div className="bg-white/50 backdrop-blur-md border border-white/60 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <MapPin size={16} /> <h3 className="text-[10px] font-black uppercase tracking-widest">Shipping To</h3>
              </div>
              <p className="text-xs font-medium text-slate-600 whitespace-pre-line leading-relaxed">{shippingAddress}</p>
            </div>
          </div>

          {/* 3. Line Items Table */}
          <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="p-6 border-b border-slate-200/60 bg-slate-50/50 flex items-center gap-3">
              <Package className="text-brand-gold" size={20} />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Line Items ({lineItems.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead className="bg-slate-50/80 border-b border-slate-200/60">
                  <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                    <th className="p-5">Item</th>
                    <th className="p-5">Description</th>
                    <th className="p-5 text-right">Quantity</th>
                    <th className="p-5 text-right">Rate</th>
                    <th className="p-5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {lineItems.length > 0 ? (
                    lineItems.map((line, idx) => (
                      <tr key={idx} className="hover:bg-white/80 transition-colors">
                        <td className="p-5 font-bold text-slate-800">{line.item?.refName || line.item?.id || `Item ${idx+1}`}</td>
                        <td className="p-5 text-slate-600 truncate max-w-[250px]">{line.description || '-'}</td>
                        <td className="p-5 text-right font-black text-slate-700">{line.quantity || 0}</td>
                        <td className="p-5 text-right text-slate-600">${Number(line.rate || 0).toFixed(2)}</td>
                        <td className="p-5 text-right font-bold text-slate-900">${Number(line.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-10 text-center text-slate-400">
                        <p className="text-sm font-black uppercase tracking-widest mb-1">No items found</p>
                        <p className="text-xs">Check the Raw JSON view if you believe this is an error.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* 4. Raw JSON Viewer */
        <div className="bg-slate-900 rounded-[2rem] overflow-hidden shadow-xl border border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Code size={14}/> Raw Payload
             </span>
          </div>
          <div className="p-6 overflow-auto max-h-[60vh] custom-scrollbar">
            <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-words">
              {JSON.stringify(record, null, 2)}
            </pre>
          </div>
        </div>
      )}

    </div>
  );
}