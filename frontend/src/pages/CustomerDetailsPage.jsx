import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ArrowLeft, Building, Edit, Mail, Phone, MapPin, 
  ShieldCheck, Star, TrendingUp, User, Loader2
} from 'lucide-react';

// Redux Actions
import { fetchCustomerById, clearCurrentCustomer } from '../store/slices/customerSlice';

// Tab Components imports
import OverviewTab from '../components/vendors/tabs/OverviewTab';
import DivisionTab from '../components/vendors/tabs/DivisionTab';
import InventoryTab from '../components/vendors/tabs/InventoryTab';
import ProcessingTab from '../components/vendors/tabs/ProcessingTab';
import LogisticsTab from '../components/vendors/tabs/LogisticsTab';
import RatesTab from '../components/vendors/tabs/RatesTab';
import StaffTab from '../components/vendors/tabs/StaffTab';
import CarrierTab from '../components/vendors/tabs/CarrierTab'; 

export default function CustomerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Access Redux State
  const { currentCustomer: customer, status, error } = useSelector((state) => state.customers);
  
  const [activeTab, setActiveTab] = useState('Overview');
  
  // Tab States (These would eventually be moved to Redux/Backend too)
  const [rates, setRates] = useState([
    { id: 1, name: 'Pick & Pack Fee', value: '0.75' },
    { id: 2, name: 'Storage Fee', value: '25.00' }
  ]);

  const [carriers, setCarriers] = useState([
    { id: 1, name: 'UPS', service: 'Ground', account: '12345' }
  ]);
  
  const [divisions, setDivisions] = useState([
    { id: 1, name: 'North American Supply', code: 'DIV-NAS', manager: 'Sarah Jenkins', region: 'Midwest Hub', status: 'Active' },
    { id: 2, name: 'EMEA Distribution', code: 'DIV-EMEA', manager: 'Marcus Vance', region: 'Frankfurt Central', status: 'Active' },
    { id: 3, name: 'APAC Electronics Procurement', code: 'DIV-APAC', manager: 'Lin Nguyen', region: 'Singapore Sea Port', status: 'Inactive' }
  ]);

  const tabs = ['Overview', 'Division', 'Inventory', 'Processing', 'Carrier', 'Logistics', 'Rates', 'Staff'];
  
  const TabComponents = { 
    Overview: OverviewTab, 
    Division: DivisionTab, 
    Inventory: InventoryTab, 
    Processing: ProcessingTab, 
    Carrier: CarrierTab, 
    Logistics: LogisticsTab, 
    Rates: RatesTab, 
    Staff: StaffTab 
  };
  
  const ActiveComponent = TabComponents[activeTab];

  // Fetch real customer data on mount
  useEffect(() => {
    if (id) {
      dispatch(fetchCustomerById(id));
    }

    // Cleanup when leaving the page to prevent showing stale data on next visit
    return () => {
      dispatch(clearCurrentCustomer());
    };
  }, [id, dispatch]);

  // Utility to format address cleanly
  const formatAddress = (address) => {
    if (!address || !address.line1) return 'No address provided';
    const street = address.line2 ? `${address.line1}, ${address.line2}` : address.line1;
    return `${street}, ${address.city || ''}, ${address.state || ''} ${address.zip || ''}`.trim().replace(/,\s*$/, '');
  };

  // Error State
  if (status === 'failed') {
    return (
      <div className="h-full flex flex-col items-center justify-center min-h-[600px] gap-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-3xl text-center text-sm font-bold border border-red-200 shadow-sm">
          Failed to load customer: {error}
        </div>
        <button 
          onClick={() => navigate('/customers')}
          className="text-slate-500 hover:text-slate-800 text-sm font-bold underline transition-colors"
        >
          Return to Directory
        </button>
      </div>
    );
  }

  // Loading State
  if (status === 'loading' || !customer) {
    return (
      <div className="h-full flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin text-brand-gold" size={32} />
          <p className="text-xs font-black uppercase tracking-widest">Loading Customer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-5 max-w-[1400px] mx-auto pb-10 px-4 box-border animate-fade-in">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-white/30 p-3 rounded-2xl border border-white/50 backdrop-blur-xl transition-all duration-300 gap-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors duration-200 shrink-0">
          <ArrowLeft size={16} /> <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Back to Directory</span>
        </button>
        <button onClick={() => navigate(`/customers/${customer._id}/edit`)} className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-gold text-white rounded-xl text-[11px] font-black shadow-lg shadow-brand-gold/20 hover:scale-105 transition-all duration-200">
          <Edit size={13} /> Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Sidebar Profile */}
        <div className="space-y-6 w-full min-w-0">
          <div className="bg-slate-950 text-white p-5 rounded-2xl shadow-xl border border-slate-900 transition-all duration-300">
             <div className="flex justify-between items-start gap-4 mb-4 pb-4 border-b border-white/10">
                <div className="min-w-0">
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Customer Identity</h3>
                    <p className="font-black text-xl tracking-tight text-white truncate" title={customer.customerName}>
                      {customer.customerName}
                    </p>
                    <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-2 border uppercase tracking-wider ${
                      (customer.status || 'Active') === 'Active' 
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' 
                        : 'bg-slate-500/15 text-slate-400 border-slate-500/20'
                    }`}>
                      {customer.status || 'Active'}
                    </span>
                </div>
                <div className="w-10 h-10 bg-brand-gold text-slate-950 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-gold/20">
                  <Building size={20} strokeWidth={2.5}/>
                </div>
             </div>
             
             <p className="text-[10px] text-slate-500 font-mono mb-4 px-1">ID: {customer._id}</p>
             
             {/* Micro-Cards for Contact Info */}
             <div className="space-y-2.5 text-xs font-medium">
                <div className="flex items-center gap-3 min-w-0 bg-white/5 p-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors duration-150">
                  <User size={14} className="text-brand-gold shrink-0"/> 
                  <span className="truncate font-semibold tracking-wide text-slate-200">
                    {customer.contactName || 'No contact specified'}
                  </span>
                </div>
                <div className="flex items-center gap-3 min-w-0 bg-white/5 p-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors duration-150">
                  <Mail size={14} className="text-brand-gold shrink-0"/> 
                  <span className="break-all select-all font-semibold tracking-wide text-slate-200">
                    {customer.contactEmail || 'No email provided'}
                  </span>
                </div>
                <div className="flex items-center gap-3 min-w-0 bg-white/5 p-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors duration-150">
                  <Phone size={14} className="text-brand-gold shrink-0"/> 
                  <span className="truncate font-semibold tracking-wide text-slate-200">
                    {customer.contactNumber || 'No phone provided'}
                  </span>
                </div>
                <div className="flex items-start gap-3 min-w-0 bg-white/5 p-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors duration-150">
                  <MapPin size={14} className="text-brand-gold shrink-0 mt-0.5"/> 
                  <span className="break-words font-semibold tracking-wide text-slate-200 leading-relaxed">
                    {formatAddress(customer.address)}
                  </span>
                </div>
             </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-5 w-full min-w-0">
          
          {/* Performance Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             {[
               { label: 'Avg Rating', value: '4.9/5', icon: <Star size={16} className="text-amber-400" /> },
               { label: 'Orders (Mo)', value: '1,240', icon: <TrendingUp size={16} className="text-emerald-500" /> },
               { label: 'Support Tier', value: 'Premium', icon: <ShieldCheck size={16} className="text-blue-500" /> }
             ].map((stat, i) => (
                <div key={i} className="bg-white/40 border border-white/60 p-4 rounded-2xl flex items-center justify-between shadow-sm backdrop-blur-sm transition-all duration-300 hover:bg-white/60">
                    <div>
                        <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-0.5">{stat.label}</p>
                        <p className="font-black text-lg text-slate-900">{stat.value}</p>
                    </div>
                    <div className="p-2 bg-white/60 rounded-xl shadow-sm border border-white/80">
                      {stat.icon}
                    </div>
                </div>
             ))}
          </div>

          {/* Scrolling Tab Nav */}
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex flex-nowrap sm:flex-wrap gap-2 bg-white/20 p-1.5 rounded-2xl w-max sm:w-fit border border-white/40 shadow-sm backdrop-blur-md">
              {tabs.map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)} 
                  className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    activeTab === tab 
                      ? 'bg-white shadow-sm text-slate-900 ring-1 ring-slate-900/5' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Active Tab Component Render */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 md:p-8 rounded-3xl min-h-[400px] shadow-sm transition-all duration-300">
             <ActiveComponent 
               customerData={customer}
               rates={rates} 
               setRates={setRates} 
               carriers={carriers} 
               setCarriers={setCarriers} 
               divisions={divisions} 
               setDivisions={setDivisions} 
             />
          </div>
        </div>
      </div>
    </div>
  );
}