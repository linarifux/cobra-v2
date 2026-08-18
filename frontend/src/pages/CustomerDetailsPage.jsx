import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ArrowLeft, Building, Edit, Mail, Phone, MapPin, 
  ShieldCheck, Star, TrendingUp, User, Loader2, AlertTriangle
} from 'lucide-react';

// Redux Actions
import { 
  fetchCustomerById, 
  clearCurrentCustomer,
  fetchCustomerCarriers,
  fetchCustomerInventory,
  fetchCustomerUsers
} from '../store/slices/customerSlice';
import { fetchDivisions } from '../store/slices/divisionSlice';
import { fetchRates } from '../store/slices/rateSlice'; 

// Tab Components imports
import OverviewTab from '../components/vendors/tabs/OverviewTab';
import DivisionTab from '../components/vendors/tabs/DivisionTab';
import InventoryTab from '../components/vendors/tabs/InventoryTab';
import ProcessingTab from '../components/vendors/tabs/ProcessingTab';
import RatesTab from '../components/vendors/tabs/RatesTab';
import StaffTab from '../components/vendors/tabs/StaffTab';
import CarrierTab from '../components/vendors/tabs/CarrierTab'; 
import TypePiece from '../components/vendors/tabs/TypePiece';

export default function CustomerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { 
    currentCustomer: customer, 
    customerCarriers = [],
    customerInventory = [],
    customerUsers = [],
    status, 
    error 
  } = useSelector((state) => state.customers || {});
  
  const { items: allDivisions = [], status: divStatus } = useSelector((state) => state.divisions || {});
  const { items: allRates = [], status: rateStatus } = useSelector((state) => state.rates || {});
  
  const [activeTab, setActiveTab] = useState('Overview');

  // --- Strict Redux Data Filtering ---
  const divisions = useMemo(() => {
    if (!id || !Array.isArray(allDivisions)) return [];
    return allDivisions.filter(d => String(d.customer?._id || d.customer) === String(id));
  }, [allDivisions, id]);

  const rates = useMemo(() => {
    if (!id || !Array.isArray(allRates)) return [];
    return allRates.filter(r => String(r.customer?._id || r.customer) === String(id));
  }, [allRates, id]);

  const tabs = ['Overview', 'Division', 'Inventory', 'Processing', 'Carrier', 'Rates', 'Staff', 'Type Pieces'];
  
  const TabComponents = { 
    'Overview': OverviewTab, 
    'Division': DivisionTab, 
    'Inventory': InventoryTab, 
    'Processing': ProcessingTab, 
    'Carrier': CarrierTab, 
    'Rates': RatesTab, 
    'Staff': StaffTab,
    'Type Pieces': TypePiece 
  };
  
  const ActiveComponent = TabComponents[activeTab];

  // 1. Fetch strictly customer-specific data based on URL ID
  useEffect(() => {
    if (id) {
      dispatch(fetchCustomerById(id));
      dispatch(fetchCustomerCarriers(id));
      dispatch(fetchCustomerInventory(id));
      dispatch(fetchCustomerUsers(id));
    }

    // CRITICAL FIX: Only clear the state when navigating AWAY or unmounting. 
    // This perfectly prevents the "flashing" of old data.
    return () => {
      dispatch(clearCurrentCustomer());
    };
  }, [id, dispatch]);

  // 2. Fetch global supporting data independently
  useEffect(() => {
    if (divStatus === 'idle' || divStatus === 'failed') dispatch(fetchDivisions());
    if (rateStatus === 'idle' || rateStatus === 'failed') dispatch(fetchRates());
  }, [divStatus, rateStatus, dispatch]);

  const formatAddress = (address) => {
    if (!address || (!address.line1 && !address.city)) return 'No address provided';
    const street = address.line2 ? `${address.line1 || ''}, ${address.line2}` : (address.line1 || '');
    return `${street}, ${address.city || ''}, ${address.state || ''} ${address.zip || ''}`
      .replace(/^,\s*/, '').replace(/,\s*$/, '').trim();
  };

  // --- STRICT RENDER GUARDS ---

  if (status === 'failed' && error) {
    return (
      <div className="h-full flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in px-4">
        <div className="bg-red-50 p-8 rounded-3xl text-center shadow-sm border border-red-200 max-w-md w-full">
          <AlertTriangle className="text-red-500 mx-auto mb-4" size={40} />
          <h2 className="text-red-800 text-lg font-black tracking-tight mb-2">Failed to Load Profile</h2>
          <p className="text-red-600/80 text-xs font-bold mb-6">{error || 'An unexpected error occurred.'}</p>
          <button 
            onClick={() => navigate('/customers')}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-lg shadow-red-600/20"
          >
            Return to Directory
          </button>
        </div>
      </div>
    );
  }

  // Strict check ensures UI blocks until customer ID exactly matches the requested URL
  const isDataSyncing = status === 'loading' || !customer || String(customer._id) !== String(id);
  
  if (isDataSyncing) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <div className="bg-white/40 backdrop-blur-md border border-white/60 p-10 rounded-[2rem] shadow-xl flex flex-col items-center gap-5 animate-pulse-slow">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 bg-brand-gold/20 rounded-full blur-xl animate-pulse"></div>
            <Loader2 className="animate-spin text-brand-gold relative z-10" size={48} />
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-slate-900 tracking-tight">Accessing Network</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Decrypting Customer Node</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 max-w-[1500px] mx-auto pb-10 px-4 sm:px-6 box-border animate-fade-in relative">
      
      {/* Navigation Header */}
      <div className="flex items-center justify-between bg-white/40 p-4 rounded-2xl border border-white/60 backdrop-blur-xl shadow-sm transition-all duration-300 gap-4">
        <button 
          onClick={() => navigate('/customers')} 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors duration-200 shrink-0 font-bold"
        >
          <ArrowLeft size={16} /> 
          <span className="text-[10px] uppercase tracking-widest hidden sm:inline">Back to Directory</span>
        </button>
        <button 
          onClick={() => navigate(`/customers/${customer._id}/edit`)} 
          className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-brand-gold hover:bg-slate-800 rounded-xl text-xs font-black shadow-lg shadow-slate-900/20 active:scale-95 transition-all duration-200 uppercase tracking-widest"
        >
          <Edit size={14} /> Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* Left Sidebar Profile Card */}
        <div className="space-y-6 w-full min-w-0 xl:sticky xl:top-6">
          <div className="bg-slate-950 text-white p-6 rounded-3xl shadow-2xl border border-slate-800 transition-all duration-300">
             
             <div className="flex justify-between items-start gap-4 mb-5 pb-5 border-b border-white/10">
                <div className="min-w-0 flex-1">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Customer Identity</h3>
                    <p className="font-black text-2xl tracking-tight text-white truncate pr-2" title={customer.customerName}>
                      {customer.customerName}
                    </p>
                    <span className={`inline-flex items-center text-[9px] font-black px-2.5 py-1 rounded-md mt-3 border uppercase tracking-widest shadow-sm ${
                      (customer.status || 'Active') === 'Active' 
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                        : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                    }`}>
                      {customer.status || 'Active'} Profile
                    </span>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-brand-gold to-amber-600 text-slate-950 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-gold/20">
                  <Building size={22} strokeWidth={2.5}/>
                </div>
             </div>
             
             <div className="mb-5 px-1 flex flex-col gap-1">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">System ID</p>
                <p className="text-xs text-slate-300 font-mono bg-white/5 p-2 rounded-lg border border-white/5 truncate select-all">
                  {customer._id}
                </p>
             </div>
             
             <div className="space-y-3 text-xs font-medium">
                <div className="flex items-center gap-3 min-w-0 bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors duration-200">
                  <User size={16} className="text-brand-gold shrink-0"/> 
                  <span className="truncate font-bold tracking-wide text-slate-200">
                    {customer.contactName || 'No contact specified'}
                  </span>
                </div>
                <div className="flex items-center gap-3 min-w-0 bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors duration-200">
                  <Mail size={16} className="text-brand-gold shrink-0"/> 
                  <span className="break-all select-all font-bold tracking-wide text-slate-200">
                    {customer.contactEmail || 'No email provided'}
                  </span>
                </div>
                <div className="flex items-center gap-3 min-w-0 bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors duration-200">
                  <Phone size={16} className="text-brand-gold shrink-0"/> 
                  <span className="truncate font-bold tracking-wide text-slate-200">
                    {customer.contactNumber || 'No phone provided'}
                  </span>
                </div>
                <div className="flex items-start gap-3 min-w-0 bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors duration-200">
                  <MapPin size={16} className="text-brand-gold shrink-0 mt-0.5"/> 
                  <span className="break-words font-bold tracking-wide text-slate-200 leading-relaxed">
                    {formatAddress(customer.address)}
                  </span>
                </div>
             </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="xl:col-span-3 space-y-6 w-full min-w-0">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             {[
               { label: 'Avg Rating', value: '4.9/5', icon: <Star size={18} className="text-amber-500" /> },
               { label: 'Orders (Mo)', value: '1,240', icon: <TrendingUp size={18} className="text-emerald-500" /> },
               { label: 'Support Tier', value: 'Premium', icon: <ShieldCheck size={18} className="text-blue-500" /> }
             ].map((stat, i) => (
                <div key={i} className="bg-white/40 border border-white/60 p-5 rounded-3xl flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-2xl transition-all duration-300 hover:bg-white/60">
                    <div>
                        <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">{stat.label}</p>
                        <p className="font-black text-2xl text-slate-900 tracking-tight">{stat.value}</p>
                    </div>
                    <div className="p-3 bg-white/80 rounded-2xl shadow-sm border border-slate-100">
                      {stat.icon}
                    </div>
                </div>
             ))}
          </div>

          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex flex-nowrap sm:flex-wrap gap-2 bg-white/40 p-2 rounded-2xl w-max sm:w-full border border-white/60 shadow-sm backdrop-blur-xl">
              {tabs.map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)} 
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    activeTab === tab 
                      ? 'bg-slate-900 text-brand-gold shadow-md shadow-slate-900/10' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 md:p-8 rounded-3xl min-h-[500px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300">
             <ActiveComponent 
               customerData={customer}
               customer={customer} 
               rates={rates} 
               divisions={divisions} 
               inventory={customerInventory}
               carriers={customerCarriers}
               users={customerUsers}
             />
          </div>
        </div>
      </div>
    </div>
  );
}