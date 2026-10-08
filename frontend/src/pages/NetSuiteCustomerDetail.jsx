import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ArrowLeft, Loader2, AlertTriangle, User, Mail, Phone, 
  Building, DollarSign, Code, LayoutList, MapPin, Briefcase, Calendar 
} from 'lucide-react';
import { fetchNetSuiteRecordById, clearSelectedRecord } from '../store/slices/netSuiteSlice';

export default function NetSuiteCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Local state to toggle between visual data and raw JSON payload
  const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'raw'

  // Redux state
  const { selectedRecord: record, status, error } = useSelector((state) => state.netsuite || {});

  useEffect(() => {
    if (id) {
      dispatch(fetchNetSuiteRecordById({ recordType: 'customer', id }));
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
        <p className="text-sm font-black uppercase tracking-widest text-slate-500">Fetching NetSuite Customer...</p>
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

  // Extract fields safely, mapping exactly to your JSON response
  const customerName = record.companyName || record.altName || record.entityId || 'Unknown Customer';
  const email = record.email || record.custentity12 || 'N/A'; // Checked custom email field fallback
  const phone = record.phone || record.mobilePhone || 'N/A';
  const customerStatus = record.entityStatus?.refName || record.entityStatus?.name || 'Unknown';
  const subsidiary = record.subsidiary?.refName || record.subsidiary?.name || 'N/A';
  const customerSince = record.dateCreated ? new Date(record.dateCreated).toLocaleDateString() : 'N/A';
  
  // Financials & Account Mapping
  const balance = record.balance || 0;
  // Fallback to specific custom field for credit limit if standard is null
  const creditLimit = record.creditLimit || record.custentity320 || 'No Limit'; 
  const terms = record.terms?.refName || 'None';
  const salesRep = record.salesRep?.refName || 'Unassigned';
  const priceLevel = record.priceLevel?.refName || 'Standard Retail';

  // Addresses 
  // NetSuite REST returns address books as an external link by default, not an inline array.
  // So we fallback to standard address fields and parse out the HTML <br> tags!
  let addresses = [];
  if (record.addressbookList?.addressbook) {
    addresses = Array.isArray(record.addressbookList.addressbook) 
      ? record.addressbookList.addressbook 
      : [record.addressbookList.addressbook];
  } else {
    // Populate faux address book from standard string addresses if the sublist wasn't expanded
    if (record.defaultAddress) {
      addresses.push({
        label: 'Default Address',
        addressbookAddress: { addrText: record.defaultAddress.replace(/<br>/g, ', ') },
        defaultShipping: true,
        defaultBilling: true
      });
    }
    // Check if there is a separate shipping address custom field that doesn't match default
    if (record.custentity_default_shipping_address && record.custentity_default_shipping_address !== record.defaultAddress) {
      addresses.push({
        label: 'Default Shipping',
        addressbookAddress: { addrText: record.custentity_default_shipping_address.replace(/<br>/g, ', ') },
        defaultShipping: true,
        defaultBilling: false
      });
    }
  }

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
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{customerName}</h1>
              <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
                {customerStatus}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
              Internal ID: {record.id} • Entity: {record.entityId || 'N/A'}
            </p>
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
                <Mail size={16} /> <h3 className="text-[10px] font-black uppercase tracking-widest">Email</h3>
              </div>
              <p className="text-sm font-black text-slate-900 truncate" title={email}>{email}</p>
            </div>
            
            <div className="bg-white/50 backdrop-blur-md border border-white/60 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Phone size={16} /> <h3 className="text-[10px] font-black uppercase tracking-widest">Phone</h3>
              </div>
              <p className="text-sm font-black text-slate-900">{phone}</p>
            </div>
            
            <div className="bg-white/50 backdrop-blur-md border border-white/60 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Building size={16} /> <h3 className="text-[10px] font-black uppercase tracking-widest">Subsidiary</h3>
              </div>
              <p className="text-sm font-black text-slate-900 truncate" title={subsidiary}>{subsidiary}</p>
            </div>
            
            <div className="bg-white/50 backdrop-blur-md border border-white/60 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <DollarSign size={16} /> <h3 className="text-[10px] font-black uppercase tracking-widest">Current Balance</h3>
              </div>
              <p className={`text-lg font-black ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                ${Number(balance).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 3. Account Details Panel */}
            <div className="lg:col-span-1 bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200/60">
                <Briefcase className="text-brand-gold" size={20} />
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Account Details</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Calendar size={12}/> Customer Since</p>
                  <p className="text-sm font-bold text-slate-800">{customerSince}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sales Rep</p>
                  <p className="text-sm font-bold text-slate-800">{salesRep}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Price Level</p>
                  <p className="text-sm font-bold text-slate-800">{priceLevel}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Terms</p>
                  <p className="text-sm font-bold text-slate-800">{terms}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Credit Limit</p>
                  <p className="text-sm font-bold text-slate-800">
                    {typeof creditLimit === 'number' ? `$${creditLimit.toFixed(2)}` : creditLimit}
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Address Book Table */}
            <div className="lg:col-span-2 bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="p-6 border-b border-slate-200/60 bg-slate-50/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <MapPin className="text-brand-gold" size={20} />
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Address Book ({addresses.length})</h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead className="bg-slate-50/80 border-b border-slate-200/60">
                    <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                      <th className="p-5">Label</th>
                      <th className="p-5">Full Address</th>
                      <th className="p-5">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80">
                    {addresses.length > 0 ? (
                      addresses.map((entry, idx) => {
                        const addr = entry.addressbookAddress || {};
                        const fullAddress = addr.addrText || [addr.addr1, addr.addr2, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');
                        
                        return (
                          <tr key={idx} className="hover:bg-white/80 transition-colors">
                            <td className="p-5 font-bold text-slate-800">{entry.label || `Address ${idx+1}`}</td>
                            <td className="p-5 text-slate-600 max-w-[300px] truncate" title={fullAddress}>
                              {fullAddress || 'Incomplete Address Data'}
                            </td>
                            <td className="p-5">
                              <div className="flex gap-1.5">
                                {entry.defaultShipping && <span className="bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">Default Ship</span>}
                                {entry.defaultBilling && <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">Default Bill</span>}
                                {!entry.defaultShipping && !entry.defaultBilling && <span className="text-slate-400 font-medium">-</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="3" className="p-10 text-center text-slate-400">
                          <p className="text-sm font-black uppercase tracking-widest mb-1">No addresses found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* 5. Raw JSON Viewer */
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