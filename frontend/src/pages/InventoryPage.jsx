import React, { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';

// Redux Actions
import { fetchInventory, createInventory, updateInventory, deleteInventory } from '../store/slices/inventorySlice';
import { fetchCustomers } from '../store/slices/customerSlice';
import { fetchDivisions } from '../store/slices/divisionSlice';
import { fetchCategories } from '../store/slices/categorySlice';

// Child Components
import InventoryHeader from '../components/inventory/InventoryHeader';
import InventoryFilterBar from '../components/inventory/InventoryFilterBar';
import InventoryTable from '../components/inventory/InventoryTable';
import InventoryFormPanel from '../components/inventory/InventoryFormPanel';

export default function InventoryPage() {
  const dispatch = useDispatch();

  const { items: apiInventory = [], status: invStatus } = useSelector(state => state.inventory || {});
  const { items: apiCustomers = [], status: custStatus } = useSelector(state => state.customers || {});
  const { items: apiDivisions = [], status: divStatus } = useSelector(state => state.divisions || {});
  const { items: apiCategories = [], status: catStatus } = useSelector(state => state.categories || {});

  // Mount logic
  useEffect(() => {
    if (invStatus === 'idle') dispatch(fetchInventory());
    if (custStatus === 'idle') dispatch(fetchCustomers());
    if (divStatus === 'idle') dispatch(fetchDivisions());
    if (catStatus === 'idle') dispatch(fetchCategories());
  }, [invStatus, custStatus, divStatus, catStatus, dispatch]);

  // Form Management State
  const [showFormPanel, setShowFormPanel] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);

  // Filter State
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('All'); // NEW: Customer Filter
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
    const item = apiInventory.find(i => i._id === id);
    if (item) {
      setItemToEdit(item);
      setShowFormPanel(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFormSubmit = async (payload, isEdit, id) => {
    try {
      if (isEdit) {
        await dispatch(updateInventory({ id, inventoryData: payload })).unwrap();
      } else {
        await dispatch(createInventory(payload)).unwrap();
      }
      setShowFormPanel(false);
    } catch (err) {
      console.error("Failed to save inventory:", err);
      alert(`Error saving inventory: ${err}`);
      throw err; 
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm("Are you sure you want to permanently delete this inventory asset item?")) {
      try {
        await dispatch(deleteInventory(id)).unwrap();
      } catch (err) {
        console.error("Failed to delete inventory:", err);
      }
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setCustomerFilter('All'); // Reset customer filter
    setDivisionFilter('All');
    setCategoryFilter('All');
    setOnlyAvailable(false);
  };

  // --- Map and Filter Logic ---
  const mappedInventory = useMemo(() => {
    return apiInventory.map(item => ({
      id: item._id,
      code: item.productCode || item.sku || 'N/A',
      desc: item.itemName || item.description,
      customer: item.customer?.customerName || 'Unassigned',
      customerId: item.customer?._id || '',
      division: item.division?.divisionName || 'Unassigned',
      divisionId: item.division?._id || '',
      category: item.category1?.categoryName || 'Unassigned',
      categoryId: item.category1?._id || '',
      price: item.price || item.unitCost || 0,
      available: item.available || item.unitsOnHand || 0,
      onOrder: item.pipelineSupply || item.openOrders || 0,
      minThreshold: item.min || item.safetyBuffer || 0,
    }));
  }, [apiInventory]);

  const filteredInventory = useMemo(() => {
    return mappedInventory.filter(item => {
      const query = search.toLowerCase().trim();
      const matchesSearch = query === '' || 
        item.desc?.toLowerCase().includes(query) || 
        item.code?.toLowerCase().includes(query) ||
        item.customer?.toLowerCase().includes(query);
        
      const matchesCustomer = customerFilter === 'All' || item.customerId === customerFilter; // NEW
      const matchesDivision = divisionFilter === 'All' || item.divisionId === divisionFilter;
      const matchesCategory = categoryFilter === 'All' || item.categoryId === categoryFilter;
      const matchesStock = onlyAvailable ? item.available > 0 : true;

      // Include matchesCustomer in the final return
      return matchesSearch && matchesCustomer && matchesDivision && matchesCategory && matchesStock;
    });
  }, [search, customerFilter, divisionFilter, categoryFilter, onlyAvailable, mappedInventory]);

  if (invStatus === 'loading' && apiInventory.length === 0) {
    return (
      <div className="h-full flex justify-center items-center py-20 text-slate-400">
        <Loader2 className="animate-spin text-brand-gold" size={32} />
      </div>
    );
  }

  return (
    <div className="h-full max-w-[1400px] mx-auto p-6 space-y-6 animate-fade-in">
      
      <InventoryHeader onAddClick={handleOpenAdd} />

      {showFormPanel && (
        <InventoryFormPanel 
          itemToEdit={itemToEdit}
          apiCustomers={apiCustomers}
          apiDivisions={apiDivisions}
          apiCategories={apiCategories}
          onSubmit={handleFormSubmit}
          onClose={() => setShowFormPanel(false)}
        />
      )}

      <InventoryFilterBar 
        search={search} setSearch={setSearch}
        customerFilter={customerFilter} setCustomerFilter={setCustomerFilter} // NEW
        divisionFilter={divisionFilter} setDivisionFilter={setDivisionFilter}
        categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
        onlyAvailable={onlyAvailable} setOnlyAvailable={setOnlyAvailable}
        apiCustomers={apiCustomers} // NEW
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