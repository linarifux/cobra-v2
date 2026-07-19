import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, MapPin, Package, Loader2, Filter, X, 
  Calendar, Building2, User, Plus, FileText, Truck,
  Layers, Edit2, Trash2, Save, Briefcase
} from 'lucide-react';
import { toast } from 'sonner';

import PageHeader from '../components/PageHeader';
import { useConfirm } from '../providers/ConfirmProvider';

// Redux Actions
import { fetchOrders, updateOrder, deleteOrder } from '../store/slices/orderSlice';
import { fetchCustomers } from '../store/slices/customerSlice';
import { fetchDivisions } from '../store/slices/divisionSlice';
import { fetchInventory, updateInventory } from '../store/slices/inventorySlice';

const INITIAL_FILTERS = {
  status: 'All',
  customer: 'All', 
  division: 'All',
  user: 'All',     
  dateStart: '',
  dateEnd: ''
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const confirm = useConfirm();
  
  const { items: ordersData = [], status: ordersStatus, error: ordersError } = useSelector((state) => state.orders || {});
  const { items: customersData = [] } = useSelector((state) => state.customers || {});
  const { items: divisionsData = [] } = useSelector((state) => state.divisions || {});
  const { items: inventoryData = [], status: inventoryStatus } = useSelector((state) => state.inventory || {});

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // FIX: Always dispatch on mount. Removing `if(ordersStatus === 'idle')` ensures the 
    // Admin page forces a fresh global fetch, overwriting any scoped dashboard data.
    dispatch(fetchOrders({})); 
    
    if (customersData.length === 0) dispatch(fetchCustomers());
    if (divisionsData.length === 0) dispatch(fetchDivisions());
    if (inventoryStatus === 'idle') dispatch(fetchInventory());
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // --- Cascading Filter Logic ---
  const availableDivisions = useMemo(() => {
    if (filters.customer === 'All') return divisionsData;
    return divisionsData.filter(d => String(d.customer?._id || d.customer) === String(filters.customer));
  }, [divisionsData, filters.customer]);

  const uniqueShoppers = useMemo(() => {
    const map = new Map();
    ordersData.forEach(o => {
      const orderCustomerId = String(o.customer?._id || o.customer || '');
      const orderDivisionId = String(o.division?._id || o.division || '');
      
      const matchCustomer = filters.customer === 'All' || orderCustomerId === String(filters.customer);
      const matchDivision = filters.division === 'All' || orderDivisionId === String(filters.division);

      if (matchCustomer && matchDivision && o.user) {
        const id = String(o.user._id || o.user);
        const name = o.user.name || o.user.firstName || o.user.email || o.shippingAddress?.recipientName || id;
        if (!map.has(id)) map.set(id, { id, name });
      }
    });
    return Array.from(map.values());
  }, [ordersData, filters.customer, filters.division]);

  const handleCustomerChange = (e) => {
    setFilters(prev => ({ 
      ...prev, 
      customer: e.target.value, 
      division: 'All', 
      user: 'All'      
    }));
  };

  const handleDivisionChange = (e) => {
    setFilters(prev => ({ 
      ...prev, 
      division: e.target.value, 
      user: 'All'      
    }));
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilters(INITIAL_FILTERS);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (filters.status !== 'All') count++;
    if (filters.customer !== 'All') count++;
    if (filters.division !== 'All') count++;
    if (filters.user !== 'All') count++;
    if (filters.dateStart || filters.dateEnd) count++;
    return count;
  }, [searchQuery, filters]);

  // --- Data Processing ---
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(ordersData)) return [];

    return ordersData.filter(order => {
      const orderCustomerId = String(order.customer?._id || order.customer || '');
      const orderDivisionId = String(order.division?._id || order.division || ''); 
      const orderUserId = String(order.user?._id || order.user || '');

      const customerName = order.customer?.customerName || '';
      const orderNumber = order.orderNumber || '';
      const recipientName = order.shippingAddress?.recipientName || '';
      
      let orderDate = '';
      try {
        if (order.createdAt) orderDate = new Date(order.createdAt).toISOString().split('T')[0];
      } catch (e) {}

      const matchSearch = customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          recipientName.toLowerCase().includes(searchQuery.toLowerCase());
                          
      const matchStatus = filters.status === 'All' || order.status === filters.status;
      const matchCustomer = filters.customer === 'All' || orderCustomerId === String(filters.customer);
      const matchDivision = filters.division === 'All' || orderDivisionId === String(filters.division);
      const matchUser = filters.user === 'All' || orderUserId === String(filters.user);
      
      const matchDateStart = !filters.dateStart || orderDate >= filters.dateStart;
      const matchDateEnd = !filters.dateEnd || orderDate <= filters.dateEnd;
      
      return matchSearch && matchStatus && matchCustomer && matchDivision && matchUser && matchDateStart && matchDateEnd;
    });
  }, [searchQuery, filters, ordersData]);

  // --- Selection Handlers ---
  const toggleSelect = (id) => {
    setSelectedOrders(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]); 
    } else {
      setSelectedOrders(filteredOrders.map(o => o._id)); 
    }
  };

  const handleBulkExport = () => {
    toast.success('Exporting Data', { description: `Generating CSV for ${selectedOrders.length} orders...` });
  };

  // --- Core Restock Helper ---
  const restoreInventoryStock = async (itemsToRestock) => {
    if (!itemsToRestock || itemsToRestock.length === 0) return;
    try {
      await Promise.all(itemsToRestock.map(async (item) => {
        const stockItem = inventoryData.find(inv => inv.sku === item.sku);
        if (stockItem) {
          const currentStock = Number(stockItem.unitsOnHand) || Number(stockItem.available) || 0;
          const restoredStock = currentStock + Number(item.quantity || 0);
          
          const updatedData = { 
            ...stockItem, 
            unitsOnHand: restoredStock, 
            available: restoredStock 
          };
          
          await dispatch(updateInventory({ id: stockItem._id, inventoryData: updatedData })).unwrap();
        }
      }));
    } catch (err) {
      console.error("Failed to restore inventory:", err);
    }
  };

  // --- Inline Action Handlers ---
  const openQuickEdit = (order) => {
    setEditingOrder({
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status || 'Pending',
      notes: order.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const submitQuickEdit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const originalOrder = ordersData.find(o => o._id === editingOrder._id);
      const isChangingToCancelled = editingOrder.status === 'Cancelled' && originalOrder?.status !== 'Cancelled';

      const actionPromise = dispatch(updateOrder({ 
        id: editingOrder._id, 
        updateData: { status: editingOrder.status, notes: editingOrder.notes } 
      })).unwrap();
      
      if (isChangingToCancelled) {
        await restoreInventoryStock(originalOrder?.items);
      }

      toast.promise(actionPromise, {
        loading: 'Updating order...',
        success: isChangingToCancelled ? 'Order cancelled. Items returned to stock.' : 'Order status updated successfully.',
        error: 'Failed to update order.'
      });
      
      await actionPromise;
      setIsEditModalOpen(false);
      setEditingOrder(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = async (id, orderNumber) => {
    const isConfirmed = await confirm({
      title: 'Delete Order?',
      message: `Are you sure you want to permanently delete order ${orderNumber}? This action cannot be undone.`,
      confirmText: 'Delete Order',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        const orderToDelete = ordersData.find(o => o._id === id);
        const safeToDeleteStatus = ['shipped', 'delivered', 'cancelled'];
        const currentStatus = orderToDelete?.status?.toLowerCase() || 'pending';
        const needsRestock = !safeToDeleteStatus.includes(currentStatus);

        if (needsRestock && orderToDelete) {
          await restoreInventoryStock(orderToDelete.items);
        }

        const actionPromise = dispatch(deleteOrder(id)).unwrap();
        toast.promise(actionPromise, {
          loading: 'Deleting order...',
          success: needsRestock ? 'Order deleted and items returned to stock.' : 'Order successfully deleted.',
          error: 'Failed to delete order.'
        });
        await actionPromise;
      } catch (err) {
        console.error(err);
        toast.error(`Failed to delete order: ${err.message || 'Unknown error'}`);
      }
    }
  };

  useEffect(() => {
    document.body.style.overflow = isEditModalOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isEditModalOpen]);

  const selectClass = "w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-xs font-bold outline-none cursor-pointer focus:border-brand-gold/50 focus:ring-2 focus:ring-brand-gold/20 transition-all appearance-none";

  return (
    <div className="relative h-full p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto pb-32">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader title="Fulfillment Queue" subtitle="Real-time dispatch and logistics overview." />
        <button 
          onClick={() => navigate('/orders/new')}
          className="flex items-center justify-center gap-2 bg-slate-900 text-brand-gold px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95 shrink-0"
        >
          <Plus size={16} /> New Order
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', val: ordersData.length, color: 'text-slate-900' },
          { label: 'Awaiting Shipment', val: ordersData.filter(o => ['Pending', 'Processing'].includes(o.status)).length, color: 'text-rose-600' },
          { label: 'Ready to Ship', val: ordersData.filter(o => o.status === 'Ready to Ship').length, color: 'text-indigo-600' },
          { label: 'Shipped / Complete', val: ordersData.filter(o => ['Shipped', 'Delivered'].includes(o.status)).length, color: 'text-emerald-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/50 border border-white/60 p-4 rounded-2xl backdrop-blur-md shadow-sm transition-all hover:bg-white/70">
            <p className="text-[10px] uppercase font-black text-slate-400">{stat.label}</p>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-5 rounded-3xl space-y-4 shadow-sm">
        
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full max-w-2xl">
            <Search className="absolute left-4 top-3 text-slate-400" size={16} />
            <input 
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/70 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all shadow-sm"
              placeholder="Search by Brand Name, Shopper Name, or Order Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {activeFilterCount > 0 && (
            <button 
              onClick={clearAllFilters}
              className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:bg-white/60 rounded-xl transition-all border border-transparent hover:border-slate-200"
            >
              <X size={14} /> Clear {activeFilterCount} Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 border-t border-slate-200/60 pt-4">
          <div className="relative">
            <Briefcase className="absolute left-3 top-2.5 text-brand-gold" size={14} />
            <select className={selectClass} value={filters.customer} onChange={handleCustomerChange}>
              <option value="All">All Brands</option>
              {customersData.map(c => <option key={c._id} value={c._id}>{c.customerName}</option>)}
            </select>
          </div>

          <div className="relative">
            <Building2 className="absolute left-3 top-2.5 text-brand-gold" size={14} />
            <select className={selectClass} value={filters.division} onChange={handleDivisionChange}>
              <option value="All">All Divisions</option>
              {availableDivisions.map(d => <option key={d._id} value={d._id}>{d.divisionName}</option>)}
            </select>
          </div>

          <div className="relative">
            <User className="absolute left-3 top-2.5 text-brand-gold" size={14} />
            <select className={selectClass} value={filters.user} onChange={(e) => setFilters({...filters, user: e.target.value})}>
              <option value="All">All Shoppers</option>
              {uniqueShoppers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-2.5 text-brand-gold" size={14} />
            <select className={selectClass} value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}>
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Ready to Ship">Ready to Ship</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="On Hold">On Hold</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 text-brand-gold" size={14} />
            <input 
              type="date" 
              className={selectClass} 
              value={filters.dateStart}
              onChange={(e) => setFilters({...filters, dateStart: e.target.value})} 
              title="Start Date"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 text-brand-gold" size={14} />
            <input 
              type="date" 
              className={selectClass} 
              value={filters.dateEnd}
              onChange={(e) => setFilters({...filters, dateEnd: e.target.value})} 
              title="End Date"
            />
          </div>
        </div>
      </div>

      {/* State Handling */}
      {ordersStatus === 'loading' && ordersData.length === 0 ? (
        <div className="flex justify-center items-center py-20 text-slate-400">
          <Loader2 className="animate-spin text-brand-gold" size={32} />
        </div>
      ) : ordersStatus === 'failed' ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-3xl text-center text-sm font-bold border border-red-200 shadow-sm">
          Failed to load orders: {ordersError}
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200/80 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                  <th className="p-5 w-12">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-brand-gold focus:ring-brand-gold cursor-pointer"
                      checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                      onChange={handleSelectAll} 
                    />
                  </th>
                  <th className="p-5">Order Reference</th>
                  <th className="p-5">Date Logged</th>
                  <th className="p-5">Customer & Origin</th>
                  <th className="p-5">Shopper & Dest.</th>
                  <th className="p-5">Assets</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => {
                    const displayDate = order.createdAt 
                      ? new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) 
                      : 'N/A';
                    
                    const location = [order.shippingAddress?.city, order.shippingAddress?.state]
                      .filter(Boolean)
                      .join(', ') || 'N/A';
                    
                    const grandTotal = (order.totalAmount || 0) + (order.shippingDetails?.shippingCost || 0);

                    const divRef = order.division;
                    const divisionObj = divisionsData.find(d => d._id === (divRef?._id || divRef));
                    const displayDivision = divisionObj ? divisionObj.divisionName : 'Unassigned Branch';

                    const shopperName = order.user?.name || order.user?.firstName || order.shippingAddress?.recipientName || 'Unknown Shopper';

                    return (
                      <tr key={order._id} className="hover:bg-white/80 transition-colors group cursor-pointer" onClick={() => navigate(`/orders/${order._id}`)}>
                        <td className="p-5" onClick={e => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-brand-gold focus:ring-brand-gold cursor-pointer"
                            checked={selectedOrders.includes(order._id)}
                            onChange={() => toggleSelect(order._id)} 
                          />
                        </td>
                        <td className="p-5">
                          <div className="font-black text-slate-800 text-sm group-hover:text-brand-gold transition-colors">{order.orderNumber}</div>
                          <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 w-max mt-1 tracking-widest">${grandTotal.toFixed(2)}</div>
                        </td>
                        <td className="p-5 text-slate-500 font-bold">{displayDate}</td>
                        <td className="p-5">
                          <div className="font-black text-slate-700">{order.customer?.customerName || 'Unknown Brand'}</div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                             <Layers size={10}/> {displayDivision}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="font-black text-slate-700">{shopperName}</div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                             <MapPin size={10} className="text-brand-gold"/> {location}
                          </div>
                        </td>
                        <td className="p-5">
                          <span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded text-slate-600 font-black">{order.items?.length || 0}</span>
                        </td>
                        <td className="p-5">
                          <span className={`px-2.5 py-1 text-[9px] uppercase tracking-wider rounded border shadow-sm font-black ${
                            order.status === 'Shipped' || order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                            order.status === 'On Hold' || order.status === 'Cancelled' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                            order.status === 'Ready to Ship' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                            'bg-amber-50 text-amber-600 border-amber-200'
                          }`}>
                            {order.status || 'Pending'}
                          </span>
                        </td>
                        <td className="p-5 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openQuickEdit(order)}
                              className="p-1.5 text-slate-400 bg-white border border-slate-200 rounded-lg hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 shadow-sm transition-all" 
                              title="Update Status"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => navigate(`/orders/edit/${order._id}`)}
                              className="p-1.5 text-slate-400 bg-white border border-slate-200 rounded-lg hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 shadow-sm transition-all" 
                              title="Full Edit"
                            >
                              <FileText size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteOrder(order._id, order.orderNumber)}
                              className="p-1.5 text-slate-400 bg-white border border-slate-200 rounded-lg hover:text-red-600 hover:border-red-200 hover:bg-red-50 shadow-sm transition-all" 
                              title="Delete Order"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-20 text-center text-slate-400">
                      <Package className="mx-auto mb-3 opacity-20" size={48} />
                      <p className="text-sm font-black uppercase tracking-widest mb-1">No Orders Found</p>
                      <p className="text-xs font-bold">Try clearing your filters to see more results.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      <AnimatePresence>
        {selectedOrders.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-6"
          >
            <div className="flex items-center gap-3">
              <div className="bg-brand-gold text-slate-900 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-inner">
                {selectedOrders.length}
              </div>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-300">
                Orders Selected
              </span>
            </div>
            
            <div className="w-px h-8 bg-slate-700"></div>
            
            <div className="flex gap-2">
              <button 
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <Truck size={14} /> Update Status
              </button>
              <button 
                onClick={handleBulkExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <FileText size={14} /> Export CSV
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isSubmitting && setIsEditModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white/95 backdrop-blur-xl border border-white/50 p-6 rounded-3xl shadow-2xl">
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Quick Update</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Order {editingOrder.orderNumber}</p>
                </div>
                <button onClick={() => !isSubmitting && setIsEditModalOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"><X size={16} /></button>
              </div>

              <form onSubmit={submitQuickEdit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Pipeline Status</label>
                  <select 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all cursor-pointer"
                    value={editingOrder.status}
                    onChange={(e) => setEditingOrder({...editingOrder, status: e.target.value})}
                    disabled={isSubmitting}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Ready to Ship">Ready to Ship</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Fulfillment Notes</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all resize-none"
                    rows="3"
                    placeholder="Internal logistics notes..."
                    value={editingOrder.notes}
                    onChange={(e) => setEditingOrder({...editingOrder, notes: e.target.value})}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-[2] flex justify-center items-center gap-2 px-4 py-3 bg-brand-gold hover:bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-gold/20 transition-all disabled:opacity-70">
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Save Status</>}
                  </button>
                </div>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}