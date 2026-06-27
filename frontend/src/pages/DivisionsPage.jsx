import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, Plus, Search, Filter, Edit2, Trash2, 
  ToggleLeft, ToggleRight, Loader2, AlertTriangle, RefreshCw, MapPin, User 
} from 'lucide-react';
import { toast } from 'sonner';

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

  // --- Redux State ---
  const { items: divisions = [], status: divStatus, error: divError } = useSelector(state => state.divisions || {});
  const { items: customers = [], status: custStatus } = useSelector(state => state.customers || {});
  const { items: users = [], status: userStatus } = useSelector(state => state.users || {});

  const loadAllData = () => {
    if (divStatus === 'idle' || divStatus === 'failed') dispatch(fetchDivisions());
    if (custStatus === 'idle' || custStatus === 'failed') dispatch(fetchCustomers());
    if (userStatus === 'idle' || userStatus === 'failed') dispatch(fetchUsers());
  };

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const isGlobalLoading = [divStatus, custStatus, userStatus].some(s => s === 'idle' || s === 'loading');
  const hasGlobalError = [divStatus, custStatus, userStatus].some(s => s === 'failed');

  // Filter Order Portal Staff for Managers
  const orderPortalStaff = useMemo(() => users.filter(user => user.portal === 'order'), [users]);

  // --- UI & Filter State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'Active', 'Inactive'

  // --- Form State Management ---
  const INITIAL_FORM_STATE = { 
    divisionName: '', divisionCode: '', managers: [], status: 'Active', customer: '',
    contactName: '', contactEmail: '', contactNumber: '', line1: '', line2: '', city: '', state: '', zip: ''
  };
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Data Filtering ---
  const filteredDivisions = useMemo(() => {
    if (!Array.isArray(divisions)) return [];
    return divisions.filter(div => {
      const searchTarget = searchTerm.toLowerCase();
      const matchesSearch = [
        div.divisionName, div.divisionCode, div.customer?.customerName
      ].some(val => val?.toLowerCase().includes(searchTarget));

      const matchesCustomer = customerFilter === 'All' || (div.customer?._id || div.customer) === customerFilter;
      const matchesStatus = statusFilter === 'All' || div.status === statusFilter;

      return matchesSearch && matchesCustomer && matchesStatus;
    }).sort((a, b) => a.divisionName.localeCompare(b.divisionName));
  }, [divisions, searchTerm, customerFilter, statusFilter]);

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
        // Clean user references
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

      // Sync Users (M2M)
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
  if (hasGlobalError && !isGlobalLoading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50 p-8 rounded-3xl text-center shadow-lg border border-red-200">
          <AlertTriangle className="text-red-500 mb-4 mx-auto" size={40} />
          <h2 className="text-red-800 text-lg font-black mb-2">Sync Failed</h2>
          <p className="text-red-600/80 text-xs font-medium mb-6">{divError || 'Check connection.'}</p>
          <button onClick={loadAllData} className="flex mx-auto items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl text-xs font-black uppercase">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (isGlobalLoading) {
    return (
      <div className="h-full flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-brand-gold" size={36} />
        <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Loading Divisions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in-right relative max-w-[1500px] mx-auto p-6 pb-20">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 rounded-[2rem] p-6 md:p-8 shadow-2xl border border-slate-800/60 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-gold/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Layers className="text-brand-gold" size={32} /> Division Directory
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
        <div className="flex-1 min-w-[180px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1 flex items-center gap-1.5"><Filter size={10} className="text-brand-gold"/> Depositor / Customer</label>
          <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className="w-full px-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-gold/50 outline-none cursor-pointer">
            <option value="All">All Customers</option>
            {customers.map(c => <option key={c._id} value={c._id}>{c.customerName}</option>)}
          </select>
        </div>
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
                  <tr key={div._id} className={`hover:bg-white/60 transition-colors group ${div.status !== 'Active' && 'opacity-60 grayscale-[30%]'}`}>
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                          <Layers size={18} className="text-slate-400" />
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
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleToggleStatus(div)} className={`p-2 rounded-xl transition-all border ${div.status === 'Active' ? 'text-slate-500 bg-white border-slate-200 hover:text-slate-900 hover:border-slate-300 shadow-sm' : 'text-slate-400 bg-slate-50 border-slate-200 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50'}`} title={div.status === 'Active' ? "Deactivate" : "Activate"}>
                          {div.status === 'Active' ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
                        </button>
                        <button onClick={() => openEditModal(div)} className="p-2 text-slate-500 bg-white border border-slate-200 rounded-xl hover:text-brand-gold hover:border-brand-gold/50 shadow-sm transition-all" title="Edit Division">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(div._id)} className="p-2 text-slate-400 bg-white border border-slate-200 rounded-xl hover:text-red-600 hover:bg-red-50 hover:border-red-200 shadow-sm transition-all" title="Delete Division">
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
                    <p className="text-xs font-bold">Try adjusting your filters or search term.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Overlay Modal for Add/Edit Form --- */}
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
                customersList={customers} // Passing customers allows the dropdown to appear
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