import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Search, Download, Plus, ChevronRight, Package, Loader2
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { fetchCustomers } from '../store/slices/customerSlice';

export default function CustomersPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Connect to Redux State
  const { items: customersData, status, error } = useSelector((state) => state.customers);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');

  // Fetch data when component mounts
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchCustomers());
    }
  }, [status, dispatch]);

  const filteredCustomers = useMemo(() => {
    return customersData.filter(c => {
      // Map backend fields safely
      const name = c.customerName || '';
      const email = c.contactEmail || '';
      const currentStatus = c.status || 'Active'; // Fallback if not in DB schema
      const currentCategory = c.category || 'Standard'; // Fallback if not in DB schema

      const matchSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filterStatus === 'All' || currentStatus === filterStatus;
      const matchCategory = filterCategory === 'All' || currentCategory === filterCategory;
      
      return matchSearch && matchStatus && matchCategory;
    });
  }, [searchQuery, filterStatus, filterCategory, customersData]);

  return (
    <div className="h-full p-6 space-y-6">
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
          <div key={i} className="bg-white/50 border border-white/60 p-4 rounded-2xl backdrop-blur-md">
            <p className="text-[10px] uppercase font-black text-slate-400">{stat.label}</p>
            <p className={`text-xl font-black ${stat.color}`}>{stat.val}</p>
          </div>
        ))}
      </div>

      {/* Advanced Control Panel */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-3xl flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input 
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs"
            placeholder="Search customer name or email..."
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <select className="px-3 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs font-bold" onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
          </select>
          <select className="px-3 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs font-bold" onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="All">All Categories</option>
            <option value="Courier">Courier</option>
            <option value="Supplier">Supplier</option>
            <option value="Manufacturer">Manufacturer</option>
            <option value="Standard">Standard</option>
          </select>
          <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50">
            <Download size={14} /> Export
          </button>
          <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800">
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
        <div className="bg-red-50 text-red-600 p-6 rounded-3xl text-center text-sm font-bold border border-red-200">
          Failed to load customers: {error}
        </div>
      )}

      {/* Main Table */}
      {status === 'succeeded' && (
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/50 text-[10px] uppercase font-black text-slate-500">
                <th className="p-4">Customer</th>
                <th className="p-4">Category</th>
                <th className="p-4">Open Orders</th>
                <th className="p-4">Location</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">View</th>
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
                        <div className="font-bold text-slate-900">{customer.customerName}</div>
                        <div className="text-[10px] text-slate-400">{customer.contactEmail || 'No email provided'}</div>
                      </td>
                      <td className="p-4 font-medium text-slate-600">{customer.category || 'Standard'}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 font-bold ${openOrders > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                            <Package size={12} /> {openOrders}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">{location || 'No location set'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                          displayStatus === 'Active' ? 'bg-emerald-100 text-emerald-700' : 
                          displayStatus === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                        }`}>{displayStatus}</span>
                      </td>
                      <td className="p-4 text-right">
                        <ChevronRight size={16} className="text-slate-400 group-hover:text-brand-gold ml-auto" />
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    No customers found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}