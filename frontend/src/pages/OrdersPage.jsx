import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Eye, CheckSquare, SlidersHorizontal, 
  MapPin, Calendar, AlertTriangle, Package, 
  Download, RefreshCw, BarChart3, Truck
} from 'lucide-react';
import PageHeader from '../components/PageHeader';

export default function OrdersPage() {
  const navigate = useNavigate();
  
  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [filters, setFilters] = useState({
    status: 'All',
    priority: 'All',
    division: 'All',
    dateStart: '',
    dateEnd: ''
  });

  const ordersData = [
    { id: 'ORD-095', customer: 'Sarah Jenkins', brand: 'LuxeLife', division: 'Retail', city: 'New York, NY', source: 'Shopify', status: 'Awaiting Shipment', priority: 'High', date: '2026-05-20' },
    { id: 'ORD-094', customer: 'Alex Rivera', brand: 'TechGear', division: 'B2B', city: 'Austin, TX', source: 'Manual', status: 'Shipped', priority: 'Standard', date: '2026-05-18' },
    { id: 'ORD-093', customer: 'Marcus Vance', brand: 'LuxeLife', division: 'Retail', city: 'Chicago, IL', source: 'Shopify', status: 'On Hold', priority: 'Low', date: '2026-05-15' },
    { id: 'ORD-090', customer: 'Elena Rostova', brand: 'TechGear', division: 'B2B', city: 'Seattle, WA', source: 'Shopify', status: 'Failed Sync', priority: 'High', date: '2026-05-12' },
  ];

  const filteredOrders = useMemo(() => {
    return ordersData.filter(order => {
      const matchSearch = order.customer.toLowerCase().includes(searchQuery.toLowerCase()) || order.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filters.status === 'All' || order.status === filters.status;
      const matchPriority = filters.priority === 'All' || order.priority === filters.priority;
      const matchDivision = filters.division === 'All' || order.division === filters.division;
      const matchDate = (!filters.dateStart || order.date >= filters.dateStart) && (!filters.dateEnd || order.date <= filters.dateEnd);
      
      return matchSearch && matchStatus && matchPriority && matchDivision && matchDate;
    });
  }, [searchQuery, filters]);

  const toggleSelect = (id) => {
    setSelectedOrders(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="relative h-full p-6 space-y-6">
      <PageHeader title="Fulfillment Queue" subtitle="Real-time dispatch and logistics overview." />

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', val: ordersData.length, color: 'text-slate-900' },
          { label: 'High Priority', val: '2', color: 'text-rose-600' },
          { label: 'Pending Sync', val: '1', color: 'text-amber-600' },
          { label: 'Shipped Today', val: '0', color: 'text-emerald-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/50 border border-white/60 p-4 rounded-2xl backdrop-blur-md">
            <p className="text-[10px] uppercase font-black text-slate-400">{stat.label}</p>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.val}</p>
          </div>
        ))}
      </div>

      {/* Control Panel */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-3xl space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs"
              placeholder="Search customers or order IDs..."
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold" onChange={(e) => setFilters({...filters, status: e.target.value})}>
            <option value="All">All Statuses</option>
            <option value="Awaiting Shipment">Awaiting Shipment</option>
            <option value="Shipped">Shipped</option>
            <option value="Failed Sync">Failed Sync</option>
          </select>
          <input type="date" className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold" onChange={(e) => setFilters({...filters, dateStart: e.target.value})} />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/50 text-[10px] uppercase font-black text-slate-500">
              <th className="p-4"><CheckSquare size={14} /></th>
              <th className="p-4">Order Details</th>
              <th className="p-4">Date</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Division</th>
              <th className="p-4">Location</th>
              <th className="p-4">Priority</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/40">
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-white/50 transition-colors">
                <td className="p-4"><input type="checkbox" onChange={() => toggleSelect(order.id)} /></td>
                <td className="p-4">
                  <div className="font-black">{order.id}</div>
                  <div className="text-[10px] text-slate-500">{order.customer}</div>
                </td>
                <td className="p-4 text-slate-500 font-medium">{order.date}</td>
                <td className="p-4 font-bold text-slate-700">{order.brand}</td>
                <td className="p-4">{order.division}</td>
                <td className="p-4 flex items-center gap-1"><MapPin size={12}/>{order.city}</td>
                <td className="p-4"><span className={`px-2 py-0.5 rounded font-black ${order.priority === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100'}`}>{order.priority}</span></td>
                <td className="p-4"><span className="px-2 py-1 bg-white border rounded-full font-bold">{order.status}</span></td>
                <td className="p-4 text-right"><button onClick={() => navigate(`/orders/${order.id}`)} className="text-brand-gold font-bold">Manage</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}