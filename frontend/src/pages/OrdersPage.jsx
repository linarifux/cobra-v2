import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Search, CheckSquare, MapPin, Package, 
  Loader2, Plus
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { fetchOrders } from '../store/slices/orderSlice';

export default function OrdersPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Safely access Orders from Redux
  const { items: ordersData = [], status, error } = useSelector((state) => state.orders || {});

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [filters, setFilters] = useState({
    status: 'All',
    dateStart: '',
    dateEnd: ''
  });

  // Fetch orders on mount
  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(ordersData)) return [];

    return ordersData.filter(order => {
      const customerName = order.customer?.customerName || '';
      const orderNumber = order.orderNumber || '';
      // Safely parse date for filtering
      const orderDate = order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : ''; 

      const matchSearch = customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filters.status === 'All' || order.status === filters.status;
      const matchDate = (!filters.dateStart || orderDate >= filters.dateStart) && 
                        (!filters.dateEnd || orderDate <= filters.dateEnd);
      
      return matchSearch && matchStatus && matchDate;
    });
  }, [searchQuery, filters, ordersData]);

  const toggleSelect = (id) => {
    setSelectedOrders(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="relative h-full p-6 space-y-6 animate-fade-in">
      <PageHeader title="Fulfillment Queue" subtitle="Real-time dispatch and logistics overview." />

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', val: ordersData.length, color: 'text-slate-900' },
          { label: 'Awaiting Shipment', val: ordersData.filter(o => o.status === 'Pending' || o.status === 'Processing').length, color: 'text-rose-600' },
          { label: 'Ready to Ship', val: ordersData.filter(o => o.status === 'Ready to Ship').length, color: 'text-amber-600' },
          { label: 'Shipped', val: ordersData.filter(o => o.status === 'Shipped' || o.status === 'Delivered').length, color: 'text-emerald-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/50 border border-white/60 p-4 rounded-2xl backdrop-blur-md shadow-sm transition-all hover:bg-white/70">
            <p className="text-[10px] uppercase font-black text-slate-400">{stat.label}</p>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.val}</p>
          </div>
        ))}
      </div>

      {/* Control Panel */}
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-4 rounded-3xl space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs font-medium outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all"
              placeholder="Search customers or order numbers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select 
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs font-bold outline-none cursor-pointer focus:border-brand-gold/50" 
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Ready to Ship">Ready to Ship</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="On Hold">On Hold</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <input 
              type="date" 
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white/50 text-xs font-bold outline-none cursor-pointer focus:border-brand-gold/50" 
              value={filters.dateStart}
              onChange={(e) => setFilters({...filters, dateStart: e.target.value})} 
            />
            
            {/* Create Order Button */}
            {/* <button 
              onClick={() => navigate('/orders/new')}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-md ml-auto"
            >
              <Plus size={14} /> Create Order
            </button> */}
          </div>
        </div>
      </div>

      {/* State Handling */}
      {status === 'loading' && ordersData.length === 0 ? (
        <div className="flex justify-center items-center py-20 text-slate-400">
          <Loader2 className="animate-spin text-brand-gold" size={32} />
        </div>
      ) : status === 'failed' ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-3xl text-center text-sm font-bold border border-red-200 shadow-sm">
          Failed to load orders: {error}
        </div>
      ) : (
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-100/50 text-[10px] uppercase font-black text-slate-500">
                  <th className="p-4 w-12"><CheckSquare size={14} /></th>
                  <th className="p-4">Order Details</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Items</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => {
                    const displayDate = order.createdAt 
                      ? new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) 
                      : 'N/A';
                    
                    const location = [order.shippingAddress?.city, order.shippingAddress?.state]
                      .filter(Boolean)
                      .join(', ') || 'N/A';
                    
                    // Grand total includes items + shipping
                    const grandTotal = (order.totalAmount || 0) + (order.shippingDetails?.shippingCost || 0);

                    return (
                      <tr key={order._id} className="hover:bg-white/50 transition-colors">
                        <td className="p-4">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-brand-gold focus:ring-brand-gold cursor-pointer"
                            checked={selectedOrders.includes(order._id)}
                            onChange={() => toggleSelect(order._id)} 
                          />
                        </td>
                        <td className="p-4">
                          <div className="font-black text-slate-800">{order.orderNumber}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">${grandTotal.toFixed(2)}</div>
                        </td>
                        <td className="p-4 text-slate-500 font-medium">{displayDate}</td>
                        <td className="p-4 font-bold text-slate-700">{order.customer?.customerName || 'Unknown Customer'}</td>
                        <td className="p-4 text-slate-600 flex items-center gap-1.5 mt-2"><MapPin size={12}/>{location}</td>
                        <td className="p-4">
                          <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">{order.items?.length || 0}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded border font-black ${
                            order.status === 'Shipped' || order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                            order.status === 'On Hold' || order.status === 'Cancelled' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                            order.status === 'Ready to Ship' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                            'bg-amber-50 text-amber-600 border-amber-200'
                          }`}>
                            {order.status || 'Pending'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => navigate(`/orders/${order._id}`)} 
                            className="text-brand-gold font-bold hover:text-amber-500 transition-colors"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-500 font-bold bg-white/20">
                      No orders found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}