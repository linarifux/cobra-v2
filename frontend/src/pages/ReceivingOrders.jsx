import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

// Redux Thunks
import { fetchReceivingLogs, deleteReceivingLog } from '../store/slices/receivingSlice';
import { fetchCustomers } from '../store/slices/customerSlice';
import { fetchInventory } from '../store/slices/inventorySlice';
import { fetchLocations } from '../store/slices/locationSlice';
import { fetchDivisions } from '../store/slices/divisionSlice';
import { fetchCategories } from '../store/slices/categorySlice';

import { useConfirm } from '../providers/ConfirmProvider';

// Sub-components
import ReceivingHeader from '../components/receiving/ReceivingHeader';
import ReceivingFilterBoard from '../components/receiving/ReceivingFilterBoard';
import ReceivingTable from '../components/receiving/ReceivingTable';
import ReceivingModal from '../components/receiving/ReceivingModal';

export default function ReceivingOrders() {
  const dispatch = useDispatch();
  const confirm = useConfirm();

  // --- Redux State Extraction ---
  const { items: receivingData = [], status, error: recError } = useSelector(state => state.receiving || {});
  
  // Extracting both items and status for our relational dropdowns
  const { items: customers = [], status: custStatus } = useSelector(state => state.customers || {});
  const { items: inventory = [], status: invStatus } = useSelector(state => state.inventory || {});
  const { items: divisions = [], status: divStatus } = useSelector(state => state.divisions || {});
  
  // Status only for loaders
  const { status: locStatus } = useSelector(state => state.locations || {});
  const { status: catStatus } = useSelector(state => state.categories || {});

  const loadAllData = () => {
    if (status === 'idle' || status === 'failed') dispatch(fetchReceivingLogs());
    if (custStatus === 'idle' || custStatus === 'failed') dispatch(fetchCustomers());
    if (invStatus === 'idle' || invStatus === 'failed') dispatch(fetchInventory());
    if (locStatus === 'idle' || locStatus === 'failed') dispatch(fetchLocations());
    if (divStatus === 'idle' || divStatus === 'failed') dispatch(fetchDivisions());
    if (catStatus === 'idle' || catStatus === 'failed') dispatch(fetchCategories());
  };

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const isGlobalLoading = [status, custStatus, invStatus, locStatus, divStatus, catStatus].some(s => s === 'idle' || s === 'loading');
  const hasGlobalError = [status, custStatus, invStatus, locStatus, divStatus, catStatus].some(s => s === 'failed');

  // --- Parent UI State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // --- Filter State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [itemFilter, setItemFilter] = useState('All');

  // Auto-reset child filters if parent filter changes
  useEffect(() => {
    setDivisionFilter('All');
    setItemFilter('All');
  }, [customerFilter]);

  useEffect(() => {
    setItemFilter('All');
  }, [divisionFilter]);

  // --- Cascading Dropdown Logic ---
  const availableDivisions = useMemo(() => {
    if (customerFilter === 'All') return divisions;
    return divisions.filter(div => (div.customer?._id || div.customer) === customerFilter);
  }, [divisions, customerFilter]);

  const availableInventory = useMemo(() => {
    let filtered = inventory;
    
    if (customerFilter !== 'All') {
      filtered = filtered.filter(inv => (inv.customer?._id || inv.customer) === customerFilter);
    }
    if (divisionFilter !== 'All') {
      filtered = filtered.filter(inv => (inv.division?._id || inv.division) === divisionFilter);
    }
    
    // Spread the filtered array into a new array [...filtered] before applying .sort() 
    // This prevents the "read-only" Redux strict-mode error!
    return [...filtered].sort((a, b) => {
      const nameA = a.productCode || a.sku || a.itemName || '';
      const nameB = b.productCode || b.sku || b.itemName || '';
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [inventory, customerFilter, divisionFilter]);

  // --- Table Data Filtering ---
  const filteredData = useMemo(() => {
    if (!Array.isArray(receivingData)) return [];
    return receivingData.filter(row => {
      const searchTarget = searchTerm.toLowerCase();
      
      // FIX: Force all search targets to be strings so we don't crash when .toLowerCase() is called on objects
      const matchesSearch = [
        row.vendor?.vendorName || row.fallbackVendor, 
        row.carrier?.carrierName || row.fallbackCarrier, 
        row.customer?.customerName, 
        row.inventoryItem?.itemName, 
        row.inventoryItem?.sku, 
        row.inventoryItem?.productCode, 
        row.receivingId
      ].some(val => String(val || '').toLowerCase().includes(searchTarget));

      let matchesFrom = true;
      let matchesTo = true;
      
      if (row.dateReceived) {
          const rowDate = new Date(row.dateReceived).toISOString().split('T')[0];
          matchesFrom = !fromDate || rowDate >= fromDate;
          matchesTo = !toDate || rowDate <= toDate;
      }
      
      // Relational Matches
      const rowCustId = row.customer?._id || row.customer;
      const rowDivId = row?.inventoryItem?.division?._id || row?.inventoryItem?.division;
      const rowInvId = row.inventoryItem?._id || row.inventoryItem;

      const matchesCustomer = customerFilter === 'All' || String(rowCustId) === String(customerFilter);
      const matchesDivision = divisionFilter === 'All' || String(rowDivId) === String(divisionFilter);
      const matchesItem = itemFilter === 'All' || String(rowInvId) === String(itemFilter);

      return matchesSearch && matchesFrom && matchesTo && matchesCustomer && matchesDivision && matchesItem;
    });
  }, [receivingData, searchTerm, fromDate, toDate, customerFilter, divisionFilter, itemFilter]);

  // --- Modal Handlers ---
  const openNewModal = () => { setSelectedRecord(null); setIsModalOpen(true); };
  const openEditModal = (row) => { setSelectedRecord(row); setIsModalOpen(true); };
  
  const handleDelete = async (id) => {
    if (await confirm({ title: 'Delete Record?', message: 'Are you sure you want to delete this receiving log?', confirmText: 'Delete', variant: 'danger' })) {
      dispatch(deleteReceivingLog(id));
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Receiving ID', 'Vendor', 'Customer', 'Item', 'Qty'];
    const csv = [headers.join(','), ...filteredData.map(r => [
      new Date(r.dateReceived).toLocaleDateString(), 
      r.receivingId, 
      `"${r.vendor?.vendorName || r.fallbackVendor || ''}"`, 
      `"${r.customer?.customerName || ''}"`, 
      `"${r.inventoryItem?.itemName || ''}"`, 
      r.quantity
    ].join(','))].join('\n');
    
    const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `logs.csv`; a.click();
  };

  if (hasGlobalError && !isGlobalLoading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh] px-4">
        <div className="bg-red-50 p-6 sm:p-8 rounded-3xl text-center shadow-lg border border-red-200 w-full max-w-md">
          <AlertTriangle className="text-red-500 mb-4 mx-auto" size={40} />
          <h2 className="text-red-800 text-lg font-black mb-2">Sync Failed</h2>
          <p className="text-red-600/80 text-xs font-medium mb-6">{recError || 'Please check your connection and try again.'}</p>
          <button onClick={loadAllData} className="flex mx-auto items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase transition-colors w-full sm:w-auto">
            <RefreshCw size={14} /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (isGlobalLoading) {
    return (
      <div className="h-full flex flex-col justify-center items-center min-h-[60vh] gap-4 px-4">
        <Loader2 className="animate-spin text-brand-gold" size={36} />
        <p className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-widest text-center">Compiling Database...</p>
      </div>
    );
  }

  return (
    <div className="w-full relative max-w-[1500px] mx-auto animate-slide-in-right space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-20">
      
      <ReceivingHeader 
        exportToCSV={exportToCSV} 
        openNewModal={openNewModal} 
      />
      
      <ReceivingFilterBoard 
        searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
        fromDate={fromDate} setFromDate={setFromDate} 
        toDate={toDate} setToDate={setToDate} 
        
        customerFilter={customerFilter} setCustomerFilter={setCustomerFilter} customersList={customers}
        divisionFilter={divisionFilter} setDivisionFilter={setDivisionFilter} divisionsList={availableDivisions}
        itemFilter={itemFilter} setItemFilter={setItemFilter} inventoryList={availableInventory}
        
        clearFilters={() => { 
          setSearchTerm(''); setFromDate(''); setToDate(''); 
          setCustomerFilter('All'); setDivisionFilter('All'); setItemFilter('All');
        }} 
      />

      <ReceivingTable 
        filteredData={filteredData} 
        openEditModal={openEditModal} 
        handleDelete={handleDelete} 
      />

      <ReceivingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        record={selectedRecord} 
      />
      
    </div>
  );
}