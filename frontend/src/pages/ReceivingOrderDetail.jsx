import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import html2pdf from 'html2pdf.js';
import { toast } from 'sonner';
import { 
  ArrowLeft, FileText, CheckCircle2, 
  MapPin, Weight, Truck, Loader2,
  Package, ChevronDown, UserCircle, Printer, Save, Check, Send, UploadCloud, X
} from 'lucide-react';

import { fetchReceivingById, clearCurrentReceivingLog, sendReceivingEmail } from '../store/slices/receivingSlice';
import { fetchUsers } from '../store/slices/userSlice'; 

const generateLocalId = () => `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const downloadBase64PDF = (base64Data, filename) => {
  try {
    let cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    while (cleanBase64.length % 4 > 0) cleanBase64 += '=';
    
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error("Failed to decode Base64 PDF:", error);
    throw new Error("Invalid PDF data format.");
  }
};

export default function ReceivingOrderDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();

  const { currentLog, currentLogStatus, error } = useSelector(state => state.receiving || {});
  const { items: allUsers = [], status: usersStatus } = useSelector(state => state.users || {}); 

  // --- Print & PDF States ---
  const printRef = useRef(null);
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [printMode, setPrintMode] = useState('admin'); 
  
  // --- 3-Step Modal States ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState('');

  // Fetch receiving log and users on mount
  useEffect(() => {
    if (id) dispatch(fetchReceivingById(id));
    if (usersStatus === 'idle') dispatch(fetchUsers());
    
    return () => dispatch(clearCurrentReceivingLog());
  }, [id, dispatch, usersStatus]);

  const enrichedItems = useMemo(() => {
    if (!currentLog) return [];
    const qty = Number(currentLog.quantity) || 0;
    
    const breakdown = currentLog.cartonBreakdown?.length > 0 
      ? currentLog.cartonBreakdown 
      : [{ cartons: currentLog.numberOfCartons || 0, unitsPerCarton: currentLog.unitsPerCarton || 0, weightPerCarton: 0 }];
    
    const totalWgt = Number(currentLog.totalWeight) || breakdown.reduce((sum, b) => sum + ((Number(b.cartons)||0) * (Number(b.weightPerCarton)||0)), 0) || (qty * Number(currentLog.unitWeight || 0));

    const inv = currentLog.inventoryItem || {};
    const getCatName = (cat) => typeof cat === 'object' && cat !== null ? cat.categoryName : (cat || '');

    return [{
      id: currentLog._id,
      name: inv.itemName || inv.description || 'Unknown Item',
      sku: inv.sku || inv.productCode || 'N/A',
      division: inv.division?.divisionName || inv.division || 'Unassigned Division',
      category1: getCatName(inv.category1),
      category2: getCatName(inv.category2),
      category3: getCatName(inv.category3),
      category: getCatName(inv.category1) || 'Unassigned Category', 
      description1: inv.description || inv.itemName || '—',
      description2: inv.description2 || '—',
      cartonBreakdown: breakdown,
      totalCartons: currentLog.numberOfCartons || 0,
      qty: qty,
      received: qty,
      totalLineWeight: totalWgt,
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

  // --- DYNAMIC PORTAL USERS ---
  const portalUsers = useMemo(() => {
    const options = [];
    if (!currentLog?.customer) return options;

    const currentCustomerId = currentLog.customer._id || currentLog.customer;

    if (allUsers && allUsers.length > 0) {
      const associatedUsers = allUsers.filter(user => {
        const userCustomerId = user.customer?._id || user.customer;
        return user.portal === 'order' && userCustomerId === currentCustomerId;
      });

      associatedUsers.forEach(user => {
        if (!options.find(opt => opt.email === user.email)) {
          options.push({
            id: user._id,
            name: user.name,
            email: user.email,
            role: 'Order Portal User'
          });
        }
      });
    }
    return options;
  }, [currentLog, allUsers]);

  // --- Print Handling (react-to-print) ---
  const handlePrintAction = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Receiving-Receipt-${currentLog?.receivingId || id}`,
    pageStyle: `@page { size: letter; margin: 0.5in; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`,
  });

  const handlePrintTrigger = (mode) => {
    setPrintMode(mode);
    setShowPrintMenu(false);
    setTimeout(() => { handlePrintAction(); }, 150);
  };

  // --- 3-STEP MODAL ACTIONS ---
  const openShareModal = () => {
    setStep(1);
    setGeneratedPdfBlob(null);
    setSelectedEmail(portalUsers.length > 0 ? portalUsers[0].email : ''); 
    setIsModalOpen(true);
  };

  const handleGeneratePdf = async () => {
    setIsProcessing(true);
    try {
      setPrintMode('customer'); // Ensure customer view for email
      await new Promise(resolve => setTimeout(resolve, 300)); // Allow DOM to re-render

      const element = printRef.current;
      const opt = {
        margin: 0.5,
        filename: `Receiving_Receipt_${currentLog.receivingId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      setGeneratedPdfBlob(pdfBlob);
      setStep(2); 
    } catch (err) {
      toast.error('Failed to generate PDF document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDispatchEmail = async () => {
    if (!selectedEmail) {
      toast.error('Please select an email recipient.');
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading('Uploading to S3 and dispatching email...');

    try {
      const formData = new FormData();
      formData.append('pdfDocument', generatedPdfBlob, `Receiving_Receipt_${currentLog.receivingId}.pdf`);
      formData.append('recipientEmail', selectedEmail); 

      await dispatch(sendReceivingEmail({ id, formData })).unwrap();

      toast.success('Success! PDF saved to S3 and email dispatched.', { id: toastId });
      setIsModalOpen(false);
    } catch (err) {
      toast.error(`Dispatch failed: ${err}`, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
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

  const primaryItem = enrichedItems[0] || {};
  
  // CRITICAL FIX: Safe extraction of relational fields for React components
  const safeVendorName = currentLog.vendor?.vendorName || currentLog.fallbackVendor || '';
  const safeCarrierName = currentLog.carrier?.carrierName || currentLog.fallbackCarrier || '';

  return (
    <>
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 max-w-[1500px] mx-auto p-6 pb-20">
        
        {/* HEADER & ACTION BUTTONS */}
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
                Date: {new Date(currentLog.dateReceived).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={openShareModal} 
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black shadow-sm transition-all active:scale-95"
            >
              <Save size={16} /> Save & Send PDF
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowPrintMenu(!showPrintMenu)} 
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-brand-gold rounded-xl text-sm font-black shadow-xl shadow-slate-900/20 transition-all active:scale-95 uppercase tracking-wider"
              >
                <Printer size={16} /> Print <ChevronDown size={14} className="ml-1" />
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Customer', val: currentLog.customer?.customerName || '—', icon: FileText },
            { label: 'Carrier', val: safeCarrierName || '—', icon: Truck },
            { label: 'Vendor', val: safeVendorName || '—', icon: UserCircle },
            { label: 'Total Weight', val: `${calculatedTotalWeight} lbs`, icon: Weight }, 
            { label: 'Skids Rcvd', val: `${currentLog.skids || 0} Skids`, icon: Package },
          ].map((stat, i) => (
            <div key={i} className="bg-white/60 backdrop-blur-xl border border-white/80 p-5 rounded-3xl shadow-sm flex items-center gap-3 transition-colors hover:bg-white/80">
              <div className="p-2.5 bg-slate-100 rounded-xl text-brand-gold shrink-0 border border-slate-200/60"><stat.icon size={20} /></div>
              <div className="overflow-hidden">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate mb-0.5">{stat.label}</p>
                <p className="text-sm font-black text-slate-900 truncate" title={stat.val}>{stat.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Storage Locations Banner */}
        <div className="bg-white/80 backdrop-blur-2xl border border-emerald-100 p-5 sm:p-6 rounded-[2rem] shadow-sm flex flex-col md:flex-row md:items-center gap-4 sm:gap-6 relative overflow-hidden">
          <div className="absolute top-1/2 -translate-y-1/2 right-0 p-8 opacity-5 pointer-events-none">
            <MapPin size={120} />
          </div>
          
          <div className="flex items-center gap-4 shrink-0 z-10">
            <div className="p-4 bg-emerald-100/50 rounded-2xl text-emerald-600 border border-emerald-200/50">
              <MapPin size={24} />
            </div>
            <div>
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Assigned Storage Locations</h2>
              <p className="text-sm font-bold text-slate-900 mt-0.5">Where to find these items</p>
            </div>
          </div>

          <div className="hidden md:block w-px h-12 bg-slate-200 mx-2 z-10"></div>

          <div className="flex flex-wrap gap-2 sm:gap-3 items-center flex-1 z-10">
            {currentLog.locations?.length > 0 ? (
              currentLog.locations.map((loc, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group cursor-default">
                  <MapPin size={14} className="text-emerald-500 group-hover:animate-bounce" />
                  <span className="text-sm font-black text-slate-700">{loc?.designation || loc}</span>
                  {loc?.storageCategory && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-l border-slate-200 pl-2 ml-1">
                      {loc.storageCategory}
                    </span>
                  )}
                </div>
              ))
            ) : currentLog.location?.designation ? (
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
                <MapPin size={14} className="text-emerald-500" />
                <span className="text-sm font-black text-slate-700">{currentLog.location.designation}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 border-dashed px-4 py-2 rounded-xl text-slate-400 italic text-sm font-bold">
                Unassigned Location
              </div>
            )}
          </div>
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
                              <div key={idx} className="bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg w-max whitespace-nowrap text-[10px] shadow-sm">
                                {b.cartons} <span className="text-slate-400 mx-0.5 font-normal">ctn ×</span> {b.unitsPerCarton} <span className="text-slate-400 mx-0.5 font-normal">u</span>
                                <span className="text-slate-300 mx-1.5">|</span>
                                <span className="text-emerald-700">{b.weightPerCarton || 0} lbs</span>
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
                          {item.totalLineWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                <UserCircle className="text-brand-gold" size={18} />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Vendor Contact Profile</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Address</span>
                  <p className="text-sm font-bold text-slate-700">{currentLog.vendorAddress || 'Unspecified'}</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">{currentLog.vendorCityStateZip || 'Unspecified'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Phone Number</span>
                  <p className="text-sm font-bold text-slate-700">{currentLog.vendorPhone || 'Unspecified'}</p>
                </div>
              </div>
            </div>
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
      {/* 3-STEP UPLOAD & EMAIL MODAL */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isProcessing && setIsModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900">Dispatch Document</h2>
              <button onClick={() => !isProcessing && setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Stepper Header */}
            <div className="flex items-center justify-between px-10 py-5 bg-slate-50/50 border-b border-slate-100">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex flex-col items-center gap-2 relative z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-colors ${step >= num ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {step > num ? <Check size={14} /> : num}
                  </div>
                </div>
              ))}
              <div className="absolute left-16 right-16 top-[66px] h-0.5 bg-slate-200 z-0">
                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(step - 1) * 50}%` }} />
              </div>
            </div>

            <div className="p-8">
              {/* STEP 1: Generate PDF */}
              {step === 1 && (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <FileText size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Generate Customer PDF</h3>
                    <p className="text-sm text-slate-500 mt-1">We need to compile the clean, vendor-safe version of this receipt before sending.</p>
                  </div>
                  <button 
                    onClick={handleGeneratePdf}
                    disabled={isProcessing}
                    className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-slate-800 flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Printer size={18} />}
                    {isProcessing ? 'Compiling Document...' : 'Compile Document'}
                  </button>
                </div>
              )}

              {/* STEP 2: Select Recipient */}
              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Select Recipient</h3>
                    <p className="text-sm text-slate-500 mt-1">Choose an order portal user to receive this document.</p>
                  </div>
                  
                  {portalUsers.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm font-bold text-center">
                      No portal users found for this customer. Please set a contact email in the customer settings.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {portalUsers.map((user, idx) => (
                        <label key={user.id || idx} className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedEmail === user.email ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100 hover:border-slate-200'}`}>
                          <div className="flex items-center gap-3">
                            <input 
                              type="radio" 
                              name="recipient" 
                              value={user.email} 
                              checked={selectedEmail === user.email}
                              onChange={(e) => setSelectedEmail(e.target.value)}
                              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                              <p className="text-sm font-bold text-slate-900">{user.name}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100">{user.role}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Back</button>
                    <button onClick={() => setStep(3)} disabled={!selectedEmail} className="flex-[2] py-3.5 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md transition-colors disabled:opacity-50">Continue to Dispatch</button>
                  </div>
                </div>
              )}

              {/* STEP 3: Confirm & Dispatch */}
              {step === 3 && (
                <div className="text-center space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 relative">
                    <UploadCloud size={32} />
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                      <div className="bg-emerald-500 text-white rounded-full p-1"><Check size={12} /></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Ready to Send</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-[250px] mx-auto">
                      The PDF is ready to be uploaded to AWS S3 and emailed to <strong className="text-slate-900">{selectedEmail}</strong>.
                    </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setStep(2)} disabled={isProcessing} className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50">Back</button>
                    <button 
                      onClick={handleDispatchEmail}
                      disabled={isProcessing}
                      className="flex-[2] py-3.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-70"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                      {isProcessing ? 'Processing...' : 'Upload & Send Email'}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ISOLATED PDF COMPONENT - PURE INLINE CSS ONLY TO PREVENT HTML2CANVAS CRASH */}
      {/* ========================================================================= */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -9999 }}>
        <div 
          ref={printRef} 
          style={{ 
            backgroundColor: '#ffffff', 
            color: '#000000', 
            fontFamily: 'Helvetica Neue, Arial, sans-serif', 
            width: '8.5in', 
            padding: '0.5in', 
            boxSizing: 'border-box' 
          }}
        >
          {/* Header Block */}
          <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #000000', textAlign: 'center', position: 'relative' }}>
            <h1 style={{ fontSize: '24pt', fontWeight: '900', textTransform: 'uppercase', margin: '0', letterSpacing: '-0.5px' }}>
              {primaryItem?.division || 'UNASSIGNED DIVISION'}
            </h1>
            
            {/* Vendor strictly on Admin print */}
            {printMode === 'admin' && safeVendorName && (
              <div style={{ position: 'absolute', right: '0', top: '0', fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
                {safeVendorName}
              </div>
            )}
          </div>

          {/* 2-Column Professional Layout */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11pt' }}>
            
            {/* LEFT COLUMN */}
            <div style={{ width: '48%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ width: '130px', fontWeight: 'bold', flexShrink: 0 }}>Item Code:</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 'bold', fontSize: '13pt', display: 'block', marginBottom: '4px' }}>{primaryItem?.sku || 'N/A'}</span>
                  {currentLog?.lot && currentLog.lot !== 'N/A' && <span style={{ display: 'block', fontWeight: 'bold' }}>Lot: {currentLog.lot}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ width: '130px', fontWeight: 'bold', flexShrink: 0 }}>Categories:</span>
                <span style={{ flex: 1 }}>
                  {[primaryItem?.category1, primaryItem?.category2, primaryItem?.category3].filter(Boolean).join(', ') || 'None'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ width: '130px', fontWeight: 'bold', flexShrink: 0 }}>Receiver Type:</span>
                <span style={{ flex: 1, textTransform: 'uppercase' }}>REGULAR</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '16px' }}>
                <span style={{ width: '130px', fontWeight: 'bold', flexShrink: 0 }}>Qty. Received:</span>
                <span style={{ flex: 1, fontWeight: '900', fontSize: '14pt' }}>{currentLog?.quantity?.toLocaleString() || 0}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '8px', borderBottom: '1px dashed #d1d5db', paddingBottom: '12px' }}>
                <span style={{ width: '130px', fontWeight: 'bold', flexShrink: 0 }}>Number of<br/>Cartons:</span>
                <span style={{ flex: 1, fontWeight: 'bold', fontSize: '12pt' }}>{currentLog?.numberOfCartons?.toLocaleString() || 0}</span>
              </div>

              {primaryItem?.cartonBreakdown?.map((row, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', padding: '4px 0' }}>
                  <span style={{ width: '130px', fontSize: '10pt', color: '#6b7280', fontStyle: 'italic', flexShrink: 0 }}>Breakdown {idx + 1}:</span>
                  <span style={{ flex: 1, fontSize: '10pt' }}>
                    {row.cartons} Cartons @ {row.unitsPerCarton} units <span style={{ color: '#6b7280', fontStyle: 'italic', marginLeft: '4px' }}>({row.weightPerCarton || 0} lbs/ctn)</span>
                  </span>
                </div>
              ))}

              <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '12px', borderTop: '1px solid #d1d5db', paddingTop: '12px' }}>
                <span style={{ width: '130px', fontWeight: 'bold', flexShrink: 0 }}>Total Weight:</span>
                <span style={{ flex: 1, fontWeight: 'bold', fontSize: '13pt' }}>{calculatedTotalWeight} lbs</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '8px' }}>
                <span style={{ width: '130px', fontWeight: 'bold', flexShrink: 0 }}>Comments:</span>
                <span style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{currentLog?.description || ''}</span>
              </div>

              {/* ADMIN ONLY LEFT COLUMN */}
              {printMode === 'admin' && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #d1d5db', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: '130px', fontWeight: 'bold', flexShrink: 0 }}>Vendor Name:</span>
                    <span style={{ flex: 1, textTransform: 'uppercase' }}>{safeVendorName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: '130px', fontWeight: 'bold', flexShrink: 0 }}>Address:</span>
                    <span style={{ flex: 1, textTransform: 'uppercase' }}>{currentLog?.vendorAddress || 'ON FILE'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: '130px', fontWeight: 'bold', flexShrink: 0 }}>City, State, ZIP:</span>
                    <span style={{ flex: 1, textTransform: 'uppercase' }}>{currentLog?.vendorCityStateZip || 'ON FILE'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ width: '48%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ width: '140px', fontWeight: 'bold', flexShrink: 0 }}>Date Received:</span>
                <span style={{ flex: 1, fontWeight: 'bold', fontSize: '11pt' }}>
                  {currentLog?.dateReceived ? new Date(currentLog.dateReceived).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '8px' }}>
                <span style={{ width: '140px', fontWeight: 'bold', flexShrink: 0 }}>Description 1:</span>
                <span style={{ flex: 1 }}>{primaryItem?.description1}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '8px' }}>
                <span style={{ width: '140px', fontWeight: 'bold', flexShrink: 0 }}>Description 2:</span>
                <span style={{ flex: 1 }}>{primaryItem?.description2}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '30px' }}>
                <span style={{ width: '140px', fontWeight: 'bold', flexShrink: 0 }}>Number Of Skids:</span>
                <span style={{ flex: 1 }}>{currentLog?.skids || 0}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '8px' }}>
                <span style={{ width: '140px', fontWeight: 'bold', flexShrink: 0 }}>Carrier:</span>
                <span style={{ flex: 1, textTransform: 'uppercase' }}>{safeCarrierName}</span>
              </div>

              {/* ADMIN ONLY RIGHT COLUMN */}
              {printMode === 'admin' && (
                <div style={{ marginTop: '80px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #d1d5db', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: '140px', fontWeight: 'bold', flexShrink: 0 }}>Address cont'd:</span>
                    <span style={{ flex: 1, textTransform: 'uppercase' }}>ON FILE</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: '140px', fontWeight: 'bold', flexShrink: 0 }}>Phone:</span>
                    <span style={{ flex: 1 }}>{currentLog?.vendorPhone || ''}</span>
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
