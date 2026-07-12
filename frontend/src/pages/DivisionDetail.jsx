import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Edit, Building2, User as UserIcon, Mail, Phone, MapPin, 
  Package, Users, DollarSign, Loader2, AlertTriangle, RefreshCw, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

// Redux Actions
import { fetchDivisions, updateDivision } from '../store/slices/divisionSlice';
import { fetchUsers, updateUser } from '../store/slices/userSlice';
import { fetchInventory } from '../store/slices/inventorySlice';
import { fetchCustomers } from '../store/slices/customerSlice';
import { fetchTypePieces } from '../store/slices/typePieceSlice';
import { fetchReceivingLogs } from '../store/slices/receivingSlice';
import { fetchRates } from '../store/slices/rateSlice';

// Components
import AddDivisionForm from '../components/division/AddDivisionForm';

// Tab Components imports
import OverviewTab from '../components/vendors/tabs/OverviewTab';
import InventoriesOfDivision from '../components/division/InventoriesOfDivision'; // <--- UPDATED IMPORT
import ProcessingTab from '../components/vendors/tabs/ProcessingTab';
import RatesTab from '../components/vendors/tabs/RatesTab';
import CarrierTab from '../components/vendors/tabs/CarrierTab'; 
import TypePiece from '../components/division/TypePiecesOfDivision';
import StaffOfDivision from '../components/division/StaffOfDivision';

const TabComponents = { 
  'Overview': OverviewTab, 
  'Inventory': InventoriesOfDivision,
  'Processing': ProcessingTab, 
  'Carrier': CarrierTab, 
  'Rates': RatesTab, 
  'Staff': StaffOfDivision,
  'Type Pieces': TypePiece 
};

const TABS = Object.keys(TabComponents);

export default function DivisionDetail() {
  const { divisionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState('Overview');

  // --- Redux State Extraction ---
  const { items: divisions = [], status: divStatus } = useSelector(state => state.divisions || {});
  const { items: users = [], status: userStatus } = useSelector(state => state.users || {});
  const { items: inventory = [], status: invStatus } = useSelector(state => state.inventory || {});
  const { items: customers = [], status: custStatus } = useSelector(state => state.customers || {});
  const { currentCustomer: customer, status, error } = useSelector((state) => state.customers || {});
  
  // Extract the arrays for the child tabs
  const { items: allTypePieces = [], status: tpStatus, error: tpError } = useSelector(state => state.typePieces || {});
  const { items: allReceivingLogs = [], status: recStatus } = useSelector(state => state.receiving || {});
  const { items: allRates = [], status: rateStatus } = useSelector(state => state.rates || {});

  // Fetch all relational data
  const loadAllData = () => {
    if (divStatus === 'idle' || divStatus === 'failed') dispatch(fetchDivisions());
    if (userStatus === 'idle' || userStatus === 'failed') dispatch(fetchUsers());
    if (invStatus === 'idle' || invStatus === 'failed') dispatch(fetchInventory());
    if (custStatus === 'idle' || custStatus === 'failed') dispatch(fetchCustomers());
    if (tpStatus === 'idle' || tpStatus === 'failed') dispatch(fetchTypePieces());
    if (recStatus === 'idle' || recStatus === 'failed') dispatch(fetchReceivingLogs());
    if (rateStatus === 'idle' || rateStatus === 'failed') dispatch(fetchRates());
  };

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // --- Core Data Resolution ---
  const division = useMemo(() => {
    return divisions.find(d => String(d._id) === String(divisionId));
  }, [divisions, divisionId]);

  const orderPortalStaff = useMemo(() => users.filter(user => user.portal === 'order'), [users]);

  // --- Relational Data Filtering ---
  const assignedStaff = useMemo(() => {
    if (!division) return [];
    return orderPortalStaff.filter(u => u.divisions?.some(d => String(d._id || d) === String(division._id)));
  }, [orderPortalStaff, division]);

  const divisionInventory = useMemo(() => {
    if (!division) return [];
    return inventory.filter(inv => String(inv.division?._id || inv.division) === String(division._id));
  }, [inventory, division]);

  const divisionRates = useMemo(() => {
    if (!division) return [];
    return allRates.filter(r => String(r.division?._id || r.division) === String(division._id));
  }, [allRates, division]);

  const customerTypePieces = useMemo(() => {
    if (!division || !division.customer) return [];
    const divCustomerId = division.customer?._id || division.customer;
    return allTypePieces.filter(tp => String(tp.customer?._id || tp.customer) === String(divCustomerId));
  }, [allTypePieces, division]);

  const divisionReceivingLogs = useMemo(() => {
    if (!division) return [];
    return allReceivingLogs.filter(log => String(log.division?._id || log.division) === String(division._id));
  }, [allReceivingLogs, division]);

  // --- Dynamic Derived Metrics ---
  const totalAssets = divisionInventory.length;
  const totalValuation = divisionInventory.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.available) || 0)), 0);
  const activeStaffCount = assignedStaff.length;

  const operationalScore = useMemo(() => {
    if (totalAssets === 0) return 100;
    const healthyItemsCount = divisionInventory.filter(inv => (Number(inv.available) || 0) > (Number(inv.min) || 0)).length;
    return ((healthyItemsCount / totalAssets) * 100).toFixed(1);
  }, [divisionInventory, totalAssets]);

  // Utility to format address cleanly
  const formatAddress = (address) => {
    if (!address || !address.line1) return 'No address provided';
    const street = address.line2 ? `${address.line1}, ${address.line2}` : address.line1;
    return `${street}, ${address.city || ''}, ${address.state || ''} ${address.zip || ''}`.trim().replace(/,\s*$/, '');
  };

  // --- Edit Form State & Handlers ---
  const INITIAL_FORM_STATE = { 
    divisionName: '', divisionCode: '', managers: [], status: 'Active', customer: '',
    contactName: '', contactEmail: '', contactNumber: '', line1: '', line2: '', city: '', state: '', zip: ''
  };
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openEditModal = () => {
    if (!division) return;
    setFormData({
      divisionName: division.divisionName || '',
      divisionCode: division.divisionCode || division.code || '', 
      managers: assignedStaff.map(u => String(u._id)), 
      customer: division.customer?._id || division.customer || '',
      status: division.status || 'Active', 
      contactName: division.contactName || '',
      contactEmail: division.contactEmail || '',
      contactNumber: division.contactNumber || '',
      line1: division.address?.line1 || '',
      line2: division.address?.line2 || '',
      city: division.address?.city || '',
      state: division.address?.state || '',
      zip: division.address?.zip || ''
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.divisionName || !formData.divisionCode || !formData.customer) {
      return toast.warning('Missing Data', { description: 'Name, Code, and Customer are required.' });
    }
    
    setIsSubmitting(true);
    const payload = {
      divisionName: formData.divisionName.trim(),
      divisionCode: formData.divisionCode.trim().toUpperCase(),
      customer: formData.customer, 
      status: formData.status,
      contactName: formData.contactName?.trim() || undefined,
      contactEmail: formData.contactEmail?.trim().toLowerCase() || undefined,
      contactNumber: formData.contactNumber?.trim() || undefined,
      address: { 
        line1: formData.line1?.trim() || undefined, line2: formData.line2?.trim() || undefined, 
        city: formData.city?.trim() || undefined, state: formData.state?.trim() || undefined, zip: formData.zip?.trim() || undefined 
      }
    };

    const syncProcess = async () => {
      await dispatch(updateDivision({ id: division._id, divisionData: payload })).unwrap();

      const oldManagerIds = assignedStaff.map(u => String(u._id));
      const newManagerIds = formData.managers;

      const usersToRemove = oldManagerIds.filter(uid => !newManagerIds.includes(uid));
      const usersToAdd = newManagerIds.filter(uid => !oldManagerIds.includes(uid));

      const removePromises = usersToRemove.map(async (userId) => {
        const user = orderPortalStaff.find(u => String(u._id) === userId);
        if (user) {
          const updatedDivs = (user.divisions || []).map(d => String(d._id || d)).filter(dId => dId !== String(division._id));
          return dispatch(updateUser({ id: userId, userData: { divisions: updatedDivs } })).unwrap();
        }
      });

      const addPromises = usersToAdd.map(async (userId) => {
        const user = orderPortalStaff.find(u => String(u._id) === userId);
        if (user) {
          const currentDivs = (user.divisions || []).map(d => String(d._id || d));
          const updatedDivs = [...new Set([...currentDivs, String(division._id)])];
          return dispatch(updateUser({ id: userId, userData: { divisions: updatedDivs } })).unwrap();
        }
      });

      await Promise.all([...removePromises, ...addPromises]);
      dispatch(fetchUsers()); 
    };

    try {
      const actionPromise = syncProcess();
      toast.promise(actionPromise, { loading: 'Saving updates...', success: 'Profile updated successfully.', error: 'Failed to update.' });
      await actionPromise;
      setIsModalOpen(false);
    } catch (err) {} 
    finally { setIsSubmitting(false); }
  };

  // --- Render Handlers ---
  const isGlobalLoading = [divStatus, userStatus, invStatus, custStatus, tpStatus, recStatus, rateStatus].some(s => s === 'idle' || s === 'loading');
  const hasGlobalError = [divStatus, userStatus, invStatus, custStatus, tpStatus, recStatus, rateStatus].some(s => s === 'failed');

  if (hasGlobalError && !isGlobalLoading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50 p-8 rounded-3xl text-center shadow-lg border border-red-200">
          <AlertTriangle className="text-red-500 mb-4 mx-auto" size={40} />
          <h2 className="text-red-800 text-lg font-black mb-2">Sync Failed</h2>
          <p className="text-red-600/80 text-xs font-medium mb-6">{tpError || 'Check your database connection.'}</p>
          <button onClick={loadAllData} className="flex mx-auto items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md">
            <RefreshCw size={14} /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (isGlobalLoading) {
    return (
      <div className="h-full flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-brand-gold" size={36} />
        <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Compiling Division Data...</p>
      </div>
    );
  }

  if (!division && divStatus === 'succeeded') {
    return (
      <div className="h-full flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <Building2 className="text-slate-300" size={48} />
        <h2 className="text-xl font-black text-slate-700 uppercase">Division Not Found</h2>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase mt-4">
          Go Back
        </button>
      </div>
    );
  }

  if (!division) return null;

  // Dynamically Resolve the Active Tab Component
  const ActiveTabComponent = TabComponents[activeTab] || TabComponents['Overview'];

  return (
    <div className="h-full flex flex-col gap-5 max-w-[1500px] mx-auto pb-10 px-4 sm:px-6 box-border animate-fade-in">
      
      {/* 1. Header Navigation */}
      <div className="flex items-center justify-between bg-white/30 p-3 rounded-2xl border border-white/50 backdrop-blur-xl transition-all duration-300 gap-4 shadow-sm">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:text-slate-900 transition-colors duration-200 shrink-0 rounded-xl hover:bg-white/50"
        >
          <ArrowLeft size={16} /> <span className="text-[11px] font-black uppercase tracking-widest hidden sm:inline">Back</span>
        </button>
        
        <button 
          onClick={openEditModal}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-gold hover:bg-[#b07d43] text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
        >
          <Edit size={14} /> Edit Profile
        </button>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        
        {/* 2. Left Sidebar: Identity Card */}
        <div className="space-y-6 w-full xl:w-[340px] shrink-0 min-w-0">
          <div className="bg-slate-950 text-white p-5 rounded-2xl shadow-xl border border-slate-900 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start gap-4 mb-4 pb-4 border-b border-white/10">
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5 block">Operational Identity</span>
                  <p className="font-black text-xl tracking-tight text-white truncate" title={division.divisionName}>
                    {division.divisionName}
                  </p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                    division.status === 'Active' 
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' 
                      : 'bg-slate-500/15 text-slate-400 border-slate-500/20'
                  }`}>
                    {division.status || 'Active'}
                  </span>
                </div>
                <div className="w-10 h-10 bg-brand-gold text-slate-950 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-gold/20">
                  <Building2 size={20} strokeWidth={2.5} />
                </div>
              </div>

              <p className="text-[10px] text-slate-300 font-mono mb-4 px-1">
                ID: {division.divisionCode || division.code || 'N/A'}
              </p>

              {/* Micro-Cards for Contact Info */}
              <div className="space-y-2.5 text-xs font-medium">
                <div className="flex items-center gap-3 min-w-0 bg-white/5 p-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors duration-150 cursor-default">
                  <UserIcon size={14} className="text-brand-gold shrink-0" />
                  <span className="truncate font-semibold tracking-wide text-slate-200">
                    {division.contactName || 'No contact specified'}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 min-w-0 bg-white/5 p-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors duration-150 cursor-default">
                  <Mail size={14} className="text-brand-gold shrink-0" />
                  <span className="break-all select-all font-semibold tracking-wide text-slate-200">
                    {division.contactEmail || 'No email provided'}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 min-w-0 bg-white/5 p-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors duration-150 cursor-default">
                  <Phone size={14} className="text-brand-gold shrink-0" />
                  <span className="truncate font-semibold tracking-wide text-slate-200">
                    {division.contactNumber || 'No phone provided'}
                  </span>
                </div>
                
                <div className="flex items-start gap-3 min-w-0 bg-white/5 p-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors duration-150 cursor-default">
                  <MapPin size={14} className="text-brand-gold shrink-0 mt-0.5" />
                  <span className="break-words font-semibold tracking-wide text-slate-200 leading-relaxed">
                    {formatAddress(division.address)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Main Content Area */}
        <div className="flex-1 w-full min-w-0 space-y-5">
          
          {/* Top KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/40 border border-white/60 p-4 rounded-2xl flex items-center justify-between shadow-sm backdrop-blur-sm transition-all duration-300 hover:bg-white/60">
              <div>
                <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-0.5">Total Assets</p>
                <p className="font-black text-lg text-slate-900">{totalAssets.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-white/60 rounded-xl shadow-sm border border-white/80">
                <Package size={16} className="text-blue-500" />
              </div>
            </div>

            <div className="bg-white/40 border border-white/60 p-4 rounded-2xl flex items-center justify-between shadow-sm backdrop-blur-sm transition-all duration-300 hover:bg-white/60">
              <div>
                <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-0.5">Authorized Staff</p>
                <p className="font-black text-lg text-slate-900">{activeStaffCount}</p>
              </div>
              <div className="p-2 bg-white/60 rounded-xl shadow-sm border border-white/80">
                <Users size={16} className="text-emerald-500" />
              </div>
            </div>

            <div className="bg-white/40 border border-white/60 p-4 rounded-2xl flex items-center justify-between shadow-sm backdrop-blur-sm transition-all duration-300 hover:bg-white/60">
              <div>
                <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-0.5">Pool Valuation</p>
                <p className="font-black text-lg text-slate-900">${(totalValuation).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              </div>
              <div className="p-2 bg-white/60 rounded-xl shadow-sm border border-white/80">
                <DollarSign size={16} className="text-brand-gold" />
              </div>
            </div>
          </div>

          {/* Scrolling Tab Nav */}
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex flex-nowrap sm:flex-wrap gap-2 bg-white/20 p-1.5 rounded-2xl w-max sm:w-fit border border-white/40 shadow-sm backdrop-blur-md">
              {TABS.map(tab => (
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

          {/* Dynamic Tab Content Canvas */}
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 md:p-8 rounded-3xl min-h-[400px] shadow-sm transition-all duration-300">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ActiveTabComponent 
                  divisionData={division}
                  division={division}
                  customer={customer}
                  inventory={divisionInventory}
                  staff={assignedStaff}
                  rates={divisionRates}
                  typePieces={customerTypePieces}
                  receivingLogs={divisionReceivingLogs}
                  totalAssets={totalAssets}
                  totalValuation={totalValuation}
                  operationalScore={operationalScore}
                  setRates={() => console.warn('Dispatch actions via Redux')}
                  setDivisions={() => console.warn('Dispatch actions via Redux')}
                  customerData={division.customer}
                />
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* --- Edit Division Modal --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-white/80 backdrop-blur-2xl border border-white rounded-[2.5rem] shadow-2xl">
              <AddDivisionForm 
                newDivision={formData} 
                setNewDivision={setFormData} 
                onSubmit={handleFormSubmit} 
                staffList={orderPortalStaff} 
                customersList={customers}
                isSubmitting={isSubmitting}
                onCancel={() => setIsModalOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}