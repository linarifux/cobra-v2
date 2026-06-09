import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';
import DivisionHeader from '../components/division/DivisionHeader';
import AddDivisionForm from '../components/division/AddDivisionForm';
import FilterBoard from '../components/division/FilterBoard';
import DivisionCard from '../components/division/DivisionCard';
import { 
  fetchDivisions, 
  createDivision, 
  updateDivision, 
  deleteDivision 
} from '../store/slices/divisionSlice';

export default function DivisionsPage({ staff = [] }) {
  const dispatch = useDispatch();
  
  // Redux Central State
  const { items: apiDivisions, status, error } = useSelector(state => state.divisions);

  // UI States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDivision, setNewDivision] = useState({ name: '', code: '', manager: '', status: 'Active' });

  // Inline Actions States
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', code: '', manager: '' });

  // Query States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [managerFilter, setManagerFilter] = useState('All');

  // Load Initial Data
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchDivisions());
    }
  }, [status, dispatch]);

  // Fallback Reference Matrix Array
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
    if (!newDivision.name || !newDivision.code) return;

    try {
      await dispatch(createDivision({
        divisionName: newDivision.name,
        divisionCode: newDivision.code.toUpperCase(),
        status: newDivision.status || 'Active'
      })).unwrap();

      setNewDivision({ name: '', code: '', manager: '', status: 'Active' });
      setShowAddForm(false);
    } catch (err) {
      console.error("Failed to create division", err);
      alert(`Error creating division: ${err}`);
    }
  };

  const startEditing = (div) => {
    setEditingId(div.id);
    setEditFormData({ name: div.name, code: div.code, manager: div.manager });
  };

  const handleSaveEdit = async (id) => {
    if (!editFormData.name || !editFormData.code) return;
    
    try {
      await dispatch(updateDivision({
        id,
        divisionData: {
          divisionName: editFormData.name,
          divisionCode: editFormData.code.toUpperCase(),
        }
      })).unwrap();
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update division", err);
      alert(`Error updating division: ${err}`);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to decouple this division? This action cannot be undone.")) {
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
  };

  // Pipeline Filter Processing & Hardcoded Mapping integration
  const filteredDivisions = useMemo(() => {
    // 1. Map API fields to the generic names your UI components expect
    const mappedData = apiDivisions.map(div => ({
      id: div._id,
      name: div.divisionName,
      code: div.divisionCode,
      status: div.status || 'Active',
      // HARDCODED FALLBACKS FOR MISSING SCHEMA DATA
      manager: 'Unassigned', 
      inventory: 0,
      categoryCount: 0
    }));

    // 2. Apply Filters
    return mappedData.filter(div => {
      const matchesSearch = searchQuery.trim() === '' || 
        div.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        div.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || div.status === statusFilter;
      const matchesManager = managerFilter === 'All' || div.manager === managerFilter;
      
      return matchesSearch && matchesStatus && matchesManager;
    });
  }, [apiDivisions, searchQuery, statusFilter, managerFilter]);

  return (
    <div className="h-full max-w-[1400px] mx-auto p-6 space-y-6">
      {/* 1. Page Header */}
      <DivisionHeader showAddForm={showAddForm} setShowAddForm={setShowAddForm} />

      {/* 2. Slide-down Entry Panel */}
      {showAddForm && (
        <AddDivisionForm 
          newDivision={newDivision} 
          setNewDivision={setNewDivision} 
          onSubmit={handleAddDivision} 
          staffList={staffList} 
        />
      )}

      {/* 3. Control Filtering Board */}
      <FilterBoard 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        managerFilter={managerFilter}
        setManagerFilter={setManagerFilter}
        clearFilters={clearFilters}
        staffList={staffList}
      />

      {/* State Loading Check */}
      {status === 'loading' && apiDivisions.length === 0 ? (
        <div className="flex justify-center items-center py-20 text-slate-400">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : status === 'failed' ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl text-center text-sm font-bold border border-red-200">
          Failed to load divisions: {error}
        </div>
      ) : (
        /* 4. Display Matrix Workspace */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDivisions.length > 0 ? (
            filteredDivisions.map((div) => (
              <DivisionCard 
                key={div.id}
                div={div}
                isEditing={editingId === div.id}
                editFormData={editFormData}
                setEditFormData={setEditFormData}
                staffList={staffList}
                onStartEdit={startEditing}
                onCancelEdit={() => setEditingId(null)}
                onSaveEdit={handleSaveEdit}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <div className="col-span-full bg-white/40 border border-slate-200 rounded-2xl p-10 text-center font-semibold text-slate-400 text-sm">
              No organizational divisions found matching your selected search or configuration criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}