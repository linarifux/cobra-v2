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

export default function DivisionsPage({ staff = [] }) {
  const dispatch = useDispatch();
  
  // Redux Central State (Safely accessed)
  const { items: apiDivisions = [], status: divStatus = 'idle', error: divError } = useSelector(state => state.divisions || {});
  const { items: apiCustomers = [], status: custStatus = 'idle' } = useSelector(state => state.customers || {});

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
  }, [divStatus, custStatus, dispatch]);

  // Ensure form has a default customer selected once data loads
  useEffect(() => {
    if (apiCustomers.length > 0 && !newDivision.customer) {
      setNewDivision(prev => ({ ...prev, customer: apiCustomers[0]._id }));
    }
  }, [apiCustomers, newDivision.customer]);

  // Fallback Reference Matrix Array for System Staff
  const staffList = staff.length > 0 ? staff : [
    { id: 1, name: 'Sarah Jenkins' },
    { id: 2, name: 'Marcus Vance' },
    { id: 3, name: 'Lin Nguyen' },
    { id: 4, name: 'Amir Hossain' }
  ];

  // Logic Handlers mapped to API
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
      await dispatch(createDivision({
        divisionName: newDivision.name,
        divisionCode: newDivision.code.toUpperCase(),
        customer: newDivision.customer, 
        status: newDivision.status || 'Active'
      })).unwrap();

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
      manager: div.manager,
      customer: div.customerId || '' 
    });
  };

  const handleSaveEdit = async (id) => {
    if (!editFormData.name || !editFormData.code || !editFormData.customer) return;
    
    try {
      await dispatch(updateDivision({
        id,
        divisionData: {
          divisionName: editFormData.name,
          divisionCode: editFormData.code.toUpperCase(),
          customer: editFormData.customer
        }
      })).unwrap();
      
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
      // 1. Safely extract the Customer ID whether the backend populated it or just sent a string
      const custId = div.customer?._id || div.customer;
      
      // 2. Cross-reference our Redux customers list to guarantee we have the name
      const matchedCustomer = apiCustomers.find(c => c._id === custId);

      return {
        id: div._id,
        name: div.divisionName,
        code: div.divisionCode,
        status: div.status || 'Active',
        customerId: custId,
        // 3. Fallback gracefully: Local Redux -> Backend Populated -> 'Unassigned'
        customerName: matchedCustomer?.customerName || div.customer?.customerName || 'Unassigned',
        manager: div.manager || 'Unassigned', 
        inventory: div.inventory || 0,
        categoryCount: div.categoryCount || 0
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
  }, [apiDivisions, apiCustomers, searchQuery, statusFilter, managerFilter, customerFilter]);

  return (
    <div className="h-full max-w-[1400px] mx-auto p-6 space-y-6 animate-fade-in">
      <DivisionHeader showAddForm={showAddForm} setShowAddForm={setShowAddForm} />

      {showAddForm && (
        <AddDivisionForm 
          newDivision={newDivision} 
          setNewDivision={setNewDivision} 
          onSubmit={handleAddDivision} 
          staffList={staffList}
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
        staffList={staffList}
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
                staffList={staffList}
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