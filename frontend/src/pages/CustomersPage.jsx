import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom'; // CRITICAL FIX
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Search, Download, Plus, Package, Loader2, X,
  Building2, Edit2, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

import PageHeader from '../components/PageHeader';
import { useConfirm } from '../providers/ConfirmProvider';
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer } from '../store/slices/customerSlice';
import { AnimatePresence } from 'framer-motion';

const INITIAL_FORM_STATE = {
  customerName: '',
  contactName: '',
  contactEmail: '',
  contactNumber: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zip: ''
};

export default function CustomersPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const confirm = useConfirm();
  
  const { items: customersData = [], status, error } = useSelector((state) => state.customers);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Guarantee fresh data on mount if the state was reset by navigating back from Details page
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchCustomers());
    }
  }, [status, dispatch]);

  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customersData)) return [];

    return customersData.filter((c) => {
      const name = c?.customerName?.toLowerCase() || '';
      const email = c?.contactEmail?.toLowerCase() || '';
      const query = searchQuery.toLowerCase();
      
      const currentStatus = c?.status || 'Active'; 
      const currentCategory = c?.category || 'Standard'; 

      const matchSearch = name.includes(query) || email.includes(query);
      const matchStatus = filterStatus === 'All' || currentStatus === filterStatus;
      const matchCategory = filterCategory === 'All' || currentCategory === filterCategory;
      
      return matchSearch && matchStatus && matchCategory;
    });
  }, [searchQuery, filterStatus, filterCategory, customersData]);

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData(INITIAL_FORM_STATE);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setIsEditMode(true);
    setEditingId(customer._id);
    setFormData({
      customerName: customer.customerName || '',
      contactName: customer.contactName || '',
      contactEmail: customer.contactEmail || '',
      contactNumber: customer.contactNumber || '',
      addressLine1: customer.address?.line1 || '',
      addressLine2: customer.address?.line2 || '',
      city: customer.address?.city || '',
      state: customer.address?.state || '',
      zip: customer.address?.zip || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteCustomer = async (id, name) => {
    const isConfirmed = await confirm({
      title: 'Delete Customer?',
      message: `Are you sure you want to permanently delete "${name}"? This action will cascade and remove all associated divisions, configurations, and data.`,
      confirmText: 'Delete Customer',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        const actionPromise = dispatch(deleteCustomer(id)).unwrap();
        toast.promise(actionPromise, {
          loading: 'Deleting customer...',
          success: 'Customer successfully deleted.',
          error: 'Failed to delete customer.'
        });
        await actionPromise;
      } catch (err) {
        console.error("Delete Error:", err);
      }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerName.trim()) {
      toast.error("Customer Name is required.");
      return; 
    }
    
    setIsSubmitting(true);

    const payload = {
      customerName: formData.customerName.trim(),
      contactName: formData.contactName.trim(),
      contactEmail: formData.contactEmail.trim(),
      contactNumber: formData.contactNumber.trim(),
      address: {
        line1: formData.addressLine1.trim(),
        line2: formData.addressLine2.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zip: formData.zip.trim()
      }
    };

    try {
      let actionPromise;
      if (isEditMode) {
        actionPromise = dispatch(updateCustomer({ id: editingId, customerData: payload })).unwrap();
        toast.promise(actionPromise, { loading: 'Saving updates...', success: 'Profile updated successfully.', error: 'Failed to update.' });
      } else {
        actionPromise = dispatch(createCustomer(payload)).unwrap();
        toast.promise(actionPromise, { loading: 'Registering customer...', success: 'Customer node created.', error: 'Failed to create.' });
      }
      
      await actionPromise;
      setFormData(INITIAL_FORM_STATE);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Operation failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full p-6 space-y-6 relative">
      <PageHeader 
        title="Customer Directory" 
        subtitle="Manage your customer base, categories, and active order volumes." 
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Partners', val: customersData.length.toString(), color: 'text-emerald-600' },
          { label: 'Open Orders', val: '16', color: 'text-indigo-600' },
          { label: 'Pending Approvals', val: '3', color: 'text-amber-600' },
          { label: 'Total Spend (YTD)', val: '$1.2M', color: 'text-slate-900' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/50 border border-white/60 p-4 rounded-2xl backdrop-blur-md shadow-sm">
            <p className="text-[10px] uppercase font-black text-slate-400">{stat.label}</p>
            <p className={`text-xl font-black ${stat.color}`}>{stat.val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-3xl flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input 
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs focus:ring-2 focus:ring-brand-gold/50 outline-none transition-all"
            placeholder="Search customer name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <select 
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs font-bold outline-none cursor-pointer" 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
          </select>
          <select 
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs font-bold outline-none cursor-pointer" 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Courier">Courier</option>
            <option value="Supplier">Supplier</option>
            <option value="Manufacturer">Manufacturer</option>
            <option value="Standard">Standard</option>
          </select>
          <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
            <Download size={14} /> Export
          </button>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-md"
          >
            <Plus size={14} /> Add Customer
          </button>
        </div>
      </div>

      {status === 'loading' && customersData.length === 0 && (
        <div className="flex justify-center items-center py-20 text-slate-400">
          <Loader2 className="animate-spin text-brand-gold" size={32} />
        </div>
      )}

      {status === 'failed' && (
        <div className="bg-red-50 text-red-600 p-6 rounded-3xl text-center text-sm font-bold border border-red-200 shadow-sm">
          Failed to load customers: {error}
        </div>
      )}

      {status !== 'failed' && (customersData.length > 0 || status === 'succeeded') && (
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl overflow-hidden shadow-sm animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-100/50 text-[10px] uppercase font-black text-slate-500 border-b border-white/40">
                  <th className="p-4 w-[30%]">Customer Identity</th>
                  <th className="p-4 w-[15%]">Category</th>
                  <th className="p-4 w-[15%]">Open Orders</th>
                  <th className="p-4 w-[25%]">Location</th>
                  <th className="p-4 w-[10%]">Status</th>
                  <th className="p-4 w-[15%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => {
                    const location = [customer.address?.city, customer.address?.state]
                      .filter(Boolean)
                      .join(', ') || 'No location set';
                    
                    const displayStatus = customer.status || 'Active';
                    const openOrders = customer.openOrders || 0;

                    return (
                      <tr 
                        key={customer._id} 
                        className="hover:bg-white/60 transition-colors group"
                      >
                        <td className="p-4">
                          <button
                            onClick={() => navigate(`/customers/${customer._id}/divisions`)} 
                            className="font-bold text-sm text-slate-900 truncate max-w-[200px] hover:text-brand-gold transition-colors text-left"
                            title="Manage Divisions"
                          >
                            {customer.customerName}
                          </button>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[200px]">{customer.contactEmail || 'No email provided'}</div>
                        </td>
                        <td className="p-4 font-medium text-slate-600">{customer.category || 'Standard'}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 font-bold ${openOrders > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                              <Package size={14} /> {openOrders}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 truncate max-w-[150px]">{location}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            displayStatus === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                            displayStatus === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 
                            'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {displayStatus}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => navigate(`/customers/${customer._id}/divisions`)}
                              className="p-1.5 text-slate-400 bg-white border border-slate-200 rounded-lg hover:text-brand-gold hover:border-brand-gold/50 shadow-sm transition-all" 
                              title="Manage Divisions"
                            >
                              <Building2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleOpenEdit(customer)}
                              className="p-1.5 text-slate-400 bg-white border border-slate-200 rounded-lg hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 shadow-sm transition-all" 
                              title="Edit Customer"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteCustomer(customer._id, customer.customerName)}
                              className="p-1.5 text-slate-400 bg-white border border-slate-200 rounded-lg hover:text-red-600 hover:border-red-200 hover:bg-red-50 shadow-sm transition-all" 
                              title="Delete Customer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-500 font-bold bg-white/40">
                      No customers found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CRITICAL FIX: Add/Edit Customer Modal correctly Portal'd to prevent clipping/trapping bugs */}
      <AnimatePresence>
        {isModalOpen && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 h-[100dvh] w-screen overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              onClick={() => !isSubmitting && setIsModalOpen(false)} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
              className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200 max-h-[90dvh]"
            >
              <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {isEditMode ? 'Edit Customer Profile' : 'Register New Customer'}
                  </h2>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    {isEditMode ? 'Update the details for this partner.' : 'Add a new partner to your fulfillment network.'}
                  </p>
                </div>
                <button 
                  onClick={() => !isSubmitting && setIsModalOpen(false)} 
                  className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-colors shadow-sm"
                >
                  <X size={18} />
                </button>
              </div>
              
              <form onSubmit={handleFormSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Customer / Company Name <span className="text-red-500">*</span></label>
                    <input required type="text" value={formData.customerName} onChange={(e) => setFormData({...formData, customerName: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm font-semibold outline-none focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 transition-all placeholder:text-slate-400" placeholder="e.g. Global Feeds Corp" disabled={isSubmitting} />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Primary Contact Name</label>
                    <input type="text" value={formData.contactName} onChange={(e) => setFormData({...formData, contactName: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm font-semibold outline-none focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 transition-all placeholder:text-slate-400" placeholder="John Doe" disabled={isSubmitting} />
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Contact Email</label>
                    <input type="email" value={formData.contactEmail} onChange={(e) => setFormData({...formData, contactEmail: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm font-semibold outline-none focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 transition-all placeholder:text-slate-400" placeholder="john@company.com" disabled={isSubmitting} />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Phone Number</label>
                    <input type="text" value={formData.contactNumber} onChange={(e) => setFormData({...formData, contactNumber: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm font-semibold outline-none focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 transition-all placeholder:text-slate-400" placeholder="(555) 123-4567" disabled={isSubmitting} />
                  </div>

                  <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-900 mb-3 block">Corporate Address</label>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Address Line 1</label>
                    <input type="text" value={formData.addressLine1} onChange={(e) => setFormData({...formData, addressLine1: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm font-semibold outline-none focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 transition-all placeholder:text-slate-400" placeholder="123 Logistics Way" disabled={isSubmitting} />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Address Line 2 (Optional)</label>
                    <input type="text" value={formData.addressLine2} onChange={(e) => setFormData({...formData, addressLine2: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm font-semibold outline-none focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 transition-all placeholder:text-slate-400" placeholder="Suite 400" disabled={isSubmitting} />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">City</label>
                    <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm font-semibold outline-none focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 transition-all placeholder:text-slate-400" placeholder="Chicago" disabled={isSubmitting} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">State / Prov</label>
                      <input type="text" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm font-semibold outline-none focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 transition-all placeholder:text-slate-400" placeholder="IL" disabled={isSubmitting} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">ZIP / Postal</label>
                      <input type="text" value={formData.zip} onChange={(e) => setFormData({...formData, zip: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm font-semibold outline-none focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 transition-all placeholder:text-slate-400" placeholder="60601" disabled={isSubmitting} />
                    </div>
                  </div>
                </div>

                <div className="pt-6 pb-2 flex gap-3 shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting || !formData.customerName.trim()}
                    className="flex-[2] flex justify-center items-center gap-2 px-4 py-3.5 bg-slate-900 hover:bg-slate-800 text-brand-gold rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-slate-900/20 transition-all disabled:opacity-70 active:scale-95"
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (isEditMode ? 'Save Updates' : 'Register Customer Node')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
      
    </div>
  );
}