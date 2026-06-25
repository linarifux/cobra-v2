import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import DivisionHeader from '../components/division/DivisionHeader';
import AddDivisionForm from '../components/division/AddDivisionForm';
import FilterBoard from '../components/division/FilterBoard';
import DivisionCard from '../components/division/DivisionCard';

// Redux Actions
import { fetchDivisions, createDivision, updateDivision, deleteDivision } from '../store/slices/divisionSlice';
import { fetchCustomers } from '../store/slices/customerSlice';
import { fetchInventory } from '../store/slices/inventorySlice';   
import { fetchCategories } from '../store/slices/categorySlice'; 
import { fetchUsers, updateUser } from '../store/slices/userSlice'; 

// Import Confirm Hook
import { useConfirm } from '../providers/ConfirmProvider';

// --- PROFESSIONAL ERROR TRANSLATOR ---
const formatErrorMessage = (err) => {
  const errorString = typeof err === 'string' ? err : (err?.message || '');
  if (errorString.includes('E11000') || errorString.includes('duplicate key')) {
    return 'This Division Code is already in use. Please use a unique identifier.';
  }
  return errorString || 'An unexpected server error occurred.';
};

export default function DivisionsPage() {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  
  // Redux Central State (Safely accessed)
  const { items: apiDivisions = [], status: divStatus = 'idle', error: divError } = useSelector(state => state.divisions || {});
  const { items: apiCustomers = [], status: custStatus = 'idle' } = useSelector(state => state.customers || {});
  const { items: apiInventory = [], status: invStatus = 'idle' } = useSelector(state => state.inventory || {});
  const { items: apiCategories = [], status: catStatus = 'idle' } = useSelector(state => state.categories || {});
  const { items: apiUsers = [], status: userStatus = 'idle' } = useSelector(state => state.users || {});

  // --- 1. ROBUST FETCHING LOGIC ---
  const loadAllData = () => {
    if (divStatus === 'idle' || divStatus === 'failed') dispatch(fetchDivisions());
    if (custStatus === 'idle' || custStatus === 'failed') dispatch(fetchCustomers());
    if (invStatus === 'idle' || invStatus === 'failed') dispatch(fetchInventory());
    if (catStatus === 'idle' || catStatus === 'failed') dispatch(fetchCategories());
    if (userStatus === 'idle' || userStatus === 'failed') dispatch(fetchUsers());
  };

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // UI States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDivision, setNewDivision] = useState({ name: '', code: '', manager: '', status: 'Active', customer: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline Actions States
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', code: '', manager: '', customer: '' });

  // Query States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [managerFilter, setManagerFilter] = useState('All');
  const [customerFilter, setCustomerFilter] = useState('All');

  // Ensure form has a default customer selected once data loads
  useEffect(() => {
    if (apiCustomers.length > 0 && !newDivision.customer) {
      setNewDivision(prev => ({ ...prev, customer: apiCustomers[0]._id }));
    }
  }, [apiCustomers, newDivision.customer]);

  // FILTER STAFF: Only allow Order Portal users to be division managers
  const orderPortalStaff = useMemo(() => {
    return apiUsers
      .filter(user => user.portal === 'order')
      .map(user => ({
        id: user._id,
        name: user.name,
        divisions: user.divisions || []
      }));
  }, [apiUsers]);

  // --- Logic Handlers mapped to API ---
  const handleToggleStatus = async (id) => {
    const targetDiv = apiDivisions.find(div => div._id === id);
    if (!targetDiv) return;
    
    const newStatus = targetDiv.status === 'Active' ? 'Inactive' : 'Active';
    
    try {
      const togglePromise = dispatch(updateDivision({ 
        id, 
        divisionData: { status: newStatus } 
      })).unwrap();

      toast.promise(togglePromise, {
        loading: 'Updating division status...',
        success: `Division status updated to ${newStatus}.`,
        error: (err) => `Failed to update status: ${formatErrorMessage(err)}`
      });

      await togglePromise;
    } catch (err) {
      // Caught silently
    }
  };

  const handleAddDivision = async (e) => {
    e.preventDefault();
    if (!newDivision.name || !newDivision.code || !newDivision.customer) {
      return toast.warning('Missing Data', { description: 'Please fill out all required fields.' });
    }

    setIsSubmitting(true);
    
    try {
      // 1. Create the Division
      const createPromise = dispatch(createDivision({
        divisionName: newDivision.name,
        divisionCode: newDivision.code.toUpperCase(),
        customer: newDivision.customer, 
        status: newDivision.status || 'Active'
      })).unwrap();

      toast.promise(createPromise, {
        loading: 'Creating new division...',
        success: 'Division architecture successfully deployed.',
        error: (err) => formatErrorMessage(err)
      });

      const createdDiv = await createPromise;

      // 2. Synchronize User Array: If a manager was selected, add this new division to their user profile
      if (newDivision.manager && createdDiv._id) {
        const selectedUser = apiUsers.find(u => u._id === newDivision.manager);
        if (selectedUser) {
          const currentDivIds = (selectedUser.divisions || []).map(d => d._id || d);
          const updatedDivs = [...new Set([...currentDivIds, createdDiv._id])];
          await dispatch(updateUser({ id: selectedUser._id, userData: { divisions: updatedDivs } })).unwrap();
          dispatch(fetchUsers()); // Re-fetch to update UI state
        }
      }

      setNewDivision({ name: '', code: '', manager: '', status: 'Active', customer: apiCustomers[0]?._id || '' });
      setShowAddForm(false);
    } catch (err) {
      // Caught silently
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (div) => {
    setEditingId(div.id);
    setEditFormData({ 
      name: div.name, 
      code: div.code, 
      manager: div.managerId || '', 
      customer: div.customerId || '' 
    });
  };

  const handleSaveEdit = async (id) => {
    if (!editFormData.name || !editFormData.code || !editFormData.customer) {
      return toast.warning('Missing Data', { description: 'Please fill out all required fields.' });
    }
    
    try {
      // 1. Update the Division details
      const updatePromise = dispatch(updateDivision({
        id,
        divisionData: {
          divisionName: editFormData.name,
          divisionCode: editFormData.code.toUpperCase(),
          customer: editFormData.customer,
        }
      })).unwrap();

      toast.promise(updatePromise, {
        loading: 'Saving modifications...',
        success: 'Division architecture updated successfully.',
        error: (err) => formatErrorMessage(err)
      });

      await updatePromise;

      // 2. Synchronize User Arrays if the Manager changed
      const currentDiv = filteredDivisions.find(d => d.id === id);
      const oldManagerId = currentDiv?.managerId;
      const newManagerId = editFormData.manager;

      if (oldManagerId !== newManagerId) {
        if (oldManagerId) {
          const oldUser = apiUsers.find(u => u._id === oldManagerId);
          if (oldUser) {
            const updatedDivs = (oldUser.divisions || []).map(d => d._id || d).filter(divId => divId !== id);
            await dispatch(updateUser({ id: oldManagerId, userData: { divisions: updatedDivs } }));
          }
        }
        
        if (newManagerId) {
          const newUser = apiUsers.find(u => u._id === newManagerId);
          if (newUser) {
            const currentDivs = (newUser.divisions || []).map(d => d._id || d);
            const updatedDivs = [...new Set([...currentDivs, id])];
            await dispatch(updateUser({ id: newManagerId, userData: { divisions: updatedDivs } }));
          }
        }
        dispatch(fetchUsers()); 
      }
      
      setEditingId(null);
    } catch (err) {
      // Caught silently
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Decouple Division?',
      message: 'Are you sure you want to permanently delete this organizational division? This action cannot be undone and may orphan associated sub-categories.',
      confirmText: 'Delete Division',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        const deletePromise = dispatch(deleteDivision(id)).unwrap();
        
        toast.promise(deletePromise, {
          loading: 'Decoupling division...',
          success: 'Division permanently removed from network.',
          error: (err) => `Delete Failed: ${formatErrorMessage(err)}`
        });

        await deletePromise;
        dispatch(fetchUsers()); 
      } catch (err) {
        // Caught silently
      }
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setManagerFilter('All');
    setCustomerFilter('All');
  };

  // Pipeline Filter Processing & Safe Data Mapping
  const filteredDivisions = useMemo(() => {
    const mappedData = apiDivisions.map(div => {
      const custId = div.customer?._id || div.customer;
      const matchedCustomer = apiCustomers.find(c => c._id === custId);

      const assignedUser = orderPortalStaff.find(u => 
        u.divisions.some(d => (d._id || d) === div._id)
      );

      const inventoryCount = apiInventory.filter(inv => {
        const invDivId = inv.division?._id || inv.division;
        return invDivId === div._id;
      }).length;

      const categoryCount = apiCategories.filter(cat => {
        const catDivId = cat.division?._id || cat.division;
        return catDivId === div._id;
      }).length;

      return {
        id: div._id,
        name: div.divisionName,
        code: div.divisionCode,
        status: div.status || 'Active',
        customerId: custId,
        customerName: matchedCustomer?.customerName || div.customer?.customerName || 'Unassigned',
        managerId: assignedUser ? assignedUser.id : null,
        manager: assignedUser ? assignedUser.name : 'Unassigned', 
        inventory: inventoryCount,
        categoryCount: categoryCount,
      };
    });

    // Apply Filters
    return mappedData.filter(div => {
      const matchesSearch = searchQuery.trim() === '' || 
        div.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        div.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || div.status === statusFilter;
      const matchesManager = managerFilter === 'All' || div.manager === managerFilter;
      const matchesCustomer = customerFilter === 'All' || div.customerId === customerFilter;
      
      return matchesSearch && matchesStatus && matchesManager && matchesCustomer;
    });
  }, [apiDivisions, apiCustomers, orderPortalStaff, apiInventory, apiCategories, searchQuery, statusFilter, managerFilter, customerFilter]);

  // --- GLOBAL ERROR GATES ---
  const hasGlobalError = divStatus === 'failed' || custStatus === 'failed' || userStatus === 'failed';
  const isGlobalLoading = divStatus === 'loading' || custStatus === 'loading' || userStatus === 'loading';

  if (hasGlobalError && !isGlobalLoading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50/80 backdrop-blur-md border border-red-200 p-8 rounded-3xl flex flex-col items-center max-w-md text-center shadow-lg">
          <AlertTriangle className="text-red-500 mb-4" size={40} />
          <h2 className="text-red-800 text-lg font-black tracking-tight mb-2">Synchronization Failed</h2>
          <p className="text-red-600/80 text-xs font-medium mb-6 leading-relaxed">
            The database failed to respond properly. {divError ? `Server reported: ${divError}` : 'Please check your connection and try again.'}
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

  return (
    <div className="h-full max-w-[1500px] mx-auto p-6 space-y-6 animate-fade-in pb-20">
      <DivisionHeader showAddForm={showAddForm} setShowAddForm={setShowAddForm} />

      {showAddForm && (
        <AddDivisionForm 
          newDivision={newDivision} 
          setNewDivision={setNewDivision} 
          onSubmit={handleAddDivision} 
          staffList={orderPortalStaff} // Only pass order portal users
          customersList={apiCustomers}
          isSubmitting={isSubmitting}
        />
      )}

      <FilterBoard 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        managerFilter={managerFilter}
        setManagerFilter={setManagerFilter}
        customerFilter={customerFilter}
        setCustomerFilter={setCustomerFilter}
        clearFilters={clearFilters}
        staffList={orderPortalStaff} // Only pass order portal users
        customersList={apiCustomers}
      />

      {/* State Loading Check */}
      {isGlobalLoading && apiDivisions.length === 0 ? (
        <div className="flex justify-center items-center py-20 text-slate-400">
          <Loader2 className="animate-spin text-brand-gold" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredDivisions.length > 0 ? (
            filteredDivisions.map((div) => (
              <DivisionCard 
                key={div.id}
                div={div}
                isEditing={editingId === div.id}
                editFormData={editFormData}
                setEditFormData={setEditFormData}
                staffList={orderPortalStaff} 
                customersList={apiCustomers}
                onStartEdit={startEditing}
                onCancelEdit={() => setEditingId(null)}
                onSaveEdit={handleSaveEdit}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <div className="col-span-full bg-white/40 backdrop-blur-md border border-white/60 rounded-3xl p-10 text-center font-semibold text-slate-500 text-sm shadow-sm">
              No organizational divisions found matching your selected search or configuration criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}