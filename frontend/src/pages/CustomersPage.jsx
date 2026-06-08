import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Search, Download, Plus, ChevronRight, Package, Loader2, X
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { fetchCustomers, createCustomer } from '../store/slices/customerSlice';

export default function CustomersPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Connect to Redux State
  const { items: customersData, status, error } = useSelector((state) => state.customers);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');

  // Add Customer Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    contactName: '',
    contactEmail: '',
    contactNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zip: ''
  });

  // Fetch data when component mounts
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchCustomers());
    }
  }, [status, dispatch]);

  const filteredCustomers = useMemo(() => {
    return customersData.filter(c => {
      const name = c.customerName || '';
      const email = c.contactEmail || '';
      const currentStatus = c.status || 'Active'; 
      const currentCategory = c.category || 'Standard'; 

      const matchSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filterStatus === 'All' || currentStatus === filterStatus;
      const matchCategory = filterCategory === 'All' || currentCategory === filterCategory;
      
      return matchSearch && matchStatus && matchCategory;
    });
  }, [searchQuery, filterStatus, filterCategory, customersData]);

  // Handle Form Submission
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!formData.customerName) return; // Basic validation
    
    setIsSubmitting(true);

    // Format data to match backend schema exactly
    const payload = {
      customerName: formData.customerName,
      contactName: formData.contactName,
      contactEmail: formData.contactEmail,
      contactNumber: formData.contactNumber,
      address: {
        line1: formData.addressLine1,
        line2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        zip: formData.zip
      }
    };

    try {
      await dispatch(createCustomer(payload)).unwrap();
      // Reset form and close modal on success
      setFormData({
        customerName: '', contactName: '', contactEmail: '', contactNumber: '',
        addressLine1: '', addressLine2: '', city: '', state: '', zip: ''
      });
      setIsAddModalOpen(false);
    } catch (err) {
      console.error("Failed to create customer:", err);
      alert(`Error: ${err}`);
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

      {/* KPI Stats Bar */}
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

      {/* Advanced Control Panel */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-3xl flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input 
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs focus:ring-2 focus:ring-brand-gold/50 outline-none transition-all"
            placeholder="Search customer name or email..."
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <select className="px-3 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs font-bold outline-none" onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
          </select>
          <select className="px-3 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs font-bold outline-none" onChange={(e) => setFilterCategory(e.target.value)}>
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
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-md"
          >
            <Plus size={14} /> Add Customer
          </button>
        </div>
      </div>

      {/* State Handling (Loading & Error) */}
      {status === 'loading' && (
        <div className="flex justify-center items-center py-20 text-slate-400">
          <Loader2 className="animate-spin" size={32} />
        </div>
      )}

      {status === 'failed' && (
        <div className="bg-red-50 text-red-600 p-6 rounded-3xl text-center text-sm font-bold border border-red-200 shadow-sm">
          Failed to load customers: {error}
        </div>
      )}

      {/* Main Table */}
      {status === 'succeeded' && (
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/50 text-[10px] uppercase font-black text-slate-500 border-b border-white/40">
                <th className="p-4 w-[30%]">Customer Identity</th>
                <th className="p-4 w-[15%]">Category</th>
                <th className="p-4 w-[15%]">Open Orders</th>
                <th className="p-4 w-[25%]">Location</th>
                <th className="p-4 w-[10%]">Status</th>
                <th className="p-4 w-[5%] text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => {
                  const location = customer.address ? `${customer.address.city || ''}, ${customer.address.state || ''}`.trim().replace(/^,|,$/g, '') : 'N/A';
                  const displayStatus = customer.status || 'Active';
                  const openOrders = customer.openOrders || 0;

                  return (
                    <tr key={customer._id} onClick={() => navigate(`/customers/${customer._id}`)} className="hover:bg-white/60 transition-colors cursor-pointer group">
                      <td className="p-4">
                        <div className="font-bold text-sm text-slate-900 truncate">{customer.customerName}</div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{customer.contactEmail || 'No email provided'}</div>
                      </td>
                      <td className="p-4 font-medium text-slate-600">{customer.category || 'Standard'}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 font-bold ${openOrders > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                            <Package size={14} /> {openOrders}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 truncate">{location || 'No location set'}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          displayStatus === 'Active' ? 'bg-emerald-100 text-emerald-700' : 
                          displayStatus === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                        }`}>{displayStatus}</span>
                      </td>
                      <td className="p-4 text-right">
                        <ChevronRight size={18} className="text-slate-400 group-hover:text-brand-gold ml-auto transition-colors" />
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-500 font-bold bg-white/10">
                    No customers found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Customer Modal */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${isAddModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isSubmitting && setIsAddModalOpen(false)} />
        
        <div className={`relative w-full max-w-2xl bg-white/95 backdrop-blur-xl border border-white/50 p-6 md:p-8 rounded-3xl shadow-2xl transition-transform duration-300 ${isAddModalOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Register New Customer</h2>
              <p className="text-xs font-medium text-slate-500 mt-1">Add a new partner to your fulfillment network.</p>
            </div>
            <button onClick={() => !isSubmitting && setIsAddModalOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Customer / Company Name <span className="text-red-500">*</span></label>
                <input required type="text" value={formData.customerName} onChange={(e) => setFormData({...formData, customerName: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all" placeholder="e.g. Global Feeds Corp" />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Primary Contact Name</label>
                <input type="text" value={formData.contactName} onChange={(e) => setFormData({...formData, contactName: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all" placeholder="John Doe" />
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Contact Email</label>
                <input type="email" value={formData.contactEmail} onChange={(e) => setFormData({...formData, contactEmail: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all" placeholder="john@company.com" />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Phone Number</label>
                <input type="text" value={formData.contactNumber} onChange={(e) => setFormData({...formData, contactNumber: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all" placeholder="(555) 123-4567" />
              </div>

              <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-900 mb-3 block">Corporate Address</label>
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Address Line 1</label>
                <input type="text" value={formData.addressLine1} onChange={(e) => setFormData({...formData, addressLine1: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all" placeholder="123 Logistics Way" />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Address Line 2 (Optional)</label>
                <input type="text" value={formData.addressLine2} onChange={(e) => setFormData({...formData, addressLine2: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all" placeholder="Suite 400" />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">City</label>
                <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all" placeholder="Chicago" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">State / Prov</label>
                  <input type="text" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all" placeholder="IL" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">ZIP / Postal</label>
                  <input type="text" value={formData.zip} onChange={(e) => setFormData({...formData, zip: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all" placeholder="60601" />
                </div>
              </div>
            </div>

            <div className="pt-6 flex gap-3">
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-[2] flex justify-center items-center gap-2 px-4 py-3 bg-brand-gold hover:bg-brand-gold-hover text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-gold/20 transition-all disabled:opacity-70"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Register Customer Node'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
    </div>
  );
}