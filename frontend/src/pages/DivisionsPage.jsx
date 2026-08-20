import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Layers, Plus, Search, Filter, Edit2, Trash2, 
  ToggleLeft, ToggleRight, Loader2, AlertTriangle, 
  RefreshCw, MapPin, User, ArrowLeft, Building, Mail, Phone 
} from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';

// Redux Thunks
import { fetchDivisions, createDivision, updateDivision, deleteDivision } from '../store/slices/divisionSlice';
import { fetchCustomers } from '../store/slices/customerSlice';
import { fetchUsers, updateUser } from '../store/slices/userSlice';

// Components
import { useConfirm } from '../providers/ConfirmProvider';
import AddDivisionForm from '../components/division/AddDivisionForm';

export default function DivisionsPage() {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const navigate = useNavigate();
  
  const { customerId } = useParams();
  
  // --- Redux State ---
  const { items: divisions = [], status: divStatus, error: divError } = useSelector(state => state.divisions || {});
  const { items: customers = [], status: custStatus } = useSelector(state => state.customers || {});
  const { items: users = [], status: userStatus } = useSelector(state => state.users || {});

  // --- Strict Loading State ---
  const [isPageLoading, setIsPageLoading] = useState(true);

  // CRITICAL FIX: Unconditionally fetch data on mount and URL change.
  // We use `isPageLoading` to lock the UI until all fresh network requests resolve.
  useEffect(() => {
    let isMounted = true;

    const fetchFreshData = async () => {
      setIsPageLoading(true);
      try {
        await Promise.all([
          dispatch(fetchDivisions(customerId)).unwrap(),
          dispatch(fetchCustomers()).unwrap(),
          dispatch(fetchUsers()).unwrap()
        ]);
      } catch (err) {
        console.error("Failed to fetch fresh directory data", err);
      } finally {
        if (isMounted) setIsPageLoading(false);
      }
    };

    fetchFreshData();

    return () => {
      isMounted = false;
    };
  }, [dispatch, customerId]);

  const isGlobalLoading = isPageLoading || [divStatus, custStatus, userStatus].some(s => s === 'loading');
  const hasGlobalError = [divStatus, custStatus, userStatus].some(s => s === 'failed');

  // Filter Order Portal Staff for Managers
  const orderPortalStaff = useMemo(() => users.filter(user => user.portal === 'order'), [users]);

  // Derive the active customer if we are looking at a scoped directory
  const activeCustomer = useMemo(() => {
    if (!customerId || customers.length === 0) return null;
    return customers.find(c => String(c._id) === String(customerId));
  }, [customerId, customers]);

  // Utility to format address cleanly for the Customer Header
  const formatAddress = (address) => {
    if (!address || (!address.line1 && !address.city)) return 'No location provided';
    const street = address.line2 ? `${address.line1 || ''}, ${address.line2}` : (address.line1 || '');
    return `${street}, ${address.city || ''}, ${address.state || ''} ${address.zip || ''}`
      .replace(/^,\s*/, '')
      .replace(/,\s*$/, '')
      .trim();
  };

  // --- UI & Filter State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); 

  // --- Form State Management ---
  const INITIAL_FORM_STATE = { 
    divisionName: '', 
    divisionCode: '', 
    managers: [], 
    status: 'Active', 
    customer: customerId || '', // Default to active customer
    contactName: '', contactEmail: '', contactNumber: '', line1: '', line2: '', city: '', state: '', zip: ''
  };
  
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- STRICT DATA FILTERING ---
  const filteredDivisions = useMemo(() => {
    if (!Array.isArray(divisions)) return [];
    
    return divisions.filter(div => {
      const divCustId = String(div.customer?._id || div.customer);

      if (customerId && divCustId !== String(customerId)) return false;

      const searchTarget = searchTerm.toLowerCase();
      const matchesSearch = [
        div.divisionName, div.divisionCode, div.customer?.customerName
      ].some(val => val?.toLowerCase().includes(searchTarget));

      const matchesCustomer = customerId ? true : (customerFilter === 'All' || divCustId === customerFilter);
      const matchesStatus = statusFilter === 'All' || div.status === statusFilter;

      return matchesSearch && matchesCustomer && matchesStatus;
    }).sort((a, b) => a.divisionName.localeCompare(b.divisionName));
  }, [divisions, searchTerm, customerFilter, statusFilter, customerId]);

  // --- Handlers ---
  const openNewModal = () => {
    setSelectedDivision(null);
    setFormData(INITIAL_FORM_STATE);
    setIsModalOpen(true);
  };

  const openEditModal = (div) => {
    setSelectedDivision(div);
    const assignedUserIds = orderPortalStaff
      .filter(u => u.divisions?.some(d => String(d._id || d) === String(div._id)))
      .map(u => String(u._id));

    setFormData({
      divisionName: div.divisionName || '',
      divisionCode: div.divisionCode || div.code || '', 
      managers: assignedUserIds, 
      customer: div.customer?._id || div.customer || '',
      contactName: div.contactName || '',
      contactEmail: div.contactEmail || '',
      contactNumber: div.contactNumber || '',
      line1: div.address?.line1 || '',
      line2: div.address?.line2 || '',
      city: div.address?.city || '',
      state: div.address?.state || '',
      zip: div.address?.zip || ''
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (div) => {
    try {
      const newStatus = div.status === 'Active' ? 'Inactive' : 'Active';
      const actionPromise = dispatch(updateDivision({ id: div._id, divisionData: { status: newStatus } })).unwrap();
      toast.promise(actionPromise, { loading: 'Updating status...', success: `Division is now ${newStatus}.`, error: 'Update failed.' });
      await actionPromise;
    } catch (err) {}
  };

  const handleDelete = async (id) => {
    if (await confirm({ title: 'Delete Division?', message: 'Are you sure you want to permanently delete this division?', confirmText: 'Delete', variant: 'danger' })) {
      const syncProcess = async () => {
        await dispatch(deleteDivision(id)).unwrap();
        const usersToUpdate = orderPortalStaff.filter(u => u.divisions?.some(d => String(d._id || d) === String(id)));
        const updatePromises = usersToUpdate.map(user => {
          const updatedDivs = user.divisions.map(d => String(d._id || d)).filter(dId => dId !== String(id));
          return dispatch(updateUser({ id: user._id, userData: { divisions: updatedDivs } })).unwrap();
        });
        await Promise.all(updatePromises);
        dispatch(fetchUsers());
      };
      toast.promise(syncProcess(), { loading: 'Deleting division...', success: 'Division deleted.', error: 'Failed to delete.' });
    }
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
      status: formData.status || 'Active',
      contactName: formData.contactName?.trim() || undefined,
      contactEmail: formData.contactEmail?.trim().toLowerCase() || undefined,
      contactNumber: formData.contactNumber?.trim() || undefined,
      address: { 
        line1: formData.line1?.trim() || undefined, line2: formData.line2?.trim() || undefined, 
        city: formData.city?.trim() || undefined, state: formData.state?.trim() || undefined, zip: formData.zip?.trim() || undefined 
      }
    };

    const syncProcess = async () => {
      let savedDivId = selectedDivision?._id;
      
      if (selectedDivision) {
        await dispatch(updateDivision({ id: selectedDivision._id, divisionData: payload })).unwrap();
      } else {
        const createdDiv = await dispatch(createDivision(payload)).unwrap();
        savedDivId = createdDiv._id;
      }

      const oldManagerIds = selectedDivision 
        ? orderPortalStaff.filter(u => u.divisions?.some(d => String(d._id || d) === String(savedDivId))).map(u => String(u._id))
        : [];
      
      const newManagerIds = formData.managers;
      const usersToRemove = oldManagerIds.filter(uid => !newManagerIds.includes(uid));
      const usersToAdd = newManagerIds.filter(uid => !oldManagerIds.includes(uid));

      const removePromises = usersToRemove.map(async (userId) => {
        const user = orderPortalStaff.find(u => String(u._id) === userId);
        if (user) {
          const updatedDivs = (user.divisions || []).map(d => String(d._id || d)).filter(dId => dId !== String(savedDivId));
          return dispatch(updateUser({ id: userId, userData: { divisions: updatedDivs } })).unwrap();
        }
      });

      const addPromises = usersToAdd.map(async (userId) => {
        const user = orderPortalStaff.find(u => String(u._id) === userId);
        if (user) {
          const currentDivs = (user.divisions || []).map(d => String(d._id || d));
          const updatedDivs = [...new Set([...currentDivs, String(savedDivId)])];
          return dispatch(updateUser({ id: userId, userData: { divisions: updatedDivs } })).unwrap();
        }
      });

      await Promise.all([...removePromises, ...addPromises]);
      dispatch(fetchUsers());
    };

    try {
      const actionPromise = syncProcess();
      toast.promise(actionPromise, { loading: 'Saving...', success: 'Division saved successfully.', error: 'Failed to save division.' });
      await actionPromise;
      setIsModalOpen(false);
    } catch (err) {} 
    finally { setIsSubmitting(false); }
  };

  // --- Renders ---

  // High-priority blocking loader
  if (isGlobalLoading) {
    return (
      <div className="h-full flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-brand-gold" size={36} />
        <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Compiling Directory...</p>
      </div>
    );
  }

  if (hasGlobalError) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50 p-8 rounded-3xl text-center shadow-lg border border-red-200">
          <AlertTriangle className="text-red-500 mb-4 mx-auto" size={40} />
          <h2 className="text-red-800 text-lg font-black mb-2">Sync Failed</h2>
          <p className="text-red-600/80 text-xs font-medium mb-6">{divError || 'Check connection.'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="flex mx-auto items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl text-xs font-black uppercase"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in-right relative max-w-[1500px] mx-auto p-6 pb-20">
      
      {/* --- Top Navigation Header --- */}
      <div className="flex items-center justify-between pb-1">
        <button 
          onClick={() => navigate(customerId ? '/customers' : -1)}
          className="flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:text-slate-900 transition-colors duration-200 shrink-0 rounded-xl hover:bg-slate-100"
        >
          <ArrowLeft size={16} /> 
          <span className="text-[11px] font-black uppercase tracking-widest">
            {customerId ? 'Back to Customers' : 'Back'}
          </span>
        </button>
      </div>

      {/* NEW: Customer Details Header Panel (Only shown if filtering by specific customer) */}
      {activeCustomer && (
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-[2rem] shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 transition-all duration-300">
           <div className="flex items-start gap-4">
             <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 text-brand-gold rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-slate-900/20">
               <Building size={24} strokeWidth={2}/>
             </div>
             <div>
               <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Customer Profile</h3>
               <p className="font-black text-2xl tracking-tight text-slate-900 truncate max-w-md">
                 {activeCustomer.customerName}
               </p>
               <span className={`inline-flex items-center text-[9px] font-black px-2.5 py-1 rounded-md mt-2 border uppercase tracking-widest shadow-sm ${
                 (activeCustomer.status || 'Active') === 'Active' 
                   ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                   : 'bg-slate-100 text-slate-500 border-slate-200'
               }`}>
                 {activeCustomer.status || 'Active'} Partner
               </span>
             </div>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full xl:w-auto xl:min-w-[500px]">
             <div className="flex items-center gap-3 bg-white/60 p-3.5 rounded-xl border border-white/80 shadow-sm">
               <User size={16} className="text-brand-gold shrink-0"/> 
               <div className="min-w-0">
                 <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Primary Contact</p>
                 <p className="truncate font-bold text-xs text-slate-700">{activeCustomer.contactName || 'No contact specified'}</p>
               </div>
             </div>
             <div className="flex items-center gap-3 bg-white/60 p-3.5 rounded-xl border border-white/80 shadow-sm">
               <Mail size={16} className="text-brand-gold shrink-0"/> 
               <div className="min-w-0">
                 <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Contact Email</p>
                 <p className="truncate font-bold text-xs text-slate-700">{activeCustomer.contactEmail || 'No email provided'}</p>
               </div>
             </div>
             <div className="flex items-center gap-3 bg-white/60 p-3.5 rounded-xl border border-white/80 shadow-sm">
               <Phone size={16} className="text-brand-gold shrink-0"/> 
               <div className="min-w-0">
                 <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Phone</p>
                 <p className="truncate font-bold text-xs text-slate-700">{activeCustomer.contactNumber || 'No phone provided'}</p>
               </div>
             </div>
           </div>
        </div>
      )}

      {/* 1. Main Title Block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 rounded-[2rem] p-6 md:p-8 shadow-2xl border border-slate-800/60 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-gold/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Layers className="text-brand-gold" size={32} /> {activeCustomer ? 'Customer Divisions' : 'Global Directory'}
          </h1>
          <p className="text-slate-400 font-medium text-sm mt-1">Manage corporate boundaries, branch logistics, and segment access.</p>
        </div>
        <button onClick={openNewModal} className="relative z-10 flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-gold hover:bg-brand-gold/90 text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 shrink-0">
          <Plus size={16} /> Deploy Division
        </button>
      </div>

      {/* 2. Filter Board */}
      <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-5 rounded-[2rem] shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-[2] min-w-[250px] relative">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Search Directory</label>
          <div className="relative">
            <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by Name, Code, or Customer..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-11 pr-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none transition-all"
            />
          </div>
        </div>
        
        {!customerId && (
          <div className="flex-1 min-w-[180px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1 flex items-center gap-1.5"><Filter size={10} className="text-brand-gold"/> Depositor / Customer</label>
            <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className="w-full px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none cursor-pointer">
              <option value="All">All Customers</option>
              {customers.map(c => <option key={c._id} value={c._id}>{c.customerName}</option>)}
            </select>
          </div>
        )}

        <div className="flex-1 min-w-[140px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1 flex items-center gap-1.5"><Filter size={10} className="text-brand-gold"/> Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none cursor-pointer">
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* 3. List / Table View */}
      <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50">
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap w-[25%]">Division Profile</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap w-[20%]">Assigned Customer</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap w-[20%]">Regional Details</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center w-[15%]">Status</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-[20%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {filteredDivisions.length > 0 ? filteredDivisions.map((div) => {
                const assignedUsers = orderPortalStaff.filter(u => u.divisions?.some(d => String(d._id || d) === String(div._id)));
                
                return (
                  <tr 
                    key={div._id} 
                    onClick={() => navigate(`/divisions/${div._id}`)}
                    className={`cursor-pointer hover:bg-white/60 transition-colors group ${div.status !== 'Active' && 'opacity-60 grayscale-[30%]'}`}
                  >
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                          <Layers size={18} className="text-slate-400 group-hover:text-brand-gold transition-colors" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 leading-tight group-hover:text-brand-gold transition-colors">{div.divisionName}</p>
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block mt-1 uppercase tracking-widest">{div.divisionCode || 'NO-CODE'}</span>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-slate-800">{div.customer?.customerName || 'Unassigned'}</span>
                        {assignedUsers.length > 0 ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            <User size={12} className="text-emerald-500" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[120px]">
                              {assignedUsers.map(u => u.name).join(', ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 italic">No Authorized Staff</span>
                        )}
                      </div>
                    </td>
                    
                    <td className="p-5">
                      {div.address?.city || div.contactName ? (
                        <div className="flex flex-col gap-1">
                          {div.address?.city && (
                            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                              <MapPin size={12} className="text-slate-400 shrink-0" /> {div.address.city}{div.address.state ? `, ${div.address.state}` : ''}
                            </span>
                          )}
                          {div.contactName && (
                            <span className="text-[10px] font-bold text-slate-500 tracking-wide">{div.contactName}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-300 italic">No region configured</span>
                      )}
                    </td>
                    
                    <td className="p-5 text-center">
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 text-[9px] font-black rounded-lg tracking-widest uppercase border shadow-sm ${div.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {div.status || 'Active'}
                      </span>
                    </td>
                    
                    <td className="p-5 text-right">
                      {/* e.stopPropagation() prevents the row click from firing when interacting with these buttons */}
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleToggleStatus(div); }} className={`p-2 rounded-xl transition-all border ${div.status === 'Active' ? 'text-slate-500 bg-white border-slate-200 hover:text-slate-900 hover:border-slate-300 shadow-sm' : 'text-slate-400 bg-slate-50 border-slate-200 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50'}`} title={div.status === 'Active' ? "Deactivate" : "Activate"}>
                          {div.status === 'Active' ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); openEditModal(div); }} className="p-2 text-slate-500 bg-white border border-slate-200 rounded-xl hover:text-brand-gold hover:border-brand-gold/50 shadow-sm transition-all" title="Edit Division">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(div._id); }} className="p-2 text-slate-400 bg-white border border-slate-200 rounded-xl hover:text-red-600 hover:bg-red-50 hover:border-red-200 shadow-sm transition-all" title="Delete Division">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-400">
                    <Layers className="mx-auto mb-3 opacity-20" size={48} />
                    <p className="text-sm font-black uppercase tracking-widest mb-1">No Divisions Found</p>
                    <p className="text-xs font-bold">Use the button above to deploy a new division for this customer.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Overlay Modal for Add/Edit Form (Wrapped in Portal) --- */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 h-[100dvh] w-screen overflow-hidden">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
                onClick={() => !isSubmitting && setIsModalOpen(false)} 
              />
              
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.95, opacity: 0, y: 20 }} 
                transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
                className="relative w-full max-w-5xl max-h-[90dvh] flex flex-col bg-white/95 backdrop-blur-2xl border border-white rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                  <AddDivisionForm 
                    newDivision={formData} 
                    setNewDivision={setFormData} 
                    onSubmit={handleFormSubmit} 
                    staffList={orderPortalStaff} 
                    customersList={customers}
                    isSubmitting={isSubmitting}
                    onCancel={() => setIsModalOpen(false)}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}