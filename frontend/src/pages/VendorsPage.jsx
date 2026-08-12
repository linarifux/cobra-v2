import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  Store, Plus, Search, Edit2, Trash2, MapPin, 
  Phone, Mail, Loader2, X, Save, Building2, ArrowLeft, Truck
} from 'lucide-react';

import { fetchVendors, createVendor, updateVendor, deleteVendor } from '../store/slices/vendorSlice';
import { useConfirm } from '../providers/ConfirmProvider';

const INITIAL_FORM_STATE = {
  vendorName: '', contactName: '', email: '', phone: '',
  address: { street: '', city: '', state: '', zipCode: '', country: 'US' },
  isActive: true, notes: ''
};

export default function VendorsPage() {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const navigate = useNavigate();
  
  const { items: vendors = [], status } = useSelector(state => state.vendors || {});
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchVendors());
  }, [status, dispatch]);

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => 
      v.vendorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [vendors, searchQuery]);

  const openModal = (vendor = null) => {
    if (vendor) {
      setEditingId(vendor._id);
      setFormData({
        vendorName: vendor.vendorName || '',
        contactName: vendor.contactName || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        address: vendor.address || INITIAL_FORM_STATE.address,
        isActive: vendor.isActive ?? true,
        notes: vendor.notes || ''
      });
    } else {
      setEditingId(null);
      setFormData(INITIAL_FORM_STATE);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(INITIAL_FORM_STATE);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.vendorName) return toast.error("Vendor Name is required.");
    setIsSubmitting(true);
    try {
      if (editingId) {
        await dispatch(updateVendor({ id: editingId, vendorData: formData })).unwrap();
        toast.success("Vendor updated successfully.");
      } else {
        await dispatch(createVendor(formData)).unwrap();
        toast.success("Vendor created successfully.");
      }
      closeModal();
    } catch (err) {
      toast.error(`Error saving vendor: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Vendor?',
      message: 'Are you sure you want to permanently delete this vendor?',
      confirmText: 'Delete Vendor',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        await dispatch(deleteVendor(id)).unwrap();
        toast.success("Vendor deleted successfully.");
      } catch (err) {
        toast.error(`Failed to delete vendor: ${err}`);
      }
    }
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all placeholder:font-medium placeholder:text-slate-400";
  const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1 mb-1.5";

  return (
    <div className="h-full max-w-[1400px] mx-auto p-4 sm:p-6 space-y-6 animate-fade-in relative">
      
      {/* Breadcrumbs & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-sm pb-2 w-full overflow-hidden">
        <button 
          onClick={() => navigate('/receiving')}
          className="flex items-center justify-center sm:justify-start gap-2 text-slate-600 font-bold hover:text-slate-900 transition-all bg-white/40 backdrop-blur-md px-4 py-2 border border-white/60 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-white/60 w-max shrink-0"
        >
          <ArrowLeft className="h-4 w-4" /> <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Back to Receiving</span>
        </button>
        <div className="flex items-center gap-2 text-slate-400 font-bold bg-white/30 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/40 overflow-x-auto whitespace-nowrap custom-scrollbar shrink-0 text-[10px] uppercase tracking-widest">
          <Link to="/receiving" className="hover:text-brand-gold transition-colors">Receiving</Link>
          <span>/</span>
          <span className="text-slate-900">Vendors</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-brand-gold/10 rounded-xl">
              <Store className="text-brand-gold" size={24} />
            </div>
            Supplier Directory
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Manage inbound vendors and supplier contacts for receiving.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search vendors..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-brand-gold transition-all shadow-sm"
            />
          </div>
          
          {/* NEW: Manage Carriers Button */}
          <button 
            onClick={() => navigate('/vendor-carriers')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white/60 hover:bg-white border border-slate-200 text-slate-600 hover:text-brand-gold rounded-xl text-xs font-black uppercase tracking-widest shadow-sm transition-all shrink-0 backdrop-blur-md"
          >
            <Truck size={16} /> <span className="hidden sm:inline">Manage</span> Carriers
          </button>

          <button 
            onClick={() => openModal()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-slate-900/20 shrink-0"
          >
            <Plus size={16} /> Add Vendor
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[900px] border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-200/60 backdrop-blur-xl">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[25%]">Vendor Details</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[25%]">Contact Info</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[30%]">Address</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[10%] text-center">Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[10%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {status === 'loading' && vendors.length === 0 ? (
                <tr><td colSpan="5" className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-brand-gold" size={32} /></td></tr>
              ) : filteredVendors.length > 0 ? (
                filteredVendors.map((vendor) => (
                  <tr key={vendor._id} className="hover:bg-white/60 transition-colors duration-200 group">
                    <td className="px-6 py-4">
                      <p className="font-black text-sm text-slate-900 tracking-tight truncate">{vendor.vendorName}</p>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      {vendor.contactName && <p className="text-xs font-bold text-slate-700 truncate">{vendor.contactName}</p>}
                      {vendor.email && <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 truncate"><Mail size={10}/> {vendor.email}</p>}
                      {vendor.phone && <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 truncate"><Phone size={10}/> {vendor.phone}</p>}
                    </td>
                    <td className="px-6 py-4">
                      {vendor.address?.street ? (
                        <p className="text-xs font-medium text-slate-600 flex items-start gap-1.5">
                          <MapPin size={12} className="mt-0.5 text-slate-400 shrink-0"/>
                          <span className="line-clamp-2 leading-relaxed">
                            {vendor.address.street}, {vendor.address.city}, {vendor.address.state} {vendor.address.zipCode}
                          </span>
                        </p>
                      ) : <span className="text-xs text-slate-400 italic">No address on file</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-sm ${vendor.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {vendor.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(vendor)} className="p-2 text-slate-400 hover:text-blue-600 bg-white/50 hover:bg-blue-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-blue-100"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(vendor._id)} className="p-2 text-slate-400 hover:text-red-600 bg-white/50 hover:bg-red-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-red-100"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500 font-bold text-sm bg-white/10">No vendors found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 h-[100dvh] w-screen">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 max-h-[90dvh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-brand-gold/10 text-brand-gold rounded-xl flex items-center justify-center shadow-inner border border-brand-gold/20">
                    <Store size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">{editingId ? "Edit Vendor" : "Create Vendor"}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Supplier Configuration</p>
                  </div>
                </div>
                <button onClick={closeModal} disabled={isSubmitting} className="h-8 w-8 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-full flex items-center justify-center transition-colors shadow-sm shrink-0">
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Core Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-1 sm:col-span-2">
                      <label className={labelClass}><Building2 size={12} /> Vendor Name <span className="text-red-400">*</span></label>
                      <input type="text" value={formData.vendorName} onChange={e => setFormData({...formData, vendorName: e.target.value})} className={inputClass} placeholder="Supplier Inc." />
                    </div>
                    <div>
                      <label className={labelClass}>Contact Person</label>
                      <input type="text" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} className={inputClass} placeholder="John Doe" />
                    </div>
                    <div>
                      <label className={labelClass}>Email Address</label>
                      <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={inputClass} placeholder="john@supplier.com" />
                    </div>
                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={inputClass} placeholder="(555) 123-4567" />
                    </div>
                    <div className="flex items-center pt-5 pl-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 accent-emerald-500 rounded border-slate-300" />
                        Active Vendor
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Location</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className={labelClass}>Street Address</label>
                      <input type="text" value={formData.address.street} onChange={e => setFormData({...formData, address: {...formData.address, street: e.target.value}})} className={inputClass} placeholder="123 Industrial Pkwy" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className={labelClass}>City</label>
                      <input type="text" value={formData.address.city} onChange={e => setFormData({...formData, address: {...formData.address, city: e.target.value}})} className={inputClass} placeholder="New York" />
                    </div>
                    <div className="col-span-1 sm:col-span-1">
                      <label className={labelClass}>State (2-Letter)</label>
                      <input type="text" maxLength="2" value={formData.address.state} onChange={e => setFormData({...formData, address: {...formData.address, state: e.target.value.toUpperCase()}})} className={inputClass} placeholder="NY" />
                    </div>
                    <div className="col-span-1 sm:col-span-1">
                      <label className={labelClass}>Zip Code</label>
                      <input type="text" value={formData.address.zipCode} onChange={e => setFormData({...formData, address: {...formData.address, zipCode: e.target.value}})} className={inputClass} placeholder="10001" />
                    </div>
                    <div className="col-span-1 sm:col-span-1">
                      <label className={labelClass}>Country</label>
                      <input type="text" value={formData.address.country} onChange={e => setFormData({...formData, address: {...formData.address, country: e.target.value}})} className={inputClass} placeholder="US" />
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-slate-100 bg-white flex gap-3">
                <button onClick={closeModal} disabled={isSubmitting} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={isSubmitting || !formData.vendorName} className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editingId ? "Save Changes" : "Create Vendor"}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}