import React, { useState } from 'react';
import CategoryHeader from '../components/category/CategoryHeader';
import CategoryForm from '../components/category/CategoryForm';
import FilterBoard from '../components/category/FilterBoard';
import CategoryTable from '../components/category/CategoryTable';

export default function CategoryPage() {
  // Mock divisions state to populate dropdowns
  const [divisions] = useState([
    'North American Supply',
    'EMEA Distribution',
    'APAC Electronics Procurement'
  ]);

  const [categories, setCategories] = useState([
    { id: 1, name: 'Nutrition', level: 1, parent: 'None', division: 'North American Supply' },
    { id: 2, name: 'Dog Food', level: 2, parent: 'Nutrition', division: 'North American Supply' },
    { id: 3, name: 'Microchips', level: 1, parent: 'None', division: 'APAC Electronics Procurement' },
  ]);

  // UI Control States
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', level: 1, parent: 'None', division: 'North American Supply' });
  const [editingId, setEditingId] = useState(null);

  // Filter States
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');

  const handleAddOrUpdate = () => {
    if (!formData.name) return;
    
    if (editingId) {
      setCategories(categories.map(c => c.id === editingId ? { ...c, ...formData } : c));
      setEditingId(null);
    } else {
      setCategories([...categories, { id: Date.now(), ...formData }]);
    }
    
    setFormData({ name: '', level: 1, parent: 'None', division: divisions[0] || 'None' });
    setShowAddForm(false);
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setFormData(cat);
    setShowAddForm(true);
  };

  const cancelForm = () => {
    setEditingId(null);
    setFormData({ name: '', level: 1, parent: 'None', division: divisions[0] || 'None' });
    setShowAddForm(false);
  };

  const deleteCategory = (id) => setCategories(categories.filter(c => c.id !== id));

  // Compute filtered items
  const filteredCategories = categories.filter(cat => {
    const matchesDivision = divisionFilter === 'All' || cat.division === divisionFilter;
    const matchesLevel = levelFilter === 'All' || cat.level === parseInt(levelFilter);
    return matchesDivision && matchesLevel;
  });

  return (
    <div className="h-full max-w-[1400px] mx-auto p-6 space-y-6">
      <CategoryHeader 
        showAddForm={showAddForm} 
        onToggleForm={() => showAddForm ? cancelForm() : setShowAddForm(true)} 
      />

      {showAddForm && (
        <CategoryForm 
          formData={formData}
          setFormData={setFormData}
          divisions={divisions}
          categories={categories}
          editingId={editingId}
          onSave={handleAddOrUpdate}
          onCancel={cancelForm}
        />
      )}

      <FilterBoard 
        divisions={divisions}
        divisionFilter={divisionFilter}
        setDivisionFilter={setDivisionFilter}
        levelFilter={levelFilter}
        setLevelFilter={setLevelFilter}
      />

      <CategoryTable 
        filteredCategories={filteredCategories} 
        onEdit={startEdit} 
        onDelete={deleteCategory} 
      />
    </div>
  );
}