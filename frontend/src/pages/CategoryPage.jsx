import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Loader2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";

import CategoryHeader from "../components/category/CategoryHeader";
import CategoryForm from "../components/category/CategoryForm";
import FilterBoard from "../components/category/FilterBoard";
import CategoryTable from "../components/category/CategoryTable";

// IMPORT THE CONFIRM HOOK
import { useConfirm } from "../providers/ConfirmProvider";

// Redux Actions
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory as deleteCatAction,
} from "../store/slices/categorySlice";
import { fetchDivisions } from "../store/slices/divisionSlice";
import { fetchCustomers } from "../store/slices/customerSlice"; 

export default function CategoryPage() {
  const dispatch = useDispatch();
  
  // INITIALIZE THE HOOK
  const confirm = useConfirm();

  // SAFELY Access Redux State with Fallbacks
  const { items: apiCategories = [], status: catStatus = "idle" } = useSelector((state) => state.categories || {});
  const { items: apiDivisions = [], status: divStatus = "idle" } = useSelector((state) => state.divisions || {});
  const { items: apiCustomers = [], status: custStatus = "idle" } = useSelector((state) => state.customers || {});

  // UI Control States
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    parent: "None",
    division: "",
    customer: "", 
  });

  // Filter States
  const [customerFilter, setCustomerFilter] = useState("All"); 
  const [divisionFilter, setDivisionFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");

  // --- Load Data on Mount ---
  useEffect(() => {
    if (catStatus === "idle") dispatch(fetchCategories());
    if (divStatus === "idle") dispatch(fetchDivisions());
    if (custStatus === "idle") dispatch(fetchCustomers());
  }, [catStatus, divStatus, custStatus, dispatch]);

  // --- Cascading Form Defaults ---
  useEffect(() => {
    if (apiCustomers.length > 0 && !formData.customer) {
      setFormData((prev) => ({ ...prev, customer: apiCustomers[0]._id }));
    }
  }, [apiCustomers, formData.customer]);

  const formAvailableDivisions = useMemo(() => {
    if (!formData.customer) return [];
    return apiDivisions.filter(d => (d.customer?._id || d.customer) === formData.customer);
  }, [apiDivisions, formData.customer]);

  useEffect(() => {
    if (formAvailableDivisions.length > 0 && !formAvailableDivisions.some(d => d._id === formData.division)) {
      setFormData((prev) => ({ ...prev, division: formAvailableDivisions[0]._id, parent: "None" }));
    } else if (formAvailableDivisions.length === 0) {
      setFormData((prev) => ({ ...prev, division: "", parent: "None" }));
    }
  }, [formAvailableDivisions, formData.division]);

  // Restrict Parent Category selection to the currently selected Division
  const formAvailableCategories = useMemo(() => {
    if (!formData.division) return [];
    return apiCategories.filter(c => (c.division?._id || c.division) === formData.division);
  }, [apiCategories, formData.division]);

  // --- Cascading Filter Resets ---
  useEffect(() => {
    setDivisionFilter("All");
  }, [customerFilter]);

  useEffect(() => {
    setLevelFilter("All");
  }, [divisionFilter]);


  // --- Data Mapping ---
  const mappedCategories = useMemo(() => {
    return apiCategories.map((c) => {
      // Safely resolve the division object to find its parent customer
      const divId = c.division?._id || c.division;
      const divObj = apiDivisions.find(d => d._id === divId);
      const custId = divObj ? (divObj.customer?._id || divObj.customer) : null;

      return {
        id: c._id,
        name: c.categoryName,
        level: c.hierarchyDepth || 1,
        parent: c.parentCategory ? c.parentCategory.categoryName : "None",
        parentId: c.parentCategory ? c.parentCategory._id : "None",
        division: divObj ? divObj.divisionName : "Unassigned",
        divisionId: divId,
        customerId: custId // Used for filtering
      };
    });
  }, [apiCategories, apiDivisions]);

  // --- Filter Logic ---
  const filteredCategories = useMemo(() => {
    return mappedCategories.filter((cat) => {
      const matchesCustomer = customerFilter === "All" || cat.customerId === customerFilter;
      const matchesDivision = divisionFilter === "All" || cat.division === divisionFilter;
      const matchesLevel = levelFilter === "All" || cat.level === parseInt(levelFilter);
      return matchesCustomer && matchesDivision && matchesLevel;
    });
  }, [mappedCategories, customerFilter, divisionFilter, levelFilter]);

  // Extract pure string arrays for the FilterBoard, restricted to the selected Customer
  const filterAvailableDivisions = useMemo(() => {
    if (customerFilter === "All") return apiDivisions;
    return apiDivisions.filter(d => (d.customer?._id || d.customer) === customerFilter);
  }, [apiDivisions, customerFilter]);
  
  const divisionNames = filterAvailableDivisions.map((d) => d.divisionName);

  // --- Handlers ---
  const handleAddOrUpdate = async () => {
    if (!formData.name || !formData.division) return;
    setIsSubmitting(true);

    try {
      const selectedDivObj = formAvailableDivisions.find(
        (d) => d._id === formData.division || d.divisionName === formData.division
      );
      const selectedParentObj = formAvailableCategories.find(
        (c) => c._id === formData.parent || c.categoryName === formData.parent
      );

      const payload = {
        categoryName: formData.name,
        parentCategory: formData.parent === "None" || !selectedParentObj ? null : selectedParentObj._id,
        division: selectedDivObj ? selectedDivObj._id : formAvailableDivisions[0]?._id,
      };

      if (editingId) {
        await dispatch(updateCategory({ id: editingId, categoryData: payload })).unwrap();
        setEditingId(null);
      } else {
        payload.categoryCode = `CAT-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        await dispatch(createCategory(payload)).unwrap();
      }

      dispatch(fetchCategories());
      setFormData({
        name: "",
        parent: "None",
        customer: apiCustomers[0]?._id || "",
        division: formAvailableDivisions[0]?._id || "",
      });
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
      division: cat.divisionId,
      customer: cat.customerId || apiCustomers[0]?._id || "",
    });
    setShowAddForm(true);
  };

  const cancelForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      parent: "None",
      customer: apiCustomers[0]?._id || "",
      division: formAvailableDivisions[0]?._id || "",
    });
    setShowAddForm(false);
  };

  const deleteCategoryHandler = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Category?',
      message: 'Are you sure you want to permanently delete this category? This action cannot be undone.',
      confirmText: 'Delete Category',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        await dispatch(deleteCatAction(id)).unwrap();
      } catch (err) {
        console.error("Delete failed", err);
        alert(`Failed to delete: ${err}`);
      }
    }
  };

  // Loading Check
  if (catStatus === "loading" && apiCategories.length === 0) {
    return (
      <div className="h-full flex justify-center items-center py-20 text-slate-400">
        <Loader2 className="animate-spin text-brand-gold" size={32} />
      </div>
    );
  }

  return (
    <div className="h-full max-w-[1400px] mx-auto p-6 space-y-6 animate-fade-in relative">
      <CategoryHeader
        showAddForm={showAddForm}
        onToggleForm={() => (showAddForm ? cancelForm() : setShowAddForm(true))}
      />

      <AnimatePresence>
        {showAddForm && (
          <CategoryForm
            formData={formData}
            setFormData={setFormData}
            apiCustomers={apiCustomers} 
            divisions={formAvailableDivisions} 
            categories={formAvailableCategories} 
            editingId={editingId}
            onSave={handleAddOrUpdate}
            onCancel={cancelForm}
            isSubmitting={isSubmitting}
          />
        )}
      </AnimatePresence>

      <FilterBoard
        apiCustomers={apiCustomers} 
        customerFilter={customerFilter}
        setCustomerFilter={setCustomerFilter}
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