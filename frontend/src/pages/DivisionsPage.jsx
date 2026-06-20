import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';
import DivisionHeader from '../components/division/DivisionHeader';
import AddDivisionForm from '../components/division/AddDivisionForm';
import FilterBoard from '../components/division/FilterBoard';
import DivisionCard from '../components/division/DivisionCard';

// Redux Actions
import { fetchDivisions, createDivision, updateDivision, deleteDivision } from '../store/slices/divisionSlice';
import { fetchCustomers } from '../store/slices/customerSlice';
import { fetchInventory } from '../store/slices/inventorySlice';   
import { fetchCategories } from '../store/slices/categorySlice'; 
// Import updateUser so we can assign divisions to the user's array
import { fetchUsers, updateUser } from '../store/slices/userSlice'; 

export default function DivisionsPage() {
  const dispatch = useDispatch();
  
  // Redux Central State (Safely accessed)
  const { items: apiDivisions = [], status: divStatus = 'idle', error: divError } = useSelector(state => state.divisions || {});
  const { items: apiCustomers = [], status: custStatus = 'idle' } = useSelector(state => state.customers || {});
  const { items: apiInventory = [], status: invStatus = 'idle' } = useSelector(state => state.inventory || {});
  const { items: apiCategories = [], status: catStatus = 'idle' } = useSelector(state => state.categories || {});
  const { items: apiUsers = [], status: userStatus = 'idle' } = useSelector(state => state.users || {});

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

  // Load Initial Data
  useEffect(() => {
    if (divStatus === 'idle') dispatch(fetchDivisions());
    if (custStatus === 'idle') dispatch(fetchCustomers());
    if (invStatus === 'idle') dispatch(fetchInventory());
    if (catStatus === 'idle') dispatch(fetchCategories());
    if (userStatus === 'idle') dispatch(fetchUsers());
  }, [divStatus, custStatus, invStatus, catStatus, userStatus, dispatch]);

  // Ensure form has a default customer selected once data loads
  useEffect(() => {
    if (apiCustomers.length > 0 && !newDivision.customer) {
      setNewDivision(prev => ({ ...prev, customer: apiCustomers[0]._id }));
    }
  }, [apiCustomers, newDivision.customer]);

  // 1. FILTER STAFF: Only allow Order Portal users to be division managers
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
      await dispatch(updateDivision({ 
        id, 
        divisionData: { status: newStatus } 
      })).unwrap();
    } catch (err) {
      console.error("Failed to toggle status", err);
      alert(`Error toggling status: ${err}`);
    }
  };

  const handleAddDivision = async (e) => {
    e.preventDefault();
    if (!newDivision.name || !newDivision.code || !newDivision.customer) return;

    setIsSubmitting(true);
    try {
      // 1. Create the Division
      const createdDiv = await dispatch(createDivision({
        divisionName: newDivision.name,
        divisionCode: newDivision.code.toUpperCase(),
        customer: newDivision.customer, 
        status: newDivision.status || 'Active'
      })).unwrap();

      // 2. Synchronize User Array: If a manager was selected, add this new division to their user profile
      if (newDivision.manager && createdDiv._id) {
        const selectedUser = apiUsers.find(u => u._id === newDivision.manager);
        if (selectedUser) {
          // Extract existing division IDs safely and append the new one
          const currentDivIds = (selectedUser.divisions || []).map(d => d._id || d);
          const updatedDivs = [...new Set([...currentDivIds, createdDiv._id])];
          
          await dispatch(updateUser({ id: selectedUser._id, userData: { divisions: updatedDivs } })).unwrap();
          dispatch(fetchUsers()); // Re-fetch to update UI state
        }
      }

      setNewDivision({ name: '', code: '', manager: '', status: 'Active', customer: apiCustomers[0]?._id || '' });
      setShowAddForm(false);
    } catch (err) {
      console.error("Failed to create division", err);
      alert(`Error creating division: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (div) => {
    setEditingId(div.id);
    setEditFormData({ 
      name: div.name, 
      code: div.code, 
      manager: div.managerId || '', // Pre-select current manager ID in the dropdown
      customer: div.customerId || '' 
    });
  };

  const handleSaveEdit = async (id) => {
    if (!editFormData.name || !editFormData.code || !editFormData.customer) return;
    
    try {
      // 1. Update the Division details
      await dispatch(updateDivision({
        id,
        divisionData: {
          divisionName: editFormData.name,
          divisionCode: editFormData.code.toUpperCase(),
          customer: editFormData.customer,
        }
      })).unwrap();

      // 2. Synchronize User Arrays if the Manager changed
      const currentDiv = filteredDivisions.find(d => d.id === id);
      const oldManagerId = currentDiv?.managerId;
      const newManagerId = editFormData.manager;

      if (oldManagerId !== newManagerId) {
        // Remove division from the OLD manager's array
        if (oldManagerId) {
          const oldUser = apiUsers.find(u => u._id === oldManagerId);
          if (oldUser) {
            const updatedDivs = (oldUser.divisions || []).map(d => d._id || d).filter(divId => divId !== id);
            await dispatch(updateUser({ id: oldManagerId, userData: { divisions: updatedDivs } }));
          }
        }
        
        // Add division to the NEW manager's array
        if (newManagerId) {
          const newUser = apiUsers.find(u => u._id === newManagerId);
          if (newUser) {
            const currentDivs = (newUser.divisions || []).map(d => d._id || d);
            const updatedDivs = [...new Set([...currentDivs, id])];
            await dispatch(updateUser({ id: newManagerId, userData: { divisions: updatedDivs } }));
          }
        }
        dispatch(fetchUsers()); // Re-fetch to sync UI
      }
      
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update division", err);
      alert(`Error updating division: ${err}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to decouple this division? This action cannot be undone.")) {
      try {
        await dispatch(deleteDivision(id)).unwrap();
        // Optionally: Loop through users and remove this ID from their arrays
        dispatch(fetchUsers()); 
      } catch (err) {
        console.error("Failed to delete division", err);
        alert(`Error deleting division: ${err}`);
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
      // 1. Safely extract Customer
      const custId = div.customer?._id || div.customer;
      const matchedCustomer = apiCustomers.find(c => c._id === custId);

      // 2. REVERSE MAPPING: Find who the manager is by looking at the Users' `divisions` arrays
      const assignedUser = orderPortalStaff.find(u => 
        u.divisions.some(d => (d._id || d) === div._id)
      );

      // 3. Count Inventory
      const inventoryCount = apiInventory.filter(inv => {
        const invDivId = inv.division?._id || inv.division;
        return invDivId === div._id;
      }).length;

      // 4. Count Categories
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
        
        // Pass the dynamically discovered user data down to the card
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

  return (
    <div className="h-full max-w-[1400px] mx-auto p-6 space-y-6 animate-fade-in">
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
      {divStatus === 'loading' && apiDivisions.length === 0 ? (
        <div className="flex justify-center items-center py-20 text-slate-400">
          <Loader2 className="animate-spin text-brand-gold" size={32} />
        </div>
      ) : divStatus === 'failed' ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl text-center text-sm font-bold border border-red-200 shadow-sm">
          Failed to load divisions: {divError}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDivisions.length > 0 ? (
            filteredDivisions.map((div) => (
              <DivisionCard 
                key={div.id}
                div={div}
                isEditing={editingId === div.id}
                editFormData={editFormData}
                setEditFormData={setEditFormData}
                staffList={orderPortalStaff} // Dropdowns will only show order portal users
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