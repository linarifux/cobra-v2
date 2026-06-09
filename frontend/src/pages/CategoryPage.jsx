import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';
import CategoryHeader from '../components/category/CategoryHeader';
import CategoryForm from '../components/category/CategoryForm';
import FilterBoard from '../components/category/FilterBoard';
import CategoryTable from '../components/category/CategoryTable';

// Redux Actions
import { fetchCategories, createCategory, updateCategory, deleteCategory as deleteCatAction } from '../store/slices/categorySlice';
import { fetchDivisions } from '../store/slices/divisionSlice';

export default function CategoryPage() {
  const dispatch = useDispatch();

  // SAFELY Access Redux State with Fallbacks to prevent destructuring errors
  const { items: apiCategories = [], status: catStatus = 'idle' } = useSelector(state => state.categories || {});
  const { items: apiDivisions = [], status: divStatus = 'idle' } = useSelector(state => state.divisions || {});

  // UI Control States
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ 
    name: '', 
    parent: 'None', 
    division: ''    
  });

  // Filter States
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');

  // Load Data on Mount
  useEffect(() => {
    if (catStatus === 'idle') dispatch(fetchCategories());
    if (divStatus === 'idle') dispatch(fetchDivisions());
  }, [catStatus, divStatus, dispatch]);

  // Ensure form has a default division selected once data loads
  useEffect(() => {
    if (apiDivisions.length > 0 && !formData.division) {
      setFormData(prev => ({ ...prev, division: apiDivisions[0]._id }));
    }
  }, [apiDivisions, formData.division]);

  // Translate API data into the flat UI structure expected by CategoryTable
  const mappedCategories = useMemo(() => {
    return apiCategories.map(c => ({
      id: c._id,
      name: c.categoryName,
      level: c.hierarchyDepth || 1,
      parent: c.parentCategory ? c.parentCategory.categoryName : 'None',
      parentId: c.parentCategory ? c.parentCategory._id : 'None',
      division: c.division ? c.division.divisionName : 'Unassigned',
      divisionId: c.division ? c.division._id : null
    }));
  }, [apiCategories]);

  // Filter Logic
  const filteredCategories = useMemo(() => {
    return mappedCategories.filter(cat => {
      const matchesDivision = divisionFilter === 'All' || cat.division === divisionFilter;
      const matchesLevel = levelFilter === 'All' || cat.level === parseInt(levelFilter);
      return matchesDivision && matchesLevel;
    });
  }, [mappedCategories, divisionFilter, levelFilter]);

  // Extract pure string arrays for the child UI components
  const divisionNames = apiDivisions.map(d => d.divisionName);

  const handleAddOrUpdate = async () => {
    if (!formData.name || !formData.division) return;
    setIsSubmitting(true);

    try {
      const selectedDivObj = apiDivisions.find(d => d._id === formData.division || d.divisionName === formData.division);
      const selectedParentObj = apiCategories.find(c => c._id === formData.parent || c.categoryName === formData.parent);

      const payload = {
        categoryName: formData.name,
        parentCategory: formData.parent === 'None' || !selectedParentObj ? null : selectedParentObj._id,
        division: selectedDivObj ? selectedDivObj._id : apiDivisions[0]._id
      };

      if (editingId) {
        await dispatch(updateCategory({ id: editingId, categoryData: payload })).unwrap();
        setEditingId(null);
      } else {
        payload.categoryCode = `CAT-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        await dispatch(createCategory(payload)).unwrap();
      }
      
      dispatch(fetchCategories());
      setFormData({ name: '', parent: 'None', division: apiDivisions[0]?._id || '' });
      setShowAddForm(false);
    } catch (err) {
      console.error("Action failed", err);
      alert(`Operation failed: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      parent: cat.parentId, 
      division: cat.divisionId 
    });
    setShowAddForm(true);
  };

  const cancelForm = () => {
    setEditingId(null);
    setFormData({ name: '', parent: 'None', division: apiDivisions[0]?._id || '' });
    setShowAddForm(false);
  };

  const deleteCategoryHandler = async (id) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        await dispatch(deleteCatAction(id)).unwrap();
      } catch (err) {
        console.error("Delete failed", err);
        alert(`Failed to delete: ${err}`);
      }
    }
  };

  // Loading Check
  if (catStatus === 'loading' && apiCategories.length === 0) {
    return (
      <div className="h-full flex justify-center items-center py-20 text-slate-400">
        <Loader2 className="animate-spin text-brand-gold" size={32} />
      </div>
    );
  }

  return (
    <div className="h-full max-w-[1400px] mx-auto p-6 space-y-6 animate-fade-in">
      <CategoryHeader 
        showAddForm={showAddForm} 
        onToggleForm={() => showAddForm ? cancelForm() : setShowAddForm(true)} 
      />

      {showAddForm && (
        <CategoryForm 
          formData={formData}
          setFormData={setFormData}
          divisions={apiDivisions} 
          categories={apiCategories} 
          editingId={editingId}
          onSave={handleAddOrUpdate}
          onCancel={cancelForm}
          isSubmitting={isSubmitting}
        />
      )}

      <FilterBoard 
        divisions={divisionNames} 
        divisionFilter={divisionFilter}
        setDivisionFilter={setDivisionFilter}
        levelFilter={levelFilter}
        setLevelFilter={setLevelFilter}
      />

      <CategoryTable 
        filteredCategories={filteredCategories} 
        onEdit={startEdit} 
        onDelete={deleteCategoryHandler} 
      />
    </div>
  );
}