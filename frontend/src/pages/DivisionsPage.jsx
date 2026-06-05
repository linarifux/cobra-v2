import React, { useState } from 'react';
import DivisionHeader from '../components/division/DivisionHeader';
import AddDivisionForm from '../components/division/AddDivisionForm';
import FilterBoard from '../components/division/FilterBoard';
import DivisionCard from '../components/division/DivisionCard';

export default function DivisionsPage({ staff = [] }) {
  // Central State Management
  const [divisions, setDivisions] = useState([
    { id: 1, name: 'Animal Nutrition', code: 'DIV-ANM', inventory: 581, categoryCount: 4, manager: 'Sarah Jenkins', status: 'Active' },
    { id: 2, name: 'Human Nutrition', code: 'DIV-HMN', inventory: 0, categoryCount: 0, manager: 'Marcus Vance', status: 'Active' },
    { id: 3, name: 'Food & Beverage', code: 'DIV-FNB', inventory: 43, categoryCount: 2, manager: 'Lin Nguyen', status: 'Active' },
  ]);

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

  // Fallback Reference Matrix Array
  const staffList = staff.length > 0 ? staff : [
    { id: 1, name: 'Sarah Jenkins' },
    { id: 2, name: 'Marcus Vance' },
    { id: 3, name: 'Lin Nguyen' },
    { id: 4, name: 'Amir Hossain' }
  ];

  // Logic Handlers
  const handleToggleStatus = (id) => {
    setDivisions(prev => prev.map(div => 
      div.id === id ? { ...div, status: div.status === 'Active' ? 'Inactive' : 'Active' } : div
    ));
  };

  const handleAddDivision = (e) => {
    e.preventDefault();
    if (!newDivision.name || !newDivision.code) return;

    setDivisions(prev => [...prev, {
      id: Date.now(),
      name: newDivision.name,
      code: newDivision.code.toUpperCase(),
      manager: newDivision.manager || staffList[0]?.name || 'Unassigned',
      inventory: 0,      
      categoryCount: 0,
      status: 'Active'
    }]);

    setNewDivision({ name: '', code: '', manager: '', status: 'Active' });
    setShowAddForm(false);
  };

  const startEditing = (div) => {
    setEditingId(div.id);
    setEditFormData({ name: div.name, code: div.code, manager: div.manager });
  };

  const handleSaveEdit = (id) => {
    if (!editFormData.name || !editFormData.code) return;
    setDivisions(prev => prev.map(div => 
      div.id === id ? { ...div, ...editFormData, code: editFormData.code.toUpperCase() } : div
    ));
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to decouple this division?")) {
      setDivisions(prev => prev.filter(div => div.id !== id));
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setManagerFilter('All');
  };

  // Pipeline Filter Processing
  const filteredDivisions = divisions.filter(div => {
    const matchesSearch = searchQuery.trim() === '' || 
      div.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      div.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || div.status === statusFilter;
    const matchesManager = managerFilter === 'All' || div.manager === managerFilter;
    
    return matchesSearch && matchesStatus && matchesManager;
  });

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

      {/* 4. Display Matrix Workspace */}
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
    </div>
  );
}