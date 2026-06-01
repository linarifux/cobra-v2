import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Mail, Phone, MapPin, Building, 
  Plus, ChevronRight, Filter, Download, Package 
} from 'lucide-react';
import PageHeader from '../components/PageHeader';

export default function CustomersPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');

  const customersData = [
    { id: 'C-001', name: 'Global Logistics Corp', email: 'ops@globallog.com', phone: '+1 (555) 123-4567', address: 'Chicago, IL', status: 'Active', category: 'Courier', openOrders: 12 },
    { id: 'C-002', name: 'Packaging Solutions Inc', email: 'sales@packsol.net', phone: '+1 (555) 987-6543', address: 'Austin, TX', status: 'Active', category: 'Supplier', openOrders: 4 },
    { id: 'C-003', name: 'TechStream Hardware', email: 'support@techstream.io', phone: '+1 (555) 456-7890', address: 'Seattle, WA', status: 'Pending', category: 'Manufacturer', openOrders: 0 },
    { id: 'C-004', name: 'Textile Manufacturers', email: 'contact@texfab.com', phone: '+1 (555) 222-3333', address: 'New York, NY', status: 'Inactive', category: 'Supplier', openOrders: 0 },
  ];

  const filteredCustomers = useMemo(() => {
    return customersData.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filterStatus === 'All' || c.status === filterStatus;
      const matchCategory = filterCategory === 'All' || c.category === filterCategory;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [searchQuery, filterStatus, filterCategory]);

  return (
    <div className="h-full p-6 space-y-6">
      <PageHeader 
        title="Customer Directory" 
        subtitle="Manage your customer base, categories, and active order volumes." 
      />

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Partners', val: '24', color: 'text-emerald-600' },
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
            placeholder="Search customer name..."
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
          </select>
          <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50">
            <Download size={14} /> Export
          </button>
          <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800">
            <Plus size={14} /> Add Customer
          </button>
        </div>
      </div>

      {/* Main Table */}
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
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} onClick={() => navigate(`/customers/${customer.id}`)} className="hover:bg-white/60 transition-colors cursor-pointer group">
                <td className="p-4">
                  <div className="font-bold text-slate-900">{customer.name}</div>
                  <div className="text-[10px] text-slate-400">{customer.email}</div>
                </td>
                <td className="p-4 font-medium text-slate-600">{customer.category}</td>
                <td className="p-4">
                   <span className={`inline-flex items-center gap-1 font-bold ${customer.openOrders > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                      <Package size={12} /> {customer.openOrders}
                   </span>
                </td>
                <td className="p-4 text-slate-500">{customer.address}</td>
                <td className="p-4">
                   <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                     customer.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 
                     customer.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                   }`}>{customer.status}</span>
                </td>
                <td className="p-4 text-right">
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-brand-gold ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}