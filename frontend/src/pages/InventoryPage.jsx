import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// Redux Actions
import { fetchInventory, createInventory, updateInventory, deleteInventory } from '../store/slices/inventorySlice';
import { fetchCustomers } from '../store/slices/customerSlice';
import { fetchDivisions } from '../store/slices/divisionSlice';
import { fetchCategories } from '../store/slices/categorySlice';
import { fetchLocations } from '../store/slices/locationSlice';
import { fetchTypePieces } from '../store/slices/typePieceSlice';

// Child Components
import InventoryHeader from '../components/inventory/InventoryHeader';
import InventoryFilterBar from '../components/inventory/InventoryFilterBar';
import InventoryTable from '../components/inventory/InventoryTable';
import InventoryFormPanel from '../components/inventory/InventoryFormPanel';

// Import Confirm Hook
import { useConfirm } from '../providers/ConfirmProvider';

// --- PROFESSIONAL ERROR TRANSLATOR ---
const formatErrorMessage = (err) => {
  const errorString = typeof err === 'string' ? err : (err?.message || '');
  return errorString || 'An unexpected server error occurred.';
};

export default function InventoryPage() {
  const dispatch = useDispatch();
  const confirm = useConfirm();

  // Safely extract items and statuses, defaulting to empty arrays to prevent mapping crashes
  const { items: apiInventory = [], status: invStatus, error: invError } = useSelector(state => state.inventory || {});
  const { items: apiCustomers = [], status: custStatus } = useSelector(state => state.customers || {});
  const { items: apiDivisions = [], status: divStatus } = useSelector(state => state.divisions || {});
  const { items: apiCategories = [], status: catStatus } = useSelector(state => state.categories || {});
  const { items: apiLocations = [], status: locStatus } = useSelector(state => state.locations || {});
  const { items: apiTypePieces = [], status: tpStatus } = useSelector(state => state.typePieces || {});

  // --- 1. ROBUST FETCHING & REAL-TIME SYNC LOGIC ---
  const loadAllData = () => {
    dispatch(fetchInventory());
    if (custStatus === 'idle' || custStatus === 'failed') dispatch(fetchCustomers());
    if (divStatus === 'idle' || divStatus === 'failed') dispatch(fetchDivisions());
    if (catStatus === 'idle' || catStatus === 'failed') dispatch(fetchCategories());
    if (locStatus === 'idle' || locStatus === 'failed') dispatch(fetchLocations());
    if (tpStatus === 'idle' || tpStatus === 'failed') dispatch(fetchTypePieces());
  };

  useEffect(() => {
    loadAllData();

    // REAL-TIME FIX 1: Silent Background Polling
    // Fetches fresh stock levels every 10 seconds. The UI won't flash because 
    // isGlobalLoading ignores 'loading' status if items already exist in state.
    const pollInterval = setInterval(() => {
      dispatch(fetchInventory());
    }, 10000);

    // REAL-TIME FIX 2: Tab-Focus Synchronization
    // Instantly pulls fresh data the exact millisecond the user switches back to this tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        dispatch(fetchInventory());
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup listeners on unmount
    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // --- 2. GLOBAL LOADING & ERROR GATES ---
  const isGlobalLoading = 
    ((invStatus === 'idle' || invStatus === 'loading') && apiInventory.length === 0) ||
    ((custStatus === 'idle' || custStatus === 'loading') && apiCustomers.length === 0) ||
    ((divStatus === 'idle' || divStatus === 'loading') && apiDivisions.length === 0) ||
    ((catStatus === 'idle' || catStatus === 'loading') && apiCategories.length === 0) ||
    ((locStatus === 'idle' || locStatus === 'loading') && apiLocations.length === 0) ||
    ((tpStatus === 'idle' || tpStatus === 'loading') && apiTypePieces.length === 0);

  const hasGlobalError = 
    invStatus === 'failed' || custStatus === 'failed' || 
    divStatus === 'failed' || catStatus === 'failed' || 
    locStatus === 'failed' || tpStatus === 'failed';

  // Form Management State
  const [showFormPanel, setShowFormPanel] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);

  // Filter State
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // --- Handlers ---
  const handleOpenAdd = () => {
    setItemToEdit(null);
    setShowFormPanel(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenEdit = (id) => {
    const item = apiInventory?.find(i => i._id === id);
    if (item) {
      setItemToEdit(item);
      setShowFormPanel(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFormSubmit = (payload, isEdit, id) => {
    const actionPromise = isEdit
      ? dispatch(updateInventory({ id, inventoryData: payload })).unwrap()
      : dispatch(createInventory(payload)).unwrap();

    actionPromise
      .then(() => setShowFormPanel(false))
      .catch(() => {}); 
      
    return actionPromise; 
  };

  const handleDeleteItem = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Asset?',
      message: 'Are you sure you want to permanently delete this inventory asset? This action cannot be undone and will remove it from all storage locations.',
      confirmText: 'Delete Asset',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        const deletePromise = dispatch(deleteInventory(id)).unwrap();
        
        toast.promise(deletePromise, {
          loading: 'Deleting asset...',
          success: 'Asset permanently removed from database.',
          error: (err) => `Delete Failed: ${formatErrorMessage(err)}`
        });

        await deletePromise;
      } catch (err) {
        // Handled silently by toast.promise
      }
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setCustomerFilter('All');
    setDivisionFilter('All');
    setCategoryFilter('All');
    setOnlyAvailable(false);
  };

  // --- Map and Filter Logic (Safely Chained) ---
  const mappedInventory = useMemo(() => {
    if (!Array.isArray(apiInventory)) return [];
    return apiInventory.map(item => ({
      id: item._id,
      code: item.productCode || item.sku || 'N/A',
      desc: item.description,
      desc2: item.description2,
      customer: item.customer?.customerName || 'Unassigned',
      customerId: item.customer?._id || '',
      division: item.division?.divisionName || 'Unassigned',
      divisionId: item.division?._id || '',
      category: item.category1?.categoryName || 'Unassigned',
      categoryId: item.category1?._id || '',
      price: item.price ?? 0,
      available: item.available ?? item.unitsOnHand ?? 0,
      onOrder: item.pipelineSupply ?? item.openOrders ?? 0,
      minThreshold: item.min ?? item.safetyBuffer ?? 0,
    }));
  }, [apiInventory]);

  const filteredInventory = useMemo(() => {
    return mappedInventory.filter(item => {
      const query = search.toLowerCase().trim();
      const matchesSearch = query === '' || 
        item.desc?.toLowerCase().includes(query) || 
        item.code?.toLowerCase().includes(query) ||
        item.customer?.toLowerCase().includes(query);
        
      const matchesCustomer = customerFilter === 'All' || item.customerId === customerFilter;
      const matchesDivision = divisionFilter === 'All' || item.divisionId === divisionFilter;
      const matchesCategory = categoryFilter === 'All' || item.categoryId === categoryFilter;
      const matchesStock = onlyAvailable ? item.available > 0 : true;

      return matchesSearch && matchesCustomer && matchesDivision && matchesCategory && matchesStock;
    })
    .sort((a, b) => {
      const codeA = a.code || '';
      const codeB = b.code || '';
      return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [search, customerFilter, divisionFilter, categoryFilter, onlyAvailable, mappedInventory]);


  // ------------------------------------------------------------------
  // RENDER BLOCKS: Strict gating prevents child components from crashing
  // ------------------------------------------------------------------

  if (hasGlobalError && !isGlobalLoading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50/80 backdrop-blur-md border border-red-200 p-8 rounded-3xl flex flex-col items-center max-w-md text-center shadow-lg">
          <AlertTriangle className="text-red-500 mb-4" size={40} />
          <h2 className="text-red-800 text-lg font-black tracking-tight mb-2">Synchronization Failed</h2>
          <p className="text-red-600/80 text-xs font-medium mb-6 leading-relaxed">
            The database failed to respond properly. {invError ? `Server reported: ${invError}` : 'Please check your connection and try again.'}
          </p>
          <button 
            onClick={loadAllData} 
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
          >
            <RefreshCw size={14} /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (isGlobalLoading) {
    return (
      <div className="h-full flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-brand-gold" size={36} />
        <div className="text-center space-y-1">
          <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Compiling Database</p>
          <p className="text-[10px] font-bold text-slate-400 tracking-wider">Synchronizing Inventory & Core Directories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full max-w-[1500px] mx-auto p-6 space-y-6 animate-in fade-in duration-500 pb-20">
      
      <InventoryHeader onAddClick={handleOpenAdd} />

      {showFormPanel && (
        <InventoryFormPanel 
          itemToEdit={itemToEdit}
          apiCustomers={apiCustomers}
          apiDivisions={apiDivisions}
          apiCategories={apiCategories}
          apiLocations={apiLocations}
          apiTypePieces={apiTypePieces} 
          onSubmit={handleFormSubmit}
          onClose={() => setShowFormPanel(false)}
        />
      )}

      <InventoryFilterBar 
        search={search} setSearch={setSearch}
        customerFilter={customerFilter} setCustomerFilter={setCustomerFilter}
        divisionFilter={divisionFilter} setDivisionFilter={setDivisionFilter}
        categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
        onlyAvailable={onlyAvailable} setOnlyAvailable={setOnlyAvailable}
        apiCustomers={apiCustomers}
        apiDivisions={apiDivisions} 
        apiCategories={apiCategories}
        onClearFilters={handleClearFilters}
      />

      <InventoryTable 
        filteredInventory={filteredInventory}
        apiInventory={apiInventory}
        onEditClick={handleOpenEdit}
        onDeleteClick={handleDeleteItem}
      />

    </div>
  );
}