import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Plus, Download, 
  CheckCircle2, Calendar, 
  Trash2, Edit2, ArrowDownToLine, Loader2, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

// Redux Thunks & Components
import { fetchOrders, updateOrder } from '../store/slices/orderSlice';
import { fetchCustomers } from '../store/slices/customerSlice';
import ChargeTypeModal from '../components/billing/ChargeTypeModal';

export default function Billing() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // --- REDUX STATE ---
  const { items: orders = [], status: ordersStatus, error: ordersError } = useSelector(state => state.orders);
  const { items: customers = [], status: customersStatus } = useSelector(state => state.customers);

  // --- STRICT LOADING STATE ---
  const [isPageLoading, setIsPageLoading] = useState(true);

  // --- FILTER STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [applyCartonFee, setApplyCartonFee] = useState(false);
  
  // --- UI STATES ---
  const [selectedIds, setSelectedIds] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- STRICT FETCH DATA ON MOUNT ---
  useEffect(() => {
    let isMounted = true;

    const fetchFreshData = async () => {
      setIsPageLoading(true);
      try {
        await Promise.all([
          dispatch(fetchOrders({})).unwrap(),
          dispatch(fetchCustomers()).unwrap()
        ]);
      } catch (err) {
        console.error("Failed to fetch fresh billing data", err);
      } finally {
        if (isMounted) setIsPageLoading(false);
      }
    };

    fetchFreshData();

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  const isGlobalLoading = isPageLoading || ordersStatus === 'loading' || customersStatus === 'loading';

  // --- DATA PROCESSING & FILTERING ---
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];

    return orders.filter(order => {
      // Only show orders that have not been cancelled or already billed
      if (['Cancelled', 'Billed'].includes(order.status)) return false;

      const orderDate = order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : '';
      const customerId = String(order.customer?._id || order.customer || '');
      const cartonFee = order.processingFees?.cartonSurcharge || 0;

      // Search match (Order Number)
      const matchesSearch = order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filter matches
      const matchesCustomer = !customerFilter || customerId === customerFilter;
      const matchesFromDate = !fromDate || orderDate >= fromDate;
      const matchesToDate = !toDate || orderDate <= toDate;
      const matchesCartonOnly = !applyCartonFee || cartonFee > 0;

      return matchesSearch && matchesCustomer && matchesFromDate && matchesToDate && matchesCartonOnly;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orders, searchQuery, customerFilter, fromDate, toDate, applyCartonFee]);

  // --- CALCULATIONS ---
  const totalUnbilled = useMemo(() => {
    return filteredOrders.reduce((sum, order) => {
      const processing = order.processingFees?.totalProcessingFee || 0;
      const shipping = order.shippingDetails?.shippingCost || 0;
      return sum + processing + shipping;
    }, 0);
  }, [filteredOrders]);

  // --- HANDLERS ---
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredOrders.map(o => o._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBatchProcess = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    
    try {
      // Batch update all selected orders to "Billed" status
      const updatePromises = selectedIds.map(id => 
        dispatch(updateOrder({ id, updateData: { status: 'Billed' } })).unwrap()
      );
      
      await Promise.all(updatePromises);
      
      toast.success(`Successfully processed ${selectedIds.length} charges!`, {
        description: "Orders have been moved to Billed status."
      });
      
      setSelectedIds([]); // Clear selection
      dispatch(fetchOrders({})); // Refresh list
    } catch (error) {
      toast.error("Failed to process charges.", { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // --- RENDER GUARDS ---
  if (isGlobalLoading) {
    return (
      <div className="h-full flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-brand-gold" size={36} />
        <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Scanning Ledgers...</p>
      </div>
    );
  }

  // Clean Input Styles
  const inputClass = "w-full bg-white/60 border border-slate-200 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400";
  const labelClass = "text-xs font-bold text-slate-700 mb-1.5 block";

  return (
    <div className="h-full max-w-[1600px] mx-auto p-4 sm:p-6 space-y-8 animate-fade-in relative pb-24">
      
      {/* 1. Page Header & Actions */}
      <div className="flex flex-col xl:flex-row justify-between items-start gap-6 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            New Charges 
          </h1>
          <p className="text-slate-600 text-sm font-medium">{filteredOrders.length} new charges to be processed</p>
          <p className="text-slate-900 text-sm font-black flex items-center gap-1">
            Total : <span className="text-brand-gold"><DollarSign size={14} className="inline -mt-0.5 -mr-1" />{totalUnbilled.toFixed(2)}</span>
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full xl:w-auto">
          
          <button className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-brand-gold underline underline-offset-4 decoration-slate-300 hover:decoration-brand-gold transition-all">
            Download Charges <ArrowDownToLine size={14} />
          </button>
          
          <button 
            onClick={() => navigate('/orders?status=Billed')}
            className="text-sm font-semibold text-slate-600 hover:text-brand-gold underline underline-offset-4 decoration-slate-300 hover:decoration-brand-gold transition-all mr-2"
          >
            View billed charges
          </button>
          
          {/* Action Buttons */}
          <button 
            onClick={handleBatchProcess}
            disabled={selectedIds.length === 0 || isProcessing}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
              selectedIds.length > 0 
                ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20' 
                : 'bg-slate-100 text-slate-400 border border-slate-200/60 cursor-not-allowed'
            }`}
          >
            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : null}
            {selectedIds.length > 0 ? `Process ${selectedIds.length} Charges` : 'Select Charges'}
          </button>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
          >
            <Plus size={14} /> Add Charge Type
          </button>
        </div>
      </div>

      {/* 2. Inline Filters */}
      <div className="flex flex-wrap items-end gap-6 px-2">
        <div className="w-full sm:w-64">
          <label className={labelClass}>Customer</label>
          <select 
            value={customerFilter} 
            onChange={e => setCustomerFilter(e.target.value)}
            className={`${inputClass} cursor-pointer appearance-none`}
          >
            <option value="">All Customers</option>
            {customers.map(c => (
              <option key={c._id} value={c._id}>{c.customerName}</option>
            ))}
          </select>
        </div>
        
        <div className="w-full sm:w-48">
          <label className={labelClass}>From Date</label>
          <div className="relative">
            <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input 
              type="date" 
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className={inputClass} 
            />
          </div>
        </div>
        
        <div className="w-full sm:w-48">
          <label className={labelClass}>To Date</label>
          <div className="relative">
            <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input 
              type="date" 
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className={inputClass} 
            />
          </div>
        </div>

        <div className="flex items-center h-[38px]">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input 
                type="checkbox" 
                checked={applyCartonFee}
                onChange={e => setApplyCartonFee(e.target.checked)}
                className="peer appearance-none w-[18px] h-[18px] border-[1.5px] border-slate-300 rounded bg-white checked:bg-brand-gold checked:border-brand-gold transition-all cursor-pointer"
              />
              <CheckCircle2 size={12} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
            </div>
            <span className="text-xs font-bold text-slate-700 select-none">
              Carton Fee Applied Only
            </span>
          </label>
        </div>
      </div>

      {/* 3. Data Table */}
      <div className="bg-white/50 backdrop-blur-2xl border border-white/60 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[1300px] border-collapse">
            <thead className="bg-white border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-12">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll}
                    checked={selectedIds.length === filteredOrders.length && filteredOrders.length > 0}
                    className="w-[18px] h-[18px] rounded border-slate-300 accent-brand-gold cursor-pointer"
                  />
                </th>
                <th className="px-3 py-4 text-[11px] font-black text-slate-900">Date</th>
                <th className="px-3 py-4 text-[11px] font-black text-slate-900">Customer / Division</th>
                <th className="px-3 py-4 text-[11px] font-black text-slate-900">Order/Receiver #</th>
                <th className="px-3 py-4 text-[11px] font-black text-slate-900">Charge Type</th>
                <th className="px-3 py-4 text-[11px] font-black text-slate-900 text-right">Quantity</th>
                <th className="px-3 py-4 text-[11px] font-black text-slate-900 text-right">Weight (lbs)</th>
                <th className="px-3 py-4 text-[11px] font-black text-slate-900 text-right">Packages</th>
                <th className="px-3 py-4 text-[11px] font-black text-slate-900 text-right">Carton Fee</th>
                <th className="px-3 py-4 text-[11px] font-black text-slate-900 text-right">Total Order Processing</th>
                <th className="px-3 py-4 text-[11px] font-black text-slate-900 text-right">Shipping Fee</th>
                <th className="px-3 py-4 text-[11px] font-black text-slate-900 text-right">Charge Total</th>
                <th className="px-6 py-4 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? filteredOrders.map((order) => {
                
                // Safe Data Extraction
                const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
                const customerName = order.customer?.customerName || 'Unknown';
                const divisionName = order.division?.divisionName || 'All';
                
                // Metrics
                const totalItems = order.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;
                const weightLbs = ((order.shippingDetails?.totalWeightOunces || 0) / 16).toFixed(2);
                const boxes = order.shippingDetails?.totalBoxes || 0;
                
                // Fees
                const cartonFee = order.processingFees?.cartonSurcharge || 0;
                const processingFee = order.processingFees?.totalProcessingFee || 0;
                const shippingFee = order.shippingDetails?.shippingCost || 0;
                const grandTotal = processingFee + shippingFee;

                return (
                  <tr 
                    key={order._id} 
                    className={`transition-colors duration-150 group ${selectedIds.includes(order._id) ? 'bg-brand-gold/5' : 'hover:bg-white/40'}`}
                  >
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(order._id)}
                        onChange={() => handleSelectRow(order._id)}
                        className="w-[18px] h-[18px] rounded border-slate-300 accent-brand-gold cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-4 text-xs font-semibold text-slate-600 whitespace-nowrap">{date}</td>
                    <td className="px-3 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                      {customerName} / {divisionName}
                    </td>
                    <td className="px-3 py-4 text-xs font-bold text-slate-800 whitespace-nowrap">
                      {order.orderNumber}
                    </td>
                    <td className="px-3 py-4 text-xs font-medium text-slate-600">
                      Processing
                    </td>
                    <td className="px-3 py-4 text-xs font-medium text-slate-600 text-right">{totalItems}</td>
                    <td className="px-3 py-4 text-xs font-medium text-slate-600 text-right">{weightLbs}</td>
                    <td className="px-3 py-4 text-xs font-medium text-slate-600 text-right">{boxes}</td>
                    <td className="px-3 py-4 text-xs font-medium text-slate-600 text-right">{cartonFee.toFixed(2)}</td>
                    <td className="px-3 py-4 text-xs font-medium text-slate-600 text-right">{processingFee.toFixed(2)}</td>
                    <td className="px-3 py-4 text-xs font-medium text-slate-600 text-right">{shippingFee.toFixed(2)}</td>
                    <td className="px-3 py-4 text-xs font-bold text-slate-900 text-right">
                      ${grandTotal.toFixed(2)}
                    </td>
                    
                    <td className="px-6 py-3 text-center align-middle">
                      <div className="flex flex-col items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => navigate(`/orders/${order._id}`)}
                          className="w-14 py-1 text-[10px] font-bold text-white bg-amber-500 hover:bg-amber-600 rounded transition-colors shadow-sm" 
                          title="View/Edit Order"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="13" className="px-6 py-16 text-center text-slate-500 font-medium bg-white/20">
                    No unbilled orders found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charge Type Creation Modal Component */}
      <ChargeTypeModal 
        isOpen={isModalOpen} 
        onClose={closeModal => setIsModalOpen(false)} 
      />

    </div>
  );
}