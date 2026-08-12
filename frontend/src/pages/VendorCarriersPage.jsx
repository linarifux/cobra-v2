import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  Truck, Plus, Search, Edit2, Trash2, Loader2, X, Save, ArrowLeft 
} from 'lucide-react';

import { fetchVendorCarriers, createVendorCarrier, updateVendorCarrier, deleteVendorCarrier } from '../store/slices/vendorCarrierSlice';
import { useConfirm } from '../providers/ConfirmProvider';

const INITIAL_FORM_STATE = {
  carrierName: '', 
  isActive: true 
};

export default function VendorCarriersPage() {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const navigate = useNavigate();
  
  const { items: carriers = [], status } = useSelector(state => state.vendorCarriers || {});
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchVendorCarriers());
  }, [status, dispatch]);

  const filteredCarriers = useMemo(() => {
    return carriers.filter(c => 
      c.carrierName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [carriers, searchQuery]);

  const openModal = (carrier = null) => {
    if (carrier) {
      setEditingId(carrier._id);
      setFormData({
        carrierName: carrier.carrierName || '',
        isActive: carrier.isActive ?? true
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
    if (!formData.carrierName) return toast.error("Carrier Name is required.");
    setIsSubmitting(true);
    try {
      if (editingId) {
        await dispatch(updateVendorCarrier({ id: editingId, data: formData })).unwrap();
        toast.success("Carrier updated successfully.");
      } else {
        await dispatch(createVendorCarrier(formData)).unwrap();
        toast.success("Carrier created successfully.");
      }
      closeModal();
    } catch (err) {
      toast.error(`Error saving carrier: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Carrier?',
      message: 'Are you sure you want to permanently delete this carrier?',
      confirmText: 'Delete Carrier',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        await dispatch(deleteVendorCarrier(id)).unwrap();
        toast.success("Carrier deleted successfully.");
      } catch (err) {
        toast.error(`Failed to delete carrier: ${err}`);
      }
    }
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all placeholder:font-medium placeholder:text-slate-400";
  const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1 mb-1.5";

  return (
    <div className="h-full max-w-[1000px] mx-auto p-4 sm:p-6 space-y-6 animate-fade-in relative">
      
      {/* Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-sm pb-2 w-full overflow-hidden">
        <button 
          onClick={() => navigate('/vendors')}
          className="flex items-center justify-center sm:justify-start gap-2 text-slate-600 font-bold hover:text-slate-900 transition-all bg-white/40 backdrop-blur-md px-4 py-2 border border-white/60 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-white/60 w-max shrink-0"
        >
          <ArrowLeft className="h-4 w-4" /> <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Back to Vendors</span>
        </button>
        <div className="flex items-center gap-2 text-slate-400 font-bold bg-white/30 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/40 overflow-x-auto whitespace-nowrap custom-scrollbar shrink-0 text-[10px] uppercase tracking-widest">
          <Link to="/receiving" className="hover:text-brand-gold transition-colors">Receiving</Link>
          <span>/</span>
          <Link to="/vendors" className="hover:text-brand-gold transition-colors">Vendors</Link>
          <span>/</span>
          <span className="text-slate-900">Carriers</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-brand-gold/10 rounded-xl">
              <Truck className="text-brand-gold" size={24} />
            </div>
            Carrier Management
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Manage inbound logistics providers and courier services.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search carriers..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/60 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-brand-gold transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-slate-900/20 shrink-0"
          >
            <Plus size={16} /> Add Carrier
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[600px] border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-200/60 backdrop-blur-xl">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[60%]">Carrier Name</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[20%] text-center">Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[20%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {status === 'loading' && carriers.length === 0 ? (
                <tr><td colSpan="3" className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-brand-gold" size={32} /></td></tr>
              ) : filteredCarriers.length > 0 ? (
                filteredCarriers.map((carrier) => (
                  <tr key={carrier._id} className="hover:bg-white/60 transition-colors duration-200 group">
                    <td className="px-6 py-4">
                      <p className="font-black text-sm text-slate-900 tracking-tight truncate flex items-center gap-3">
                        <div className="p-1.5 bg-slate-100 rounded-lg border border-slate-200/60 text-slate-400">
                           <Truck size={14} />
                        </div>
                        {carrier.carrierName}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-sm ${carrier.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {carrier.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(carrier)} className="p-2 text-slate-400 hover:text-blue-600 bg-white/50 hover:bg-blue-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-blue-100"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(carrier._id)} className="p-2 text-slate-400 hover:text-red-600 bg-white/50 hover:bg-red-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-red-100"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="p-12 text-center text-slate-500 font-bold text-sm bg-white/10">No carriers found.</td>
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
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 max-h-[90dvh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-brand-gold/10 text-brand-gold rounded-xl flex items-center justify-center shadow-inner border border-brand-gold/20">
                    <Truck size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">{editingId ? "Edit Carrier" : "Create Carrier"}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Logistics Configuration</p>
                  </div>
                </div>
                <button onClick={closeModal} disabled={isSubmitting} className="h-8 w-8 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-full flex items-center justify-center transition-colors shadow-sm shrink-0">
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Carrier Details</h3>
                  <div className="flex flex-col gap-5">
                    <div>
                      <label className={labelClass}><Truck size={12} /> Carrier Name <span className="text-red-400">*</span></label>
                      <input type="text" value={formData.carrierName} onChange={e => setFormData({...formData, carrierName: e.target.value})} className={inputClass} placeholder="e.g. FedEx Freight" />
                    </div>
                    <div className="flex items-center pl-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 accent-emerald-500 rounded border-slate-300" />
                        Active Carrier
                      </label>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-slate-100 bg-white flex gap-3">
                <button onClick={closeModal} disabled={isSubmitting} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={isSubmitting || !formData.carrierName} className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editingId ? "Save Changes" : "Create Carrier"}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}