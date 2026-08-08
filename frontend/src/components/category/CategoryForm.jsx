import React, { useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, FolderTree, Building2, Briefcase, Type } from 'lucide-react';

export default function CategoryForm({
  formData,
  setFormData,
  apiCustomers = [],
  divisions = [],
  categories = [],
  editingId,
  onSave,
  onCancel,
  isSubmitting
}) {

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // --- Dynamic Category Tree Builder ---
  // Recursively maps the hierarchy to display "Cat 1 > Cat 2 > Cat 3"
  const parentOptions = useMemo(() => {
    const catMap = {};
    categories.forEach(c => { catMap[c._id] = c; });

    const buildPath = (cat) => {
      let path = cat.categoryName;
      let current = cat;
      let depth = 0; // Circuit breaker to prevent infinite loops
      
      while (current.parentCategory && depth < 10) {
        const pId = typeof current.parentCategory === 'object' 
          ? current.parentCategory._id 
          : current.parentCategory;
          
        const parent = catMap[pId];
        
        if (parent) {
          path = `${parent.categoryName} > ${path}`;
          current = parent;
        } else {
          break;
        }
        depth++;
      }
      return path;
    };

    // Prevent a category from setting itself (or its children) as a parent
    const eligibleParents = editingId 
      ? categories.filter(c => c._id !== editingId) 
      : categories;

    return eligibleParents.map(c => ({
      ...c,
      fullPath: buildPath(c)
    })).sort((a, b) => a.fullPath.localeCompare(b.fullPath));

  }, [categories, editingId]);

  // Ensure SSR compatibility
  if (typeof document === 'undefined') return null;

  // Use React Portal to render the modal at the document root, 
  // preventing parent layout constraints from breaking fixed positioning.
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 h-[100dvh] w-screen">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!isSubmitting ? onCancel : undefined}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 max-h-[90dvh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-brand-gold/10 text-brand-gold rounded-xl flex items-center justify-center shadow-inner border border-brand-gold/20">
              <FolderTree size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {editingId ? "Edit Category Node" : "Create Category Node"}
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Taxonomy Configuration
              </p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-8 w-8 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full flex items-center justify-center transition-colors shadow-sm disabled:opacity-50 shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
              <Briefcase size={12} /> Target Brand (Customer) <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.customer}
              onChange={(e) => setFormData({ ...formData, customer: e.target.value, division: '', parent: 'None' })}
              disabled={isSubmitting}
              className="w-full bg-slate-50 border border-slate-200 focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all cursor-pointer disabled:opacity-50"
            >
              <option value="" disabled>Select Customer...</option>
              {apiCustomers.map((cust) => (
                <option key={cust._id} value={cust._id}>
                  {cust.customerName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
              <Building2 size={12} /> Assigned Division <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.division}
              onChange={(e) => setFormData({ ...formData, division: e.target.value, parent: 'None' })}
              disabled={isSubmitting || !formData.customer || divisions.length === 0}
              className="w-full bg-slate-50 border border-slate-200 focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all cursor-pointer disabled:opacity-50"
            >
              {divisions.length === 0 ? (
                <option value="">No divisions available</option>
              ) : (
                <>
                  <option value="" disabled>Select Division...</option>
                  {divisions.map((div) => (
                    <option key={div._id} value={div._id}>
                      {div.divisionName}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
              <Type size={12} /> Category Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Laptops"
              disabled={isSubmitting}
              className="w-full bg-slate-50 border border-slate-200 focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all placeholder:font-medium placeholder:text-slate-400 disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
              <FolderTree size={12} /> Parent Node
            </label>
            <select
              value={formData.parent}
              onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
              disabled={isSubmitting || !formData.division}
              className="w-full bg-slate-50 border border-slate-200 focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all cursor-pointer disabled:opacity-50"
            >
              <option value="None" className="font-black text-brand-gold">-- TOP LEVEL CATEGORY (NONE) --</option>
              {parentOptions.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.fullPath}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 bg-white flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSubmitting || !formData.name || !formData.division || !formData.customer}
            className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:bg-slate-800 hover:shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {editingId ? "Save Changes" : "Create Node"}
          </button>
        </div>

      </motion.div>
    </div>,
    document.body
  );
}