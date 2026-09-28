import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Redux Thunks
import { fetchOrders, updateOrder } from '../store/slices/orderSlice';
import { fetchCustomers } from '../store/slices/customerSlice';

// Billing Components
import BillingHeader from '../components/billing/BillingHeader';
import BillingFilters from '../components/billing/BillingFilters';
import BillingTable from '../components/billing/BillingTable';
import ChargeTypeModal from '../components/billing/ChargeTypeModal';

export default function Billing() {
  const dispatch = useDispatch();

  // --- REDUX STATE ---
  const { items: orders = [], status: ordersStatus } = useSelector(state => state.orders);
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

  return (
    <div className="h-full max-w-[1600px] mx-auto p-4 sm:p-6 space-y-8 animate-fade-in relative pb-24">
      
      {/* 1. Page Header & Actions */}
      <BillingHeader 
        filteredCount={filteredOrders.length}
        totalUnbilled={totalUnbilled}
        selectedCount={selectedIds.length}
        isProcessing={isProcessing}
        onBatchProcess={handleBatchProcess}
        onOpenModal={() => setIsModalOpen(true)}
      />

      {/* 2. Inline Filters */}
      <BillingFilters 
        customers={customers}
        customerFilter={customerFilter}
        setCustomerFilter={setCustomerFilter}
        fromDate={fromDate}
        setFromDate={setFromDate}
        toDate={toDate}
        setToDate={setToDate}
        applyCartonFee={applyCartonFee}
        setApplyCartonFee={setApplyCartonFee}
      />

      {/* 3. Data Table */}
      <BillingTable 
        filteredOrders={filteredOrders}
        selectedIds={selectedIds}
        handleSelectAll={handleSelectAll}
        handleSelectRow={handleSelectRow}
      />

      {/* Charge Type Creation Modal Component */}
      <ChargeTypeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

    </div>
  );
}