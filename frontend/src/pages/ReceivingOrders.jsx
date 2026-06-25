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

  // --- Redux State ---
  const { items: receivingData = [], status, error: recError } = useSelector(state => state.receiving || {});
  const { status: custStatus } = useSelector(state => state.customers || {});
  const { status: invStatus } = useSelector(state => state.inventory || {});
  const { status: locStatus } = useSelector(state => state.locations || {});
  const { status: divStatus } = useSelector(state => state.divisions || {});
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

  const filteredData = useMemo(() => {
    if (!Array.isArray(receivingData)) return [];
    return receivingData.filter(row => {
      const searchTarget = searchTerm.toLowerCase();
      const matchesSearch = [
        row.vendor, row.carrier, row.customer?.customerName, 
        row.inventoryItem?.itemName, row.inventoryItem?.sku, 
        row.inventoryItem?.productCode, row.receivingId
      ].some(val => val?.toLowerCase().includes(searchTarget));

      const rowDate = new Date(row.dateReceived).toISOString().split('T')[0];
      const matchesFrom = !fromDate || rowDate >= fromDate;
      const matchesTo = !toDate || rowDate <= toDate;

      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [receivingData, searchTerm, fromDate, toDate]);

  const openNewModal = () => { setSelectedRecord(null); setIsModalOpen(true); };
  const openEditModal = (row) => { setSelectedRecord(row); setIsModalOpen(true); };
  
  const handleDelete = async (id) => {
    if (await confirm({ title: 'Delete Record?', message: 'Are you sure?', confirmText: 'Delete', variant: 'danger' })) {
      dispatch(deleteReceivingLog(id));
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Receiving ID', 'Vendor', 'Customer', 'Item', 'Qty'];
    const csv = [headers.join(','), ...filteredData.map(r => [
      new Date(r.dateReceived).toLocaleDateString(), r.receivingId, `"${r.vendor}"`, `"${r.customer?.customerName}"`, `"${r.inventoryItem?.itemName}"`, r.quantity
    ].join(','))].join('\n');
    
    const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `logs.csv`; a.click();
  };

  if (hasGlobalError && !isGlobalLoading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50 p-8 rounded-3xl text-center shadow-lg border border-red-200">
          <AlertTriangle className="text-red-500 mb-4 mx-auto" size={40} />
          <h2 className="text-red-800 text-lg font-black mb-2">Sync Failed</h2>
          <p className="text-red-600/80 text-xs font-medium mb-6">{recError || 'Check connection.'}</p>
          <button onClick={loadAllData} className="flex mx-auto items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl text-xs font-black uppercase">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (isGlobalLoading) {
    return (
      <div className="h-full flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-brand-gold" size={36} />
        <p className="text-sm font-black text-slate-700 uppercase">Compiling Database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in-right relative max-w-[1500px] mx-auto p-6 pb-20">
      <ReceivingHeader exportToCSV={exportToCSV} openNewModal={openNewModal} />
      
      <ReceivingFilterBoard 
        searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
        fromDate={fromDate} setFromDate={setFromDate} 
        toDate={toDate} setToDate={setToDate} 
        clearFilters={() => { setSearchTerm(''); setFromDate(''); setToDate(''); }} 
      />

      <ReceivingTable filteredData={filteredData} openEditModal={openEditModal} handleDelete={handleDelete} />

      <ReceivingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} record={selectedRecord} />
    </div>
  );
}